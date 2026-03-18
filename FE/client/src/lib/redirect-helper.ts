import { api } from "./api";
import type { User } from "./api";
import { MODULES } from "@/types/modules";
import { permissionMatchesModule } from "./permission-mapper";

/**
 * Encontra o primeiro módulo que o usuário tem permissão para acessar
 */
export async function findFirstAccessibleModule(user: User): Promise<string | null> {
  // Se for cliente, redireciona direto para o dashboard do cliente
  if (user.type === "customer" || user.role === "customer") {
    return "/cliente/dashboard";
  }

  // Se for dono ou admin, redireciona para dashboard
  if (user.role === "dono" || user.role === "super_admin" || user.role === "admin") {
    return "/dashboard";
  }

  // Para outros funcionários, verificar permissões via perfil
  try {
    // Buscar dados do colaborador
    let employeeData;
    try {
      const response = await api.getEmployee(user.id);
      employeeData = response.employee;
    } catch {
      // Se não encontrar pelo ID, tentar buscar na lista
      const employees = await api.listEmployees();
      employeeData = employees.employees?.find((e: any) => e.email === user.email || e.id === user.id);
    }

    if (!employeeData) {
      return null; // Não encontrou o colaborador
    }

    // Mapear role para nome do perfil
    const roleMap: Record<string, string> = {
      "admin": "Administrador",
      "department_manager": "Gerente",
      "attendant": "Atendente",
      "technician": "Técnico",
    };

    const profileName = roleMap[employeeData.role];
    if (!profileName) {
      return null; // Role não mapeado
    }

    // Buscar perfil
    const profileResponse = await api.getProfileByName(profileName);
    const profile = profileResponse.profile;

    if (!profile || !profile.permissions || profile.permissions.length === 0) {
      return null; // Sem permissões
    }

    // Verificar se tem permissão "*" (acesso total)
    if (profile.permissions.includes("*")) {
      return "/dashboard";
    }

    // Ordem de prioridade dos módulos
    const modulePriority = [
      "/dashboard",
      "/service-orders",
      "/pre-orders",
      "/customers",
      "/stock",
      "/financial",
      "/reports",
      "/departments",
      "/employees",
      "/profiles",
      "/settings",
    ];

    // Encontrar o primeiro módulo que o usuário tem permissão
    for (const modulePath of modulePriority) {
      const module = MODULES.find((m) => m.path === modulePath);
      if (!module) continue;

      // Verificar se o usuário tem permissão para este módulo
      const hasPermission = profile.permissions.some((perm) => {
        // Usar a função permissionMatchesModule que já faz toda a verificação
        return permissionMatchesModule(perm, modulePath);
      });

      if (hasPermission) {
        return modulePath;
      }
    }

    return null; // Nenhum módulo acessível
  } catch (error) {
    console.error("Erro ao verificar permissões:", error);
    return null;
  }
}
