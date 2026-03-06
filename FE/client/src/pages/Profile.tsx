import DashboardLayout from "@/components/DashboardLayout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { useAuth } from "@/_core/hooks/useAuth";
import { User, Mail, Shield, Calendar } from "lucide-react";

export default function Profile() {
  const { user } = useAuth();

  const getRoleLabel = (role?: string) => {
    switch (role) {
      case "super_admin":
        return "Super Administrador";
      case "admin":
        return "Administrador";
      case "user":
        return "Usuário";
      default:
        return role || "Usuário";
    }
  };

  return (
    <DashboardLayout>
      <div className="space-y-6 w-full min-w-0">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Meu Perfil</h1>
          <p className="text-muted-foreground">
            Visualize e gerencie suas informações de perfil
          </p>
        </div>

        <div className="grid gap-4 md:grid-cols-2">
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
                    {getRoleLabel(user?.role)}
                  </CardDescription>
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
                    <p className="text-sm mt-1 capitalize">{getRoleLabel(user?.role)}</p>
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
                    </div>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          <Card className="border-0 shadow-md">
            <CardHeader>
              <CardTitle>Informações Adicionais</CardTitle>
              <CardDescription>Detalhes sobre sua conta</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div>
                  <p className="text-sm font-medium text-muted-foreground mb-2">ID da Conta</p>
                  <p className="text-xs font-mono bg-muted p-2 rounded break-all">
                    {user?.id || "Não disponível"}
                  </p>
                </div>
                {user?.updatedAt && (
                  <div>
                    <p className="text-sm font-medium text-muted-foreground mb-2">Última Atualização</p>
                    <p className="text-sm">
                      {new Date(user.updatedAt).toLocaleDateString("pt-BR", {
                        year: "numeric",
                        month: "long",
                        day: "numeric",
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                    </p>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </DashboardLayout>
  );
}
