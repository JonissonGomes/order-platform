import DashboardLayout from "@/components/DashboardLayout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useAuth } from "@/_core/hooks/useAuth";
import { api } from "@/lib/api";
import { FileText, Building2, Users, Wrench, Loader2 } from "lucide-react";
import { useEffect, useState } from "react";

export default function Dashboard() {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({
    totalOrders: 0,
    totalCustomers: 0,
    totalDepartments: 0,
    pendingOrders: 0,
  });

  useEffect(() => {
    loadStats();
  }, []);

  const loadStats = async () => {
    try {
      setLoading(true);
      const [ordersRes, customersRes, departmentsRes] = await Promise.all([
        api.serviceOrders.listServiceOrders({ page: 1, limit: 1 }),
        api.customers.listCustomers({ page: 1, limit: 1 }),
        api.departments.listDepartments(),
      ]);

      // Buscar ordens pendentes
      const pendingOrdersRes = await api.serviceOrders.listServiceOrders({ 
        page: 1, 
        limit: 1,
        status: "pending" 
      });

      setStats({
        totalOrders: ordersRes.pagination?.total || 0,
        totalCustomers: customersRes.pagination?.total || 0,
        totalDepartments: departmentsRes.departments?.length || 0,
        pendingOrders: pendingOrdersRes.pagination?.total || 0,
      });
    } catch (error) {
      console.error("Erro ao carregar estatísticas:", error);
    } finally {
      setLoading(false);
    }
  };

  const statsCards = [
    {
      title: "Total de Ordens",
      value: loading ? "..." : stats.totalOrders.toLocaleString("pt-BR"),
      description: `${stats.pendingOrders} ordens pendentes`,
      icon: FileText,
      color: "text-blue-600",
    },
    {
      title: "Clientes Cadastrados",
      value: loading ? "..." : stats.totalCustomers.toLocaleString("pt-BR"),
      description: "Total de clientes no sistema",
      icon: Users,
      color: "text-purple-600",
    },
    {
      title: "Departamentos",
      value: loading ? "..." : stats.totalDepartments.toLocaleString("pt-BR"),
      description: "Departamentos ativos",
      icon: Building2,
      color: "text-green-600",
    },
    {
      title: "Ordens Pendentes",
      value: loading ? "..." : stats.pendingOrders.toLocaleString("pt-BR"),
      description: "Aguardando atendimento",
      icon: Wrench,
      color: "text-orange-600",
    },
  ];

  return (
    <DashboardLayout>
      <div className="space-y-6 w-full min-w-0">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Dashboard</h1>
          <p className="text-muted-foreground">
            Bem-vindo, {user?.name || user?.email}! Aqui está um resumo das suas operações.
          </p>
        </div>

        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          {statsCards.map((stat, index) => (
            <Card key={index} className="border-0 shadow-md hover:shadow-lg transition-shadow">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">{stat.title}</CardTitle>
                {loading ? (
                  <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
                ) : (
                  <stat.icon className={`h-4 w-4 ${stat.color}`} />
                )}
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

      </div>
    </DashboardLayout>
  );
}
