import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Calendar, Download, FileText, TrendingUp, Package, Users } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export default function Reports() {
  const [startDate, setStartDate] = useState(() => {
    const date = new Date();
    date.setMonth(date.getMonth() - 1);
    return date.toISOString().split("T")[0];
  });
  const [endDate, setEndDate] = useState(() => {
    return new Date().toISOString().split("T")[0];
  });

  const params = {
    startDate,
    endDate,
  };

  const { data: dashboardReport, isLoading: isLoadingDashboard } = useQuery({
    queryKey: ["reports", "dashboard", params],
    queryFn: () => api.getDashboardReport(params),
  });

  const { data: serviceOrderReport, isLoading: isLoadingServiceOrders } = useQuery({
    queryKey: ["reports", "service-orders", params],
    queryFn: () => api.getServiceOrderReport(params),
  });

  const { data: financialReport, isLoading: isLoadingFinancial } = useQuery({
    queryKey: ["reports", "financial", params],
    queryFn: () => api.getFinancialReport(params),
  });

  const { data: stockReport, isLoading: isLoadingStock } = useQuery({
    queryKey: ["reports", "stock", params],
    queryFn: () => api.getStockReport(params),
  });

  const { data: customerReport, isLoading: isLoadingCustomers } = useQuery({
    queryKey: ["reports", "customers", params],
    queryFn: () => api.getCustomerReport(params),
  });

  const handleExport = async (reportType: string, format: "pdf" | "excel") => {
    try {
      const blob = await api.exportReport(reportType, format);
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `relatorio-${reportType}-${new Date().toISOString().split("T")[0]}.${format === "pdf" ? "pdf" : "xlsx"}`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
    } catch (error) {
      console.error("Erro ao exportar relatório:", error);
    }
  };

  return (
    <div className="space-y-6 p-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Relatórios</h1>
          <p className="text-muted-foreground">
            Visualize e analise dados do sistema
          </p>
        </div>
      </div>

      {/* Filters */}
      <Card>
        <CardHeader>
          <CardTitle>Filtros</CardTitle>
          <CardDescription>Selecione o período para os relatórios</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="startDate">Data Inicial</Label>
              <Input
                id="startDate"
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="endDate">Data Final</Label>
              <Input
                id="endDate"
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Dashboard Summary */}
      {dashboardReport && (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Receita Total</CardTitle>
              <TrendingUp className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                R$ {dashboardReport.report.summary.totalRevenue.toFixed(2).replace(".", ",")}
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total de Ordens</CardTitle>
              <FileText className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{dashboardReport.report.summary.totalOrders}</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Ordens Pendentes</CardTitle>
              <Calendar className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{dashboardReport.report.summary.pendingOrders}</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Estoque Baixo</CardTitle>
              <Package className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{dashboardReport.report.summary.lowStockAlerts}</div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Reports Tabs */}
      <Tabs defaultValue="service-orders" className="space-y-4">
        <TabsList>
          <TabsTrigger value="service-orders">Ordens de Serviço</TabsTrigger>
          <TabsTrigger value="financial">Financeiro</TabsTrigger>
          <TabsTrigger value="stock">Estoque</TabsTrigger>
          <TabsTrigger value="customers">Clientes</TabsTrigger>
        </TabsList>

        <TabsContent value="service-orders" className="space-y-4">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>Relatório de Ordens de Serviço</CardTitle>
                  <CardDescription>Análise de ordens de serviço no período</CardDescription>
                </div>
                <div className="flex gap-2">
                  <Button variant="outline" size="sm" onClick={() => handleExport("service-orders", "pdf")}>
                    <Download className="h-4 w-4 mr-2" />
                    PDF
                  </Button>
                  <Button variant="outline" size="sm" onClick={() => handleExport("service-orders", "excel")}>
                    <Download className="h-4 w-4 mr-2" />
                    Excel
                  </Button>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              {isLoadingServiceOrders ? (
                <div className="text-center py-8">Carregando...</div>
              ) : serviceOrderReport ? (
                <div className="space-y-4">
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    <div>
                      <div className="text-sm text-muted-foreground">Total de Ordens</div>
                      <div className="text-2xl font-bold">{serviceOrderReport.report.totalOrders}</div>
                    </div>
                    <div>
                      <div className="text-sm text-muted-foreground">Taxa de Conversão</div>
                      <div className="text-2xl font-bold">{serviceOrderReport.report.conversionRate.toFixed(1)}%</div>
                    </div>
                    <div>
                      <div className="text-sm text-muted-foreground">Tempo Médio de Reparo</div>
                      <div className="text-2xl font-bold">{serviceOrderReport.report.averageRepairTime.toFixed(1)} dias</div>
                    </div>
                    <div>
                      <div className="text-sm text-muted-foreground">Receita Total</div>
                      <div className="text-2xl font-bold">
                        R$ {serviceOrderReport.report.totalRevenue.toFixed(2).replace(".", ",")}
                      </div>
                    </div>
                  </div>
                  <div className="mt-6">
                    <h3 className="text-lg font-semibold mb-4">Ordens por Status</h3>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                      {Object.entries(serviceOrderReport.report.ordersByStatus || {}).map(([status, count]) => (
                        <div key={status} className="p-4 border rounded-lg">
                          <div className="text-sm text-muted-foreground">{status}</div>
                          <div className="text-xl font-bold">{count as number}</div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              ) : (
                <div className="text-center py-8 text-muted-foreground">Nenhum dado disponível</div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="financial" className="space-y-4">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>Relatório Financeiro</CardTitle>
                  <CardDescription>Análise financeira do período</CardDescription>
                </div>
                <div className="flex gap-2">
                  <Button variant="outline" size="sm" onClick={() => handleExport("financial", "pdf")}>
                    <Download className="h-4 w-4 mr-2" />
                    PDF
                  </Button>
                  <Button variant="outline" size="sm" onClick={() => handleExport("financial", "excel")}>
                    <Download className="h-4 w-4 mr-2" />
                    Excel
                  </Button>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              {isLoadingFinancial ? (
                <div className="text-center py-8">Carregando...</div>
              ) : financialReport ? (
                <div className="space-y-4">
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    <div>
                      <div className="text-sm text-muted-foreground">Total Receitas</div>
                      <div className="text-2xl font-bold text-green-600">
                        R$ {financialReport.report.totalIncome.toFixed(2).replace(".", ",")}
                      </div>
                    </div>
                    <div>
                      <div className="text-sm text-muted-foreground">Total Despesas</div>
                      <div className="text-2xl font-bold text-red-600">
                        R$ {financialReport.report.totalExpenses.toFixed(2).replace(".", ",")}
                      </div>
                    </div>
                    <div>
                      <div className="text-sm text-muted-foreground">Saldo</div>
                      <div className={`text-2xl font-bold ${financialReport.report.balance >= 0 ? "text-green-600" : "text-red-600"}`}>
                        R$ {financialReport.report.balance.toFixed(2).replace(".", ",")}
                      </div>
                    </div>
                    <div>
                      <div className="text-sm text-muted-foreground">Pendentes</div>
                      <div className="text-2xl font-bold">
                        R$ {(financialReport.report.pendingIncome - financialReport.report.pendingExpenses).toFixed(2).replace(".", ",")}
                      </div>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="text-center py-8 text-muted-foreground">Nenhum dado disponível</div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="stock" className="space-y-4">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>Relatório de Estoque</CardTitle>
                  <CardDescription>Análise de estoque</CardDescription>
                </div>
                <div className="flex gap-2">
                  <Button variant="outline" size="sm" onClick={() => handleExport("stock", "pdf")}>
                    <Download className="h-4 w-4 mr-2" />
                    PDF
                  </Button>
                  <Button variant="outline" size="sm" onClick={() => handleExport("stock", "excel")}>
                    <Download className="h-4 w-4 mr-2" />
                    Excel
                  </Button>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              {isLoadingStock ? (
                <div className="text-center py-8">Carregando...</div>
              ) : stockReport ? (
                <div className="space-y-4">
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    <div>
                      <div className="text-sm text-muted-foreground">Total de Itens</div>
                      <div className="text-2xl font-bold">{stockReport.report.totalItems}</div>
                    </div>
                    <div>
                      <div className="text-sm text-muted-foreground">Itens Ativos</div>
                      <div className="text-2xl font-bold">{stockReport.report.activeItems}</div>
                    </div>
                    <div>
                      <div className="text-sm text-muted-foreground">Estoque Baixo</div>
                      <div className="text-2xl font-bold text-yellow-600">{stockReport.report.lowStockItems}</div>
                    </div>
                    <div>
                      <div className="text-sm text-muted-foreground">Sem Estoque</div>
                      <div className="text-2xl font-bold text-red-600">{stockReport.report.outOfStockItems}</div>
                    </div>
                  </div>
                  <div>
                    <div className="text-sm text-muted-foreground">Valor Total do Estoque</div>
                    <div className="text-2xl font-bold">
                      R$ {stockReport.report.totalStockValue.toFixed(2).replace(".", ",")}
                    </div>
                  </div>
                </div>
              ) : (
                <div className="text-center py-8 text-muted-foreground">Nenhum dado disponível</div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="customers" className="space-y-4">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>Relatório de Clientes</CardTitle>
                  <CardDescription>Análise de clientes</CardDescription>
                </div>
                <div className="flex gap-2">
                  <Button variant="outline" size="sm" onClick={() => handleExport("customers", "pdf")}>
                    <Download className="h-4 w-4 mr-2" />
                    PDF
                  </Button>
                  <Button variant="outline" size="sm" onClick={() => handleExport("customers", "excel")}>
                    <Download className="h-4 w-4 mr-2" />
                    Excel
                  </Button>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              {isLoadingCustomers ? (
                <div className="text-center py-8">Carregando...</div>
              ) : customerReport ? (
                <div className="space-y-4">
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    <div>
                      <div className="text-sm text-muted-foreground">Total de Clientes</div>
                      <div className="text-2xl font-bold">{customerReport.report.totalCustomers}</div>
                    </div>
                    <div>
                      <div className="text-sm text-muted-foreground">Clientes Ativos</div>
                      <div className="text-2xl font-bold">{customerReport.report.activeCustomers}</div>
                    </div>
                    <div>
                      <div className="text-sm text-muted-foreground">Clientes Inativos</div>
                      <div className="text-2xl font-bold">{customerReport.report.inactiveCustomers}</div>
                    </div>
                    <div>
                      <div className="text-sm text-muted-foreground">Ticket Médio</div>
                      <div className="text-2xl font-bold">
                        R$ {customerReport.report.averageTicket.toFixed(2).replace(".", ",")}
                      </div>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="text-center py-8 text-muted-foreground">Nenhum dado disponível</div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
