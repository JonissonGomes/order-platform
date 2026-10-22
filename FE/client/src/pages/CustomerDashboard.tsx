import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Input } from "@/components/ui/input";
import { api } from "@/lib/api";
import { useAuth } from "@/_core/hooks/useAuth";
import { useCustomerPermissions } from "@/lib/permissions";
import { StatusTimeline } from "@/components/StatusTimeline";
import type { ServiceOrder, StatusHistory } from "@/types";
import {
  Package,
  Clock,
  CheckCircle2,
  AlertCircle,
  Bell,
  Loader2,
  LogOut,
  User,
  History,
  FileText,
  Calendar,
  Phone,
  Mail,
  Search,
  ChevronDown,
  Settings,
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
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";

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

export default function CustomerDashboard() {
  const { user, logout, isAuthenticated, loading: authLoading } = useAuth();
  const { 
    canViewDashboard, 
    canViewProfile, 
    canViewOrders, 
    canViewSearchOrders,
    canViewOpenOrders,
    canViewSummary,
    canViewHelp,
    isLoading: permissionsLoading 
  } = useCustomerPermissions();
  const [, setLocation] = useLocation();
  const [orders, setOrders] = useState<ServiceOrder[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedOrder, setSelectedOrder] = useState<ServiceOrder | null>(null);
  const [orderHistory, setOrderHistory] = useState<StatusHistory[]>([]);
  const [loadingHistory, setLoadingHistory] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [unreadNotifications, setUnreadNotifications] = useState(0);
  const [showLogoutDialog, setShowLogoutDialog] = useState(false);

  useEffect(() => {
    // Aguardar o carregamento inicial antes de verificar autenticação
    if (authLoading || permissionsLoading) return;

    if (!isAuthenticated || !user) {
      setLocation("/cliente/login");
      return;
    }

    // Verificar se é cliente
    if (user.type !== "customer" && user.role !== "customer") {
      // Se não for cliente, redirecionar para dashboard de funcionário
      setLocation("/dashboard");
      return;
    }

    // Verificar se tem permissão para visualizar o dashboard
    // Se permissionsLoading ainda estiver true, aguardar
    if (permissionsLoading) {
      console.log("[CustomerDashboard] Aguardando carregamento de permissões...");
      return;
    }
    
    if (!canViewDashboard) {
      console.log("[CustomerDashboard] Sem permissão para acessar dashboard", {
        canViewDashboard,
        user,
        permissionsLoading,
      });
      toast.error("Você não tem permissão para acessar esta área. Entre em contato com o suporte.");
      // Não redirecionar imediatamente, apenas mostrar o erro
      // O usuário pode ter permissões configuradas mas ainda não carregadas
      return;
    }

    loadOrders();
    loadUnreadNotifications();
    
    // Atualizar notificações a cada 30 segundos
    const interval = setInterval(() => {
      loadUnreadNotifications();
    }, 30000);
    
    return () => clearInterval(interval);
  }, [user, isAuthenticated, authLoading, permissionsLoading, canViewDashboard]);

  const loadOrders = async () => {
    if (!user?.id) return;

    try {
      setLoading(true);
      const response = await api.getCustomerServiceOrders(user.id);
      setOrders(response.orders || []);
    } catch (error: any) {
      const errorMessage = error.message || "";
      if (errorMessage && !errorMessage.includes("status: 404") && errorMessage.trim() !== "") {
        toast.error(errorMessage || "Erro ao carregar ordens");
      }
    } finally {
      setLoading(false);
    }
  };

  const loadUnreadNotifications = async () => {
    try {
      const response = await api.getUnreadCount();
      setUnreadNotifications(response.count || 0);
    } catch (error) {
      // Silenciar erros de notificações
      console.error("Erro ao carregar notificações:", error);
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

  const handleLogout = async () => {
    setShowLogoutDialog(false);
    await logout();
    setLocation("/cliente/login");
  };

  // Aplicar filtros
  let filteredOrders = orders;
  
  if (statusFilter !== "all") {
    filteredOrders = filteredOrders.filter((o) => o.status === statusFilter);
  }
  
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

  // Separar ordens
  const openOrders = filteredOrders.filter(
    (o) => o.status !== "delivered" && o.status !== "cancelled"
  );
  const recentOrders = filteredOrders
    .filter((o) => o.status === "delivered" || o.status === "cancelled")
    .slice(0, 5);

  // Identificar ordens com atualizações recentes (últimas 7 dias)
  const recentUpdates = orders.filter((order) => {
    if (!order.statusChangedAt) return false;
    const updateDate = new Date(order.statusChangedAt);
    const daysDiff = (Date.now() - updateDate.getTime()) / (1000 * 60 * 60 * 24);
    return daysDiff <= 7 && order.status !== "delivered" && order.status !== "cancelled";
  });

  // Ordenar ordens abertas por data de atualização (mais recentes primeiro)
  const sortedOpenOrders = [...openOrders].sort((a, b) => {
    const dateA = new Date(a.statusChangedAt || a.updatedAt || a.createdAt).getTime();
    const dateB = new Date(b.statusChangedAt || b.updatedAt || b.createdAt).getTime();
    return dateB - dateA;
  });

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 via-white to-blue-100">
        <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-blue-100">
      {/* Header Minimalista */}
      <header className="bg-white border-b shadow-sm sticky top-0 z-50">
        <div className="container mx-auto px-4 py-3 sm:py-4">
          <div className="flex items-center justify-between">
            <div className="flex-1 min-w-0">
              <h1 className="text-xl sm:text-2xl font-bold text-gray-900">Área do Cliente</h1>
            </div>
            <div className="flex items-center gap-2 sm:gap-3">
              {unreadNotifications > 0 && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => {
                    const notificationsSection = document.getElementById("notifications-section");
                    if (notificationsSection) {
                      notificationsSection.scrollIntoView({ behavior: "smooth" });
                    }
                  }}
                  className="relative"
                >
                  <Bell className="h-4 w-4 sm:h-5 sm:w-5" />
                  {unreadNotifications > 0 && (
                    <span className="absolute -top-1 -right-1 h-5 w-5 flex items-center justify-center text-xs bg-red-500 text-white rounded-full">
                      {unreadNotifications}
                    </span>
                  )}
                </Button>
              )}
              
              {/* Dropdown de Perfil */}
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="sm" className="flex items-center gap-2 h-9 px-2 sm:px-3">
                    <Avatar className="h-7 w-7 sm:h-8 sm:w-8">
                      <AvatarFallback className="text-xs sm:text-sm bg-blue-100 text-blue-700">
                        {user?.name?.charAt(0).toUpperCase() || "C"}
                      </AvatarFallback>
                    </Avatar>
                    <span className="hidden sm:inline text-sm font-medium truncate max-w-[120px]">
                      {user?.name || "Cliente"}
                    </span>
                    <ChevronDown className="h-3 w-3 sm:h-4 sm:w-4 hidden sm:inline" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-48">
                  <DropdownMenuLabel>
                    <div className="flex flex-col space-y-1">
                      <p className="text-sm font-medium">{user?.name || "Cliente"}</p>
                      {user?.email && (
                        <p className="text-xs text-muted-foreground truncate">{user.email}</p>
                      )}
                    </div>
                  </DropdownMenuLabel>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem
                    onClick={() => {
                      if (canViewProfile) {
                        setLocation("/cliente/perfil");
                      } else {
                        toast.error("Você não tem permissão para acessar seu perfil.");
                      }
                    }}
                    disabled={!canViewProfile}
                  >
                    <User className="mr-2 h-4 w-4" />
                    Meu Perfil
                  </DropdownMenuItem>
                  {canViewOrders && (
                    <DropdownMenuItem onClick={() => setLocation("/cliente/ordens")}>
                      <History className="mr-2 h-4 w-4" />
                      Histórico de Ordens
                    </DropdownMenuItem>
                  )}
                  <DropdownMenuSeparator />
                  <DropdownMenuItem
                    onClick={() => setShowLogoutDialog(true)}
                    className="text-red-600 focus:text-red-600"
                  >
                    <LogOut className="mr-2 h-4 w-4" />
                    Sair
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </div>
        </div>
      </header>

      {/* Dialog de Confirmação de Logout */}
      <Dialog open={showLogoutDialog} onOpenChange={setShowLogoutDialog}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>Confirmar Saída</DialogTitle>
            <DialogDescription>
              Tem certeza que deseja sair da sua conta?
            </DialogDescription>
          </DialogHeader>
          <div className="flex justify-end gap-2 mt-4">
            <Button variant="outline" onClick={() => setShowLogoutDialog(false)}>
              Cancelar
            </Button>
            <Button variant="destructive" onClick={handleLogout}>
              Sair
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      <div className="container mx-auto px-4 sm:px-6 py-4 sm:py-6 lg:py-8 max-w-7xl">
        {/* Filtros e Busca - Responsivo */}
        {canViewSearchOrders && (
          <Card className="mb-4 sm:mb-6">
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-base sm:text-lg">
              <Search className="h-4 w-4 sm:h-5 sm:w-5 text-blue-600" />
              Buscar Ordens
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-col sm:flex-row gap-3 sm:gap-4">
              <div className="flex-1 relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Buscar por número, produto..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && loadOrders()}
                  className="pl-10 text-sm sm:text-base"
                />
              </div>
              <div className="flex gap-2">
                <Select value={statusFilter} onValueChange={setStatusFilter}>
                  <SelectTrigger className="w-full sm:w-[180px] lg:w-[200px] text-sm">
                    <SelectValue placeholder="Status" />
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
                {(searchTerm || statusFilter !== "all") && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      setSearchTerm("");
                      setStatusFilter("all");
                    }}
                    className="shrink-0"
                  >
                    Limpar
                  </Button>
                )}
              </div>
            </div>
          </CardContent>
        </Card>
        )}

        {/* Avisos de Atualizações Recentes - Responsivo */}
        {recentUpdates.length > 0 && (
          <Card className="mb-4 sm:mb-6 border-blue-200 bg-blue-50" id="notifications-section">
            <CardHeader className="pb-3">
              <div className="flex items-center gap-2">
                <Bell className="h-4 w-4 sm:h-5 sm:w-5 text-blue-600" />
                <CardTitle className="text-base sm:text-lg">Atualizações Recentes</CardTitle>
              </div>
              <CardDescription className="text-xs sm:text-sm">
                Você tem {recentUpdates.length} ordem(ns) com atualizações nos últimos 7 dias
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-2 sm:space-y-3">
                {recentUpdates.slice(0, 3).map((order) => (
                  <div
                    key={order.id}
                    className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 sm:gap-3 p-3 bg-white rounded-lg border border-blue-200 cursor-pointer hover:bg-blue-50 transition-colors"
                    onClick={() => handleOrderClick(order)}
                  >
                    <div className="flex items-center gap-2 sm:gap-3 flex-1 min-w-0">
                      <div className="p-1.5 sm:p-2 bg-blue-100 rounded-full shrink-0">
                        <Package className="h-3 w-3 sm:h-4 sm:w-4 text-blue-600" />
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="font-medium text-xs sm:text-sm truncate">
                          OS #{order.orderNumber}
                        </p>
                        <p className="text-xs text-muted-foreground truncate">
                          {order.productType} - {order.productBrand} {order.productModel}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2 sm:flex-col sm:items-end w-full sm:w-auto">
                      <Badge className={`${statusColors[order.status] || ""} text-xs`}>
                        {statusLabels[order.status]}
                      </Badge>
                      {order.statusChangedAt && (
                        <p className="text-xs text-muted-foreground sm:mt-1">
                          {format(new Date(order.statusChangedAt), "dd/MM/yyyy", {
                            locale: ptBR,
                          })}
                        </p>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 sm:gap-6">
          {/* Coluna Principal - Ordens em Aberto - Responsivo */}
          {canViewOpenOrders && (
            <div className="lg:col-span-2 space-y-4 sm:space-y-6">
              <Card>
                <CardHeader className="pb-3">
                  <div className="flex items-center justify-between">
                    <div>
                      <CardTitle className="flex items-center gap-2 text-base sm:text-lg">
                        <Clock className="h-4 w-4 sm:h-5 sm:w-5 text-blue-600" />
                        Ordens em Aberto
                      </CardTitle>
                      <CardDescription className="text-xs sm:text-sm">
                        {openOrders.length} ordem(ns) em andamento
                      </CardDescription>
                    </div>
                  </div>
                </CardHeader>
              <CardContent>
                {sortedOpenOrders.length === 0 ? (
                  <div className="text-center py-8 sm:py-12 text-muted-foreground">
                    <Package className="h-10 w-10 sm:h-12 sm:w-12 mx-auto mb-3 sm:mb-4 opacity-30" />
                    <p className="text-sm sm:text-base">Nenhuma ordem em aberto no momento</p>
                  </div>
                ) : (
                  <div className="space-y-3 sm:space-y-4">
                    {sortedOpenOrders.map((order) => (
                      <div
                        key={order.id}
                        className="p-3 sm:p-4 border rounded-lg hover:bg-muted/50 cursor-pointer transition-colors"
                        onClick={() => handleOrderClick(order)}
                      >
                        <div className="flex flex-col sm:flex-row items-start sm:items-start justify-between gap-3 sm:gap-4">
                          <div className="flex-1 min-w-0 w-full">
                            <div className="flex flex-wrap items-center gap-2 mb-2">
                              <h3 className="font-semibold text-sm sm:text-base">OS #{order.orderNumber}</h3>
                              <Badge className={`${statusColors[order.status] || ""} text-xs`}>
                                {statusLabels[order.status]}
                              </Badge>
                            </div>
                            <p className="text-xs sm:text-sm text-muted-foreground mb-2 truncate">
                              {order.productType} - {order.productBrand} {order.productModel}
                            </p>
                            {order.problemDescription && (
                              <p className="text-xs sm:text-sm text-muted-foreground line-clamp-2 mb-2">
                                {order.problemDescription}
                              </p>
                            )}
                            <div className="flex flex-wrap items-center gap-3 sm:gap-4 text-xs text-muted-foreground">
                              {order.createdAt && (
                                <div className="flex items-center gap-1">
                                  <Calendar className="h-3 w-3 shrink-0" />
                                  <span className="hidden sm:inline">Entrada: </span>
                                  {format(new Date(order.createdAt), "dd/MM/yyyy", {
                                    locale: ptBR,
                                  })}
                                </div>
                              )}
                              {order.estimatedDelivery && (
                                <div className="flex items-center gap-1">
                                  <Clock className="h-3 w-3 shrink-0" />
                                  <span className="hidden sm:inline">Previsão: </span>
                                  {format(new Date(order.estimatedDelivery), "dd/MM/yyyy", {
                                    locale: ptBR,
                                  })}
                                </div>
                              )}
                            </div>
                          </div>
                          {order.statusChangedAt && (
                            <div className="flex sm:flex-col items-center sm:items-end gap-2 sm:gap-0 shrink-0">
                              <div className="p-1.5 sm:p-2 bg-blue-100 rounded-full">
                                <Bell className="h-3 w-3 sm:h-4 sm:w-4 text-blue-600" />
                              </div>
                              <p className="text-xs text-muted-foreground sm:mt-1">
                                Atualizado
                              </p>
                            </div>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Últimas Ordens - Responsivo */}
            {recentOrders.length > 0 && (
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="flex items-center gap-2 text-base sm:text-lg">
                    <History className="h-4 w-4 sm:h-5 sm:w-5 text-gray-600" />
                    Últimas Ordens
                  </CardTitle>
                  <CardDescription className="text-xs sm:text-sm">
                    Histórico das suas últimas 5 ordens finalizadas
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2 sm:space-y-3">
                    {recentOrders.map((order) => (
                      <div
                        key={order.id}
                        className="p-2.5 sm:p-3 border rounded-lg hover:bg-muted/50 cursor-pointer transition-colors"
                        onClick={() => handleOrderClick(order)}
                      >
                        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2">
                          <div className="min-w-0 flex-1">
                            <p className="font-medium text-xs sm:text-sm truncate">OS #{order.orderNumber}</p>
                            <p className="text-xs text-muted-foreground truncate">
                              {order.productType} - {order.productBrand} {order.productModel}
                            </p>
                          </div>
                          <div className="flex items-center gap-2 sm:flex-col sm:items-end w-full sm:w-auto">
                            <Badge className={`${statusColors[order.status] || ""} text-xs`}>
                              {statusLabels[order.status]}
                            </Badge>
                            {order.updatedAt && (
                              <p className="text-xs text-muted-foreground sm:mt-1">
                                {format(new Date(order.updatedAt), "dd/MM/yyyy", {
                                  locale: ptBR,
                                })}
                              </p>
                            )}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
              )}
            </div>
          )}

          {/* Sidebar - Informações e Ações Rápidas - Responsivo */}
          <div className="space-y-4 sm:space-y-6">
            {/* Informações do Cliente - Responsivo */}
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="flex items-center gap-2 text-base sm:text-lg">
                  <User className="h-4 w-4 sm:h-5 sm:w-5 text-blue-600" />
                  Meus Dados
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div>
                  <p className="text-sm sm:text-base font-medium truncate">{user?.name}</p>
                  {user?.email && (
                    <div className="flex items-center gap-1 text-xs text-muted-foreground mt-1">
                      <Mail className="h-3 w-3 shrink-0" />
                      <span className="truncate">{user.email}</span>
                    </div>
                  )}
                </div>
                <Separator />
                <div className="space-y-2">
                  <Button
                    variant="outline"
                    className="w-full justify-start text-sm"
                    onClick={() => {
                      if (canViewProfile) {
                        setLocation("/cliente/perfil");
                      } else {
                        toast.error("Você não tem permissão para acessar seu perfil.");
                      }
                    }}
                    disabled={!canViewProfile}
                  >
                    <User className="h-4 w-4 mr-2" />
                    Editar Perfil
                  </Button>
                  <Button
                    variant="outline"
                    className="w-full justify-start text-sm"
                    onClick={() => {
                      if (canViewOrders) {
                        setLocation("/cliente/ordens");
                      } else {
                        toast.error("Você não tem permissão para visualizar o histórico de ordens.");
                      }
                    }}
                    disabled={!canViewOrders}
                  >
                    <History className="h-4 w-4 mr-2" />
                    Ver Todas as Ordens
                  </Button>
                </div>
              </CardContent>
            </Card>

            {/* Estatísticas Rápidas */}
            {canViewSummary && (
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Resumo</CardTitle>
                </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Clock className="h-4 w-4 text-blue-600" />
                    <span className="text-sm">Em Aberto</span>
                  </div>
                  <span className="font-semibold">{openOrders.length}</span>
                </div>
                <Separator />
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <CheckCircle2 className="h-4 w-4 text-green-600" />
                    <span className="text-sm">Finalizadas</span>
                  </div>
                  <span className="font-semibold">{recentOrders.length}</span>
                </div>
                <Separator />
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Bell className="h-4 w-4 text-orange-600" />
                    <span className="text-sm">Atualizações</span>
                  </div>
                  <span className="font-semibold">{recentUpdates.length}</span>
                </div>
              </CardContent>
            </Card>
            )}

            {/* Ajuda */}
            {canViewHelp && (
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Precisa de Ajuda?</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-muted-foreground mb-3">
                    Entre em contato conosco para esclarecer dúvidas sobre suas ordens.
                  </p>
                  <Button variant="outline" className="w-full" asChild>
                    <a href="tel:+5581999999999">
                      <Phone className="h-4 w-4 mr-2" />
                      Ligar para Suporte
                    </a>
                  </Button>
                </CardContent>
              </Card>
            )}
          </div>
        </div>
      </div>

      {/* Dialog de Detalhes da Ordem - Responsivo */}
      {selectedOrder && (
        <Dialog open={!!selectedOrder} onOpenChange={(open) => !open && setSelectedOrder(null)}>
          <DialogContent className="max-w-[95vw] sm:max-w-3xl max-h-[90vh] overflow-y-auto p-4 sm:p-6">
            <DialogHeader>
              <DialogTitle className="text-lg sm:text-xl">OS #{selectedOrder.orderNumber}</DialogTitle>
              <DialogDescription className="text-xs sm:text-sm">
                Detalhes completos da ordem de serviço
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-4 sm:space-y-6">
              {/* Status Atual - Responsivo */}
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 sm:gap-4 p-3 sm:p-4 bg-muted rounded-lg">
                <div>
                  <p className="text-xs sm:text-sm text-muted-foreground">Status Atual</p>
                  <Badge className={`mt-1 text-xs sm:text-sm ${statusColors[selectedOrder.status] || ""}`}>
                    {statusLabels[selectedOrder.status]}
                  </Badge>
                </div>
                {selectedOrder.statusChangedAt && (
                  <div className="text-left sm:text-right">
                    <p className="text-xs sm:text-sm text-muted-foreground">Última Atualização</p>
                    <p className="text-xs sm:text-sm font-medium">
                      {format(new Date(selectedOrder.statusChangedAt), "dd/MM/yyyy 'às' HH:mm", {
                        locale: ptBR,
                      })}
                    </p>
                  </div>
                )}
              </div>

              {/* Informações do Equipamento - Responsivo */}
              <div>
                <h3 className="font-semibold mb-2 sm:mb-3 text-sm sm:text-base">Equipamento</h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4 text-xs sm:text-sm">
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
                      <p className="font-medium">{selectedOrder.serialNumber}</p>
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
                  <p className="text-sm text-muted-foreground">{selectedOrder.solution}</p>
                </div>
              )}

              {/* Custos - Responsivo */}
              {(selectedOrder.estimatedCost || selectedOrder.finalCost) && (
                <div>
                  <h3 className="font-semibold mb-2 sm:mb-3 text-sm sm:text-base">Custos</h3>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4 text-xs sm:text-sm">
                    {selectedOrder.estimatedCost && (
                      <div>
                        <p className="text-muted-foreground">Custo Estimado</p>
                        <p className="font-medium">
                          R$ {selectedOrder.estimatedCost.toFixed(2).replace(".", ",")}
                        </p>
                      </div>
                    )}
                    {selectedOrder.finalCost && (
                      <div>
                        <p className="text-muted-foreground">Custo Final</p>
                        <p className="font-medium">
                          R$ {selectedOrder.finalCost.toFixed(2).replace(".", ",")}
                        </p>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Datas - Responsivo */}
              <div>
                <h3 className="font-semibold mb-2 sm:mb-3 text-sm sm:text-base">Datas</h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4 text-xs sm:text-sm">
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
                      <p className="text-muted-foreground">Previsão de Entrega</p>
                      <p className="font-medium">
                        {format(new Date(selectedOrder.estimatedDelivery), "dd/MM/yyyy", {
                          locale: ptBR,
                        })}
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

              {/* Observações - Responsivo */}
              {selectedOrder.observations && (
                <div>
                  <h3 className="font-semibold mb-2 text-sm sm:text-base">Observações</h3>
                  <p className="text-xs sm:text-sm text-muted-foreground">
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
