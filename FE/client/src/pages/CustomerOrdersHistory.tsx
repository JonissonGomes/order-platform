import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { api } from "@/lib/api";
import { useAuth } from "@/_core/hooks/useAuth";
import { StatusTimeline } from "@/components/StatusTimeline";
import type { ServiceOrder, StatusHistory } from "@/types";
import {
  ArrowLeft,
  Search,
  Package,
  Loader2,
  Calendar,
  Clock,
  Filter,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { useLocation } from "wouter";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

const statusLabels: Record<string, string> = {
  approved: "Aprovado",
  cancelled: "Cancelado",
  delivered: "Entregue",
  evaluating: "Em Avaliação",
  in_repair: "Em Conserto",
  pending: "Aguardando Avaliação",
  ready: "Pronto para Retirada",
  testing: "Em Teste",
  waiting_parts: "Aguardando Peças",
};

const statusColors: Record<string, string> = {
  pending: "bg-yellow-100 text-yellow-800 border-yellow-200",
  evaluating: "bg-blue-100 text-blue-800 border-blue-200",
  approved: "bg-green-100 text-green-800 border-green-200",
  waiting_parts: "bg-orange-100 text-orange-800 border-orange-200",
  in_repair: "bg-purple-100 text-purple-800 border-purple-200",
  testing: "bg-indigo-100 text-indigo-800 border-indigo-200",
  ready: "bg-emerald-100 text-emerald-800 border-emerald-200",
  delivered: "bg-gray-100 text-gray-800 border-gray-200",
  cancelled: "bg-red-100 text-red-800 border-red-200",
};

export default function CustomerOrdersHistory() {
  const { user, isAuthenticated } = useAuth();
  const [, setLocation] = useLocation();
  const [orders, setOrders] = useState<ServiceOrder[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedOrder, setSelectedOrder] = useState<ServiceOrder | null>(null);
  const [orderHistory, setOrderHistory] = useState<StatusHistory[]>([]);
  const [loadingHistory, setLoadingHistory] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const itemsPerPage = 10;

  useEffect(() => {
    if (!isAuthenticated || !user) {
      setLocation("/cliente/login");
      return;
    }

    if (user.type !== "customer" && user.role !== "customer") {
      setLocation("/dashboard");
      return;
    }

    loadOrders();
  }, [user, isAuthenticated, currentPage, statusFilter]);

  const loadOrders = async () => {
    if (!user?.id) return;

    try {
      setLoading(true);
      const response = await api.getCustomerServiceOrders(user.id);
      let filteredOrders = response.orders || [];

      // Aplicar filtro de status
      if (statusFilter !== "all") {
        filteredOrders = filteredOrders.filter((o) => o.status === statusFilter);
      }

      // Aplicar busca
      if (searchTerm.trim()) {
        const term = searchTerm.toLowerCase();
        filteredOrders = filteredOrders.filter(
          (o) =>
            o.orderNumber.toLowerCase().includes(term) ||
            o.productType?.toLowerCase().includes(term) ||
            o.productBrand?.toLowerCase().includes(term) ||
            o.productModel?.toLowerCase().includes(term) ||
            o.problemDescription?.toLowerCase().includes(term)
        );
      }

      // Ordenar por data de atualização (mais recentes primeiro)
      filteredOrders.sort((a, b) => {
        const dateA = new Date(
          a.statusChangedAt || a.updatedAt || a.createdAt
        ).getTime();
        const dateB = new Date(
          b.statusChangedAt || b.updatedAt || b.createdAt
        ).getTime();
        return dateB - dateA;
      });

      // Paginação
      const total = filteredOrders.length;
      setTotalPages(Math.ceil(total / itemsPerPage));
      const start = (currentPage - 1) * itemsPerPage;
      const end = start + itemsPerPage;
      setOrders(filteredOrders.slice(start, end));
    } catch (error: any) {
      const errorMessage = error.message || "";
      if (
        errorMessage &&
        !errorMessage.includes("status: 404") &&
        errorMessage.trim() !== ""
      ) {
        toast.error(errorMessage || "Erro ao carregar ordens");
      }
    } finally {
      setLoading(false);
    }
  };

  const loadOrderHistory = async (orderId: string) => {
    try {
      setLoadingHistory(true);
      const response = await api.getServiceOrderHistory(orderId);
      setOrderHistory(response.statusHistory || []);
    } catch (error: any) {
      console.error("Erro ao carregar histórico:", error);
    } finally {
      setLoadingHistory(false);
    }
  };

  const handleOrderClick = async (order: ServiceOrder) => {
    setSelectedOrder(order);
    await loadOrderHistory(order.id);
  };

  const handleSearch = () => {
    setCurrentPage(1);
    loadOrders();
  };

  const handleStatusFilterChange = (value: string) => {
    setStatusFilter(value);
    setCurrentPage(1);
  };

  if (loading && orders.length === 0) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 via-white to-blue-100">
        <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-blue-100">
      {/* Header */}
      <header className="bg-white border-b shadow-sm">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Button
                variant="ghost"
                size="icon"
                onClick={() => setLocation("/cliente/dashboard")}
              >
                <ArrowLeft className="h-4 w-4" />
              </Button>
              <div>
                <h1 className="text-2xl font-bold text-gray-900">
                  Histórico de Ordens
                </h1>
                <p className="text-sm text-muted-foreground">
                  Visualize todas as suas ordens de serviço
                </p>
              </div>
            </div>
          </div>
        </div>
      </header>

      <div className="container mx-auto px-4 py-8 max-w-7xl">
        {/* Filtros e Busca */}
        <Card className="mb-6">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Filter className="h-5 w-5 text-blue-600" />
              Filtros e Busca
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-col md:flex-row gap-4">
              <div className="flex-1 relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Buscar por número, produto, marca, modelo ou problema..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && handleSearch()}
                  className="pl-10"
                />
              </div>
              <Select value={statusFilter} onValueChange={handleStatusFilterChange}>
                <SelectTrigger className="w-full md:w-[200px]">
                  <SelectValue placeholder="Filtrar por status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos os Status</SelectItem>
                  <SelectItem value="pending">Aguardando Avaliação</SelectItem>
                  <SelectItem value="evaluating">Em Avaliação</SelectItem>
                  <SelectItem value="approved">Aprovado</SelectItem>
                  <SelectItem value="waiting_parts">Aguardando Peças</SelectItem>
                  <SelectItem value="in_repair">Em Conserto</SelectItem>
                  <SelectItem value="testing">Em Teste</SelectItem>
                  <SelectItem value="ready">Pronto para Retirada</SelectItem>
                  <SelectItem value="delivered">Entregue</SelectItem>
                  <SelectItem value="cancelled">Cancelado</SelectItem>
                </SelectContent>
              </Select>
              <Button onClick={handleSearch}>
                <Search className="h-4 w-4 mr-2" />
                Buscar
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Lista de Ordens */}
        <Card>
          <CardHeader>
            <CardTitle>Suas Ordens</CardTitle>
            <CardDescription>
              {orders.length} ordem(ns) encontrada(s)
            </CardDescription>
          </CardHeader>
          <CardContent>
            {orders.length === 0 ? (
              <div className="text-center py-12 text-muted-foreground">
                <Package className="h-12 w-12 mx-auto mb-4 opacity-30" />
                <p>Nenhuma ordem encontrada</p>
                {(searchTerm || statusFilter !== "all") && (
                  <Button
                    variant="outline"
                    className="mt-4"
                    onClick={() => {
                      setSearchTerm("");
                      setStatusFilter("all");
                      setCurrentPage(1);
                    }}
                  >
                    Limpar Filtros
                  </Button>
                )}
              </div>
            ) : (
              <>
                <div className="space-y-4">
                  {orders.map((order) => (
                    <div
                      key={order.id}
                      className="p-4 border rounded-lg hover:bg-muted/50 cursor-pointer transition-colors"
                      onClick={() => handleOrderClick(order)}
                    >
                      <div className="flex items-start justify-between gap-4">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-2">
                            <h3 className="font-semibold">OS #{order.orderNumber}</h3>
                            <Badge className={statusColors[order.status] || ""}>
                              {statusLabels[order.status]}
                            </Badge>
                          </div>
                          <p className="text-sm text-muted-foreground mb-2">
                            {order.productType} - {order.productBrand}{" "}
                            {order.productModel}
                          </p>
                          {order.problemDescription && (
                            <p className="text-sm text-muted-foreground line-clamp-2">
                              {order.problemDescription}
                            </p>
                          )}
                          <div className="flex items-center gap-4 mt-3 text-xs text-muted-foreground">
                            {order.createdAt && (
                              <div className="flex items-center gap-1">
                                <Calendar className="h-3 w-3" />
                                Entrada:{" "}
                                {format(new Date(order.createdAt), "dd/MM/yyyy", {
                                  locale: ptBR,
                                })}
                              </div>
                            )}
                            {order.estimatedDelivery && (
                              <div className="flex items-center gap-1">
                                <Clock className="h-3 w-3" />
                                Previsão:{" "}
                                {format(
                                  new Date(order.estimatedDelivery),
                                  "dd/MM/yyyy",
                                  { locale: ptBR }
                                )}
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>

                {/* Paginação */}
                {totalPages > 1 && (
                  <div className="flex items-center justify-between mt-6 pt-4 border-t">
                    <p className="text-sm text-muted-foreground">
                      Página {currentPage} de {totalPages}
                    </p>
                    <div className="flex gap-2">
                      <Button
                        variant="outline"
                        size="icon"
                        onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                        disabled={currentPage === 1}
                      >
                        <ChevronLeft className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="outline"
                        size="icon"
                        onClick={() =>
                          setCurrentPage((p) => Math.min(totalPages, p + 1))
                        }
                        disabled={currentPage === totalPages}
                      >
                        <ChevronRight className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                )}
              </>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Dialog de Detalhes da Ordem */}
      {selectedOrder && (
        <Dialog
          open={!!selectedOrder}
          onOpenChange={(open) => !open && setSelectedOrder(null)}
        >
          <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>OS #{selectedOrder.orderNumber}</DialogTitle>
              <DialogDescription>
                Detalhes completos da ordem de serviço
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-6">
              {/* Status Atual */}
              <div className="flex items-center justify-between p-4 bg-muted rounded-lg">
                <div>
                  <p className="text-sm text-muted-foreground">Status Atual</p>
                  <Badge
                    className={`mt-1 ${statusColors[selectedOrder.status] || ""}`}
                  >
                    {statusLabels[selectedOrder.status]}
                  </Badge>
                </div>
                {selectedOrder.statusChangedAt && (
                  <div className="text-right">
                    <p className="text-sm text-muted-foreground">
                      Última Atualização
                    </p>
                    <p className="text-sm font-medium">
                      {format(
                        new Date(selectedOrder.statusChangedAt),
                        "dd/MM/yyyy 'às' HH:mm",
                        { locale: ptBR }
                      )}
                    </p>
                  </div>
                )}
              </div>

              {/* Informações do Equipamento */}
              <div>
                <h3 className="font-semibold mb-3">Equipamento</h3>
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <p className="text-muted-foreground">Tipo</p>
                    <p className="font-medium">{selectedOrder.productType}</p>
                  </div>
                  <div>
                    <p className="text-muted-foreground">Marca</p>
                    <p className="font-medium">{selectedOrder.productBrand}</p>
                  </div>
                  <div>
                    <p className="text-muted-foreground">Modelo</p>
                    <p className="font-medium">{selectedOrder.productModel}</p>
                  </div>
                  {selectedOrder.serialNumber && (
                    <div>
                      <p className="text-muted-foreground">Número de Série</p>
                      <p className="font-medium">
                        {selectedOrder.serialNumber}
                      </p>
                    </div>
                  )}
                </div>
              </div>

              {/* Descrição do Problema */}
              {selectedOrder.problemDescription && (
                <div>
                  <h3 className="font-semibold mb-2">Descrição do Problema</h3>
                  <p className="text-sm text-muted-foreground">
                    {selectedOrder.problemDescription}
                  </p>
                </div>
              )}

              {/* Avaliação Inicial */}
              {selectedOrder.initialEvaluation && (
                <div>
                  <h3 className="font-semibold mb-2">Avaliação Inicial</h3>
                  <p className="text-sm text-muted-foreground">
                    {selectedOrder.initialEvaluation}
                  </p>
                </div>
              )}

              {/* Solução */}
              {selectedOrder.solution && (
                <div>
                  <h3 className="font-semibold mb-2">Solução Aplicada</h3>
                  <p className="text-sm text-muted-foreground">
                    {selectedOrder.solution}
                  </p>
                </div>
              )}

              {/* Custos */}
              {(selectedOrder.estimatedCost || selectedOrder.finalCost) && (
                <div>
                  <h3 className="font-semibold mb-3">Custos</h3>
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    {selectedOrder.estimatedCost && (
                      <div>
                        <p className="text-muted-foreground">Custo Estimado</p>
                        <p className="font-medium">
                          R${" "}
                          {selectedOrder.estimatedCost
                            .toFixed(2)
                            .replace(".", ",")}
                        </p>
                      </div>
                    )}
                    {selectedOrder.finalCost && (
                      <div>
                        <p className="text-muted-foreground">Custo Final</p>
                        <p className="font-medium">
                          R${" "}
                          {selectedOrder.finalCost.toFixed(2).replace(".", ",")}
                        </p>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Datas */}
              <div>
                <h3 className="font-semibold mb-3">Datas</h3>
                <div className="grid grid-cols-2 gap-4 text-sm">
                  {selectedOrder.createdAt && (
                    <div>
                      <p className="text-muted-foreground">Data de Entrada</p>
                      <p className="font-medium">
                        {format(new Date(selectedOrder.createdAt), "dd/MM/yyyy", {
                          locale: ptBR,
                        })}
                      </p>
                    </div>
                  )}
                  {selectedOrder.estimatedDelivery && (
                    <div>
                      <p className="text-muted-foreground">
                        Previsão de Entrega
                      </p>
                      <p className="font-medium">
                        {format(
                          new Date(selectedOrder.estimatedDelivery),
                          "dd/MM/yyyy",
                          { locale: ptBR }
                        )}
                      </p>
                    </div>
                  )}
                  {selectedOrder.exitDate && (
                    <div>
                      <p className="text-muted-foreground">Data de Saída</p>
                      <p className="font-medium">
                        {format(new Date(selectedOrder.exitDate), "dd/MM/yyyy", {
                          locale: ptBR,
                        })}
                      </p>
                    </div>
                  )}
                </div>
              </div>

              {/* Histórico de Status */}
              {loadingHistory ? (
                <div className="flex items-center justify-center py-8">
                  <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                </div>
              ) : (
                orderHistory.length > 0 && (
                  <div>
                    <h3 className="font-semibold mb-3">Histórico de Status</h3>
                    <StatusTimeline history={orderHistory} />
                  </div>
                )
              )}

              {/* Observações */}
              {selectedOrder.observations && (
                <div>
                  <h3 className="font-semibold mb-2">Observações</h3>
                  <p className="text-sm text-muted-foreground">
                    {selectedOrder.observations}
                  </p>
                </div>
              )}
            </div>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}
