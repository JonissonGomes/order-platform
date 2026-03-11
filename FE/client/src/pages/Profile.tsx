import DashboardLayout from "@/components/DashboardLayout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { useAuth } from "@/_core/hooks/useAuth";
import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { User, Mail, Shield, Calendar, Building2 } from "lucide-react";

export default function Profile() {
  const { user } = useAuth();

  // Buscar dados do colaborador para obter o departamento
  // Se o user.type for "employee", buscar pelo id ou email
  const { data: employeeData } = useQuery({
    queryKey: ["employee", user?.id, user?.email],
    queryFn: async () => {
      if (!user?.id) return null;
      // Se o user já é um employee (type === "employee"), buscar pelo id
      if (user?.type === "employee") {
        try {
          return await api.getEmployee(user.id);
        } catch {
          // Se não encontrar pelo id, tentar buscar na lista pelo email
          const employees = await api.listEmployees();
          return employees.employees?.find((e: any) => e.email === user.email || e.id === user.id);
        }
      }
      // Se não for employee, tentar buscar na lista pelo email (retrocompatibilidade)
      const employees = await api.listEmployees();
      return employees.employees?.find((e: any) => e.email === user.email || e.id === user.id);
    },
    enabled: !!user?.id && user?.type !== "customer",
  });

  // Buscar dados do departamento se o colaborador tiver
  const { data: departmentData } = useQuery({
    queryKey: ["department", employeeData?.departmentId],
    queryFn: async () => {
      if (!employeeData?.departmentId) return null;
      return api.getDepartment(employeeData.departmentId);
    },
    enabled: !!employeeData?.departmentId,
  });

  // Get the actual role from employee if available, otherwise use user role
  const actualRole = employeeData?.role || user?.role;

  const getRoleLabel = (role?: string) => {
    switch (role) {
      case "dono":        // novo valor
      case "super_admin": // retrocompatibilidade
        return "Dono";
      case "admin":
        return "Administrador";
      case "department_manager":
        return "Gerente";
      case "attendant":
        return "Atendente";
      case "technician":
        return "Técnico";
      case "user":
        return "Cliente";
      default:
        return role || "Usuário";
    }
  };

  // Get profile name for display
  const getProfileName = (): string | null => {
    if (actualRole === "dono" || actualRole === "super_admin") {
      return "Dono";
    }
    if (actualRole === "admin") {
      return "Administrador";
    }
    if (actualRole === "department_manager") {
      return "Gerente";
    }
    if (actualRole === "attendant") {
      return "Atendente";
    }
    if (actualRole === "technician") {
      return "Técnico";
    }
    if (actualRole === "user") {
      return "Cliente";
    }
    return null;
  };

  const profileName = getProfileName();

  return (
    <DashboardLayout>
      <div className="space-y-6 w-full min-w-0">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Meu Perfil</h1>
          <p className="text-muted-foreground">
            Visualize e gerencie suas informações de perfil
          </p>
        </div>

        <Card className="border-0 shadow-md">
          <CardHeader>
            <div className="flex items-center gap-4">
              <Avatar className="h-20 w-20 border-2">
                <AvatarFallback className="text-2xl font-medium">
                  {user?.name?.charAt(0).toUpperCase() || "U"}
                </AvatarFallback>
              </Avatar>
              <div>
                <CardTitle className="text-xl">{user?.name || "Usuário"}</CardTitle>
                <CardDescription className="text-base mt-1">
                  {profileName || getRoleLabel(actualRole)}
                </CardDescription>
                {departmentData?.department && (
                  <div className="flex items-center gap-1 mt-1 text-sm text-muted-foreground">
                    <Building2 className="h-4 w-4" />
                    <span>{departmentData.department.name}</span>
                  </div>
                )}
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="flex items-start gap-3">
                <div className="h-10 w-10 rounded-lg bg-blue-100 flex items-center justify-center shrink-0">
                  <User className="h-5 w-5 text-blue-600" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-muted-foreground">Nome Completo</p>
                  <p className="text-sm mt-1 break-words">{user?.name || "Não informado"}</p>
                </div>
              </div>

              <div className="flex items-start gap-3">
                <div className="h-10 w-10 rounded-lg bg-purple-100 flex items-center justify-center shrink-0">
                  <Mail className="h-5 w-5 text-purple-600" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-muted-foreground">Email</p>
                  <p className="text-sm mt-1 break-words">{user?.email || "Não informado"}</p>
                </div>
              </div>

              <div className="flex items-start gap-3">
                <div className="h-10 w-10 rounded-lg bg-green-100 flex items-center justify-center shrink-0">
                  <Shield className="h-5 w-5 text-green-600" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-muted-foreground">Perfil de Acesso</p>
                  <p className="text-sm mt-1">{profileName || getRoleLabel(actualRole)}</p>
                </div>
              </div>

              {user?.createdAt && (
                <div className="flex items-start gap-3">
                  <div className="h-10 w-10 rounded-lg bg-orange-100 flex items-center justify-center shrink-0">
                    <Calendar className="h-5 w-5 text-orange-600" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-muted-foreground">Membro desde</p>
                    <p className="text-sm mt-1">
                      {new Date(user.createdAt).toLocaleDateString("pt-BR", {
                        year: "numeric",
                        month: "long",
                        day: "numeric",
                      })}
                    </p>
                    {user?.updatedAt && (
                      <p className="text-xs text-muted-foreground mt-2">
                        Última atualização: {new Date(user.updatedAt).toLocaleDateString("pt-BR", {
                          year: "numeric",
                          month: "long",
                          day: "numeric",
                          hour: "2-digit",
                          minute: "2-digit",
                        })}
                      </p>
                    )}
                  </div>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
}
