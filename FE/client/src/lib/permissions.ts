import { useAuth } from "@/_core/hooks/useAuth";
import { useQuery } from "@tanstack/react-query";
import { api } from "./api";
import type { Employee } from "@/types";
import { permissionMatchesModule, moduleInEditOrDeletePermissions } from "./permission-mapper";

/**
 * Hook para verificar permissões do usuário em um módulo específico
 */
export function usePermissions(modulePath: string) {
  const { user } = useAuth();
  
  // Se o usuário é dono ou admin, tem acesso total
  const isAdmin = user?.role === "dono" || user?.role === "super_admin" || user?.role === "admin";
  
  // Busca o colaborador para obter o perfil
  const { data: employeeData } = useQuery({
    queryKey: ["employee", user?.id, user?.email],
    queryFn: async () => {
      if (!user?.id || user?.type === "customer") return null;
      // If user.type is "employee", try to get by id first
      if (user?.type === "employee") {
        try {
          const employee = await api.getEmployee(user.id);
          return employee.employee || null;
        } catch {
          // Fallback to list search
        }
      }
      // Search in list by email or id
      const employees = await api.listEmployees();
      return employees.employees?.find((e: Employee) => e.email === user.email || e.id === user.id) || null;
    },
    enabled: !isAdmin && !!user?.id && user?.type !== "customer",
  });

  // Mapeia role para nome do perfil
  const getProfileName = (): string | null => {
    if (user?.role === "dono" || user?.role === "super_admin") {
      return "Dono";
    }
    if (user?.role === "admin") {
      return "Administrador";
    }
    // Para role "user", busca o perfil do colaborador
    if (employeeData?.role) {
      const roleMap: Record<string, string> = {
        "admin": "Administrador",
        "department_manager": "Gerente",
        "attendant": "Atendente",
        "technician": "Técnico",
      };
      return roleMap[employeeData.role] || null;
    }
    return null;
  };

  const profileName = getProfileName();

  const { data: profile } = useQuery({
    queryKey: ["profile", profileName],
    queryFn: () => api.getProfileByName(profileName!),
    enabled: !isAdmin && !!profileName,
  });

  // Verifica permissões usando o mapeamento correto
  const canView = isAdmin || (profile?.profile?.permissions?.some((perm) => 
    permissionMatchesModule(perm, modulePath)
  ) ?? false);
  
  const canCreate = isAdmin || (profile?.profile?.editPermissions ? 
    moduleInEditOrDeletePermissions(modulePath, profile.profile.editPermissions) : false
  );
  
  const canEdit = isAdmin || (profile?.profile?.editPermissions ? 
    moduleInEditOrDeletePermissions(modulePath, profile.profile.editPermissions) : false
  );
  
  const canDelete = isAdmin || (profile?.profile?.deletePermissions ? 
    moduleInEditOrDeletePermissions(modulePath, profile.profile.deletePermissions) : false
  );

  return {
    canView,
    canCreate,
    canEdit,
    canDelete,
    isLoading: !isAdmin && (!profile || !employeeData),
  };
}

/**
 * Função helper para verificar permissões sem hook (para uso em componentes não-hook)
 */
export function checkPermission(
  userRole: string | undefined,
  profile: { permissions?: string[]; editPermissions?: string[]; deletePermissions?: string[] } | null,
  modulePath: string,
  action: "view" | "create" | "edit" | "delete"
): boolean {
  const isAdmin = userRole === "dono" || userRole === "super_admin" || userRole === "admin";
  
  if (isAdmin) {
    return true;
  }

  if (!profile) {
    return false;
  }

  switch (action) {
    case "view":
      return profile.permissions?.includes(modulePath) ?? false;
    case "create":
    case "edit":
      return profile.editPermissions?.includes(modulePath) ?? false;
    case "delete":
      return profile.deletePermissions?.includes(modulePath) ?? false;
    default:
      return false;
  }
}
