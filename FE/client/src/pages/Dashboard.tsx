import DashboardLayout from "@/components/DashboardLayout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useAuth } from "@/_core/hooks/useAuth";
import { api } from "@/lib/api";
import { FileText, Building2, Users, Wrench, Loader2, TrendingUp, DollarSign, Package, AlertCircle, CheckCircle2, Clock, BarChart3 } from "lucide-react";
import { useEffect, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { formatCurrency } from "@/lib/formatters";
import { Link } from "wouter";
import { Button } from "@/components/ui/button";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
} from "recharts";

const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884d8'];

export default function Dashboard() {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({
    totalOrders: 0,
    totalCustomers: 0,
    totalDepartments: 0,
    pendingOrders: 0,
    inRepairOrders: 0,
    readyOrders: 0,
    totalRevenue: 0,
    totalStockItems: 0,
    lowStockItems: 0,
  });

  // Fetch dashboard report
  const { data: dashboardReport, isLoading: isLoadingReport } = useQuery({
    queryKey: ["reports", "dashboard"],
    queryFn: () => {
      const endDate = new Date();
      const startDate = new Date();
      startDate.setMonth(startDate.getMonth() - 1);
      return api.getDashboardReport({
        startDate: startDate.toISOString().split("T")[0],
        endDate: endDate.toISOString().split("T")[0],
      });
    },
  });

  useEffect(() => {
    loadStats();
  }, []);

  const loadStats = async () => {
    try {
      setLoading(true);
      const [ordersRes, customersRes, departmentsRes, stockRes, financialRes] = await Promise.all([
        api.listServiceOrders({ page: 1, limit: 1 }).catch(() => ({ orders: [], pagination: { total: 0 } })),
        api.listCustomers({ page: 1, limit: 1 }).catch(() => ({ customers: [], pagination: { total: 0 } })),
        api.listDepartments().catch(() => ({ departments: [] })),
        api.listStockItems({ page: 1, limit: 1000 }).catch(() => ({ items: [], pagination: { total: 0 } })),
        api.listTransactions({ page: 1, limit: 100 }).catch(() => ({ transactions: [], pagination: { total: 0 } })),
      ]);

      // Buscar ordens por status
      const [pendingRes, inRepairRes, readyRes] = await Promise.all([
        api.listServiceOrders({ page: 1, limit: 1, status: "pending" }).catch(() => ({ orders: [], pagination: { total: 0 } })),
        api.listServiceOrders({ page: 1, limit: 1, status: "in_repair" }).catch(() => ({ orders: [], pagination: { total: 0 } })),
        api.listServiceOrders({ page: 1, limit: 1, status: "ready" }).catch(() => ({ orders: [], pagination: { total: 0 } })),
      ]);

      // Calcular receita total (apenas receitas)
      const transactions = financialRes.transactions || [];
      const revenue = transactions
        .filter((t: any) => t.type === "income")
        .reduce((sum: number, t: any) => sum + (t.amount || 0), 0);

      // Calcular itens com estoque baixo
      const stockItems = stockRes.items || [];
      const lowStock = stockItems.filter((item: any) => item.minQuantity > 0 && item.quantity <= item.minQuantity).length;
      const totalStockItems = stockRes.pagination?.total || stockItems.length;

      setStats({
        totalOrders: ordersRes.pagination?.total || 0,
        totalCustomers: customersRes.pagination?.total || 0,
        totalDepartments: departmentsRes.departments?.length || 0,
        pendingOrders: pendingRes.pagination?.total || 0,
        inRepairOrders: inRepairRes.pagination?.total || 0,
        readyOrders: readyRes.pagination?.total || 0,
        totalRevenue: revenue,
        totalStockItems: totalStockItems,
        lowStockItems: lowStock,
      });
    } catch (error) {
      setStats({
        totalOrders: 0,
        totalCustomers: 0,
        totalDepartments: 0,
        pendingOrders: 0,
        inRepairOrders: 0,
        readyOrders: 0,
        totalRevenue: 0,
        totalStockItems: 0,
        lowStockItems: 0,
      });
    } finally {
      setLoading(false);
    }
  };

  // Fetch recent orders
  const { data: recentOrders } = useQuery({
    queryKey: ["recent-orders"],
    queryFn: () => api.listServiceOrders({ page: 1, limit: 5 }),
  });

  // Prepare chart data
  const statusChartData = [
    { name: "Pendentes", value: stats.pendingOrders, color: "#FF8042" },
    { name: "Em Conserto", value: stats.inRepairOrders, color: "#FFBB28" },
    { name: "Prontas", value: stats.readyOrders, color: "#00C49F" },
  ].filter(item => item.value > 0);

  const statsCards = [
    {
      title: "Total de Ordens",
      value: loading ? "..." : stats.totalOrders.toLocaleString("pt-BR"),
      description: `${stats.pendingOrders} pendentes`,
      icon: FileText,
      color: "text-blue-600",
      bgColor: "bg-blue-50",
      link: "/service-orders",
    },
    {
      title: "Receita Total",
      value: loading ? "..." : formatCurrency(stats.totalRevenue),
      description: "Últimos 30 dias",
      icon: DollarSign,
      color: "text-green-600",
      bgColor: "bg-green-50",
      link: "/financial",
    },
    {
      title: "Clientes",
      value: loading ? "..." : stats.totalCustomers.toLocaleString("pt-BR"),
      description: "Total cadastrado",
      icon: Users,
      color: "text-purple-600",
      bgColor: "bg-purple-50",
      link: "/customers",
    },
    {
      title: "Estoque",
      value: loading ? "..." : stats.totalStockItems.toLocaleString("pt-BR"),
      description: stats.lowStockItems > 0 ? `${stats.lowStockItems} com estoque baixo` : "Todos em estoque",
      icon: Package,
      color: stats.lowStockItems > 0 ? "text-orange-600" : "text-indigo-600",
      bgColor: stats.lowStockItems > 0 ? "bg-orange-50" : "bg-indigo-50",
      link: "/stock",
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

        {/* Stats Cards */}
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          {statsCards.map((stat, index) => (
            <Link key={index} href={stat.link}>
              <Card className="border-0 shadow-md hover:shadow-lg transition-all cursor-pointer hover:scale-105">
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">{stat.title}</CardTitle>
                  {loading ? (
                    <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
                  ) : (
                    <div className={`p-2 rounded-lg ${stat.bgColor}`}>
                      <stat.icon className={`h-4 w-4 ${stat.color}`} />
                    </div>
                  )}
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{stat.value}</div>
                  <CardDescription className="text-xs mt-1">
                    {stat.description}
                  </CardDescription>
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>

        {/* Charts and Recent Orders */}
        <div className="grid gap-4 md:grid-cols-2">
          {/* Status Chart */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <BarChart3 className="h-5 w-5" />
                Status das Ordens
              </CardTitle>
              <CardDescription>Distribuição de ordens por status</CardDescription>
            </CardHeader>
            <CardContent>
              {statusChartData.length > 0 ? (
                <ResponsiveContainer width="100%" height={250}>
                  <PieChart>
                    <Pie
                      data={statusChartData}
                      cx="50%"
                      cy="50%"
                      labelLine={false}
                      label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
                      outerRadius={80}
                      fill="#8884d8"
                      dataKey="value"
                    >
                      {statusChartData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip />
                  </PieChart>
                </ResponsiveContainer>
              ) : (
                <div className="flex items-center justify-center h-[250px] text-muted-foreground">
                  Nenhum dado disponível
                </div>
              )}
            </CardContent>
          </Card>

          {/* Recent Orders */}
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <div>
                <CardTitle className="flex items-center gap-2">
                  <Clock className="h-5 w-5" />
                  Ordens Recentes
                </CardTitle>
                <CardDescription>Últimas 5 ordens de serviço</CardDescription>
              </div>
              <Link href="/service-orders">
                <Button variant="ghost" size="sm">Ver todas</Button>
              </Link>
            </CardHeader>
            <CardContent>
              {loading ? (
                <div className="flex items-center justify-center h-[250px]">
                  <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                </div>
              ) : recentOrders?.orders && recentOrders.orders.length > 0 ? (
                <div className="space-y-3">
                  {recentOrders.orders.slice(0, 5).map((order: any) => (
                    <div key={order.id} className="flex items-center justify-between p-3 rounded-lg border hover:bg-muted/50 transition-colors">
                      <div className="flex-1">
                        <div className="flex items-center gap-2">
                          <span className="font-mono text-sm font-medium">#{order.orderNumber}</span>
                          <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${
                            order.status === "pending" ? "bg-orange-100 text-orange-700" :
                            order.status === "evaluating" ? "bg-blue-100 text-blue-700" :
                            order.status === "approved" ? "bg-green-100 text-green-700" :
                            order.status === "waiting_parts" ? "bg-orange-100 text-orange-700" :
                            order.status === "in_repair" ? "bg-yellow-100 text-yellow-700" :
                            order.status === "testing" ? "bg-indigo-100 text-indigo-700" :
                            order.status === "ready" ? "bg-green-100 text-green-700" :
                            order.status === "delivered" ? "bg-blue-100 text-blue-700" :
                            order.status === "cancelled" ? "bg-red-100 text-red-700" :
                            "bg-gray-100 text-gray-700"
                          }`}>
                            {order.status === "pending" ? "Aguardando Avaliação" :
                             order.status === "evaluating" ? "Em Avaliação" :
                             order.status === "approved" ? "Aprovado" :
                             order.status === "waiting_parts" ? "Aguardando Peças" :
                             order.status === "in_repair" ? "Em Conserto" :
                             order.status === "testing" ? "Em Teste" :
                             order.status === "ready" ? "Pronto para Retirada" :
                             order.status === "delivered" ? "Entregue" :
                             order.status === "cancelled" ? "Cancelado" :
                             order.status}
                          </span>
                        </div>
                        <p className="text-sm text-muted-foreground mt-1">
                          {order.customer?.name || "Cliente não informado"}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {order.productBrand} {order.productModel}
                        </p>
                      </div>
                      {order.finalCost && (
                        <div className="text-right">
                          <p className="text-sm font-semibold">{formatCurrency(order.finalCost)}</p>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              ) : (
                <div className="flex items-center justify-center h-[250px] text-muted-foreground">
                  Nenhuma ordem encontrada
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Quick Actions */}
        <Card>
          <CardHeader>
            <CardTitle>Ações Rápidas</CardTitle>
            <CardDescription>Acesso rápido às principais funcionalidades</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              <Link href="/service-orders?action=create">
                <Button variant="outline" className="w-full justify-start">
                  <FileText className="mr-2 h-4 w-4" />
                  Nova Ordem
                </Button>
              </Link>
              <Link href="/customers?action=create">
                <Button variant="outline" className="w-full justify-start">
                  <Users className="mr-2 h-4 w-4" />
                  Novo Cliente
                </Button>
              </Link>
              <Link href="/stock?action=create">
                <Button variant="outline" className="w-full justify-start">
                  <Package className="mr-2 h-4 w-4" />
                  Novo Item
                </Button>
              </Link>
              <Link href="/financial?action=create">
                <Button variant="outline" className="w-full justify-start">
                  <DollarSign className="mr-2 h-4 w-4" />
                  Novo Lançamento
                </Button>
              </Link>
            </div>
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
}
