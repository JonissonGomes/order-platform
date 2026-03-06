import DashboardLayout from "@/components/DashboardLayout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useAuth } from "@/_core/hooks/useAuth";
import { BarChart3, Package, ShoppingCart, Users } from "lucide-react";

export default function Dashboard() {
  const { user } = useAuth();

  const stats = [
    {
      title: "Total de Pedidos",
      value: "1,234",
      description: "+12% em relação ao mês anterior",
      icon: ShoppingCart,
      color: "text-blue-600",
    },
    {
      title: "Produtos em Estoque",
      value: "567",
      description: "45 produtos com estoque baixo",
      icon: Package,
      color: "text-green-600",
    },
    {
      title: "Clientes Ativos",
      value: "890",
      description: "+8 novos clientes hoje",
      icon: Users,
      color: "text-purple-600",
    },
    {
      title: "Receita do Mês",
      value: "R$ 45.678",
      description: "+23% em relação ao mês anterior",
      icon: BarChart3,
      color: "text-orange-600",
    },
  ];

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Dashboard</h1>
          <p className="text-muted-foreground">
            Bem-vindo, {user?.name || user?.email}! Aqui está um resumo das suas operações.
          </p>
        </div>

        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          {stats.map((stat, index) => (
            <Card key={index} className="border-0 shadow-md hover:shadow-lg transition-shadow">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">{stat.title}</CardTitle>
                <stat.icon className={`h-4 w-4 ${stat.color}`} />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{stat.value}</div>
                <CardDescription className="text-xs mt-1">
                  {stat.description}
                </CardDescription>
              </CardContent>
            </Card>
          ))}
        </div>

        <div className="grid gap-4 md:grid-cols-2">
          <Card className="border-0 shadow-md">
            <CardHeader>
              <CardTitle>Atividades Recentes</CardTitle>
              <CardDescription>Últimas ações realizadas no sistema</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {[
                  "Novo pedido #1234 criado",
                  "Produto 'Notebook Dell' atualizado",
                  "Cliente 'João Silva' cadastrado",
                  "Relatório mensal gerado",
                ].map((activity, index) => (
                  <div key={index} className="flex items-center gap-3 text-sm">
                    <div className="h-2 w-2 rounded-full bg-blue-600" />
                    <span className="text-muted-foreground">{activity}</span>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          <Card className="border-0 shadow-md">
            <CardHeader>
              <CardTitle>Informações da Conta</CardTitle>
              <CardDescription>Detalhes do seu perfil</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Nome</p>
                  <p className="text-sm">{user?.name || "Não informado"}</p>
                </div>
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Email</p>
                  <p className="text-sm">{user?.email}</p>
                </div>
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Perfil</p>
                  <p className="text-sm capitalize">{user?.role || "user"}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </DashboardLayout>
  );
}
