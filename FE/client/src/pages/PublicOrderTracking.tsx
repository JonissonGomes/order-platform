import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { api } from "@/lib/api";
import { StatusTimeline } from "@/components/StatusTimeline";
import type { ServiceOrder, StatusHistory } from "@/types";
import { Search, FileText, UserPlus, CheckCircle2, Clock, Bell } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { useLocation } from "wouter";
import { Loader2 } from "lucide-react";

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

export default function PublicOrderTracking() {
  const [, setLocation] = useLocation();
  const [searchType, setSearchType] = useState<"orderNumber" | "cpf" | "phone">("orderNumber");
  const [searchValue, setSearchValue] = useState("");
  const [loading, setLoading] = useState(false);
  const [order, setOrder] = useState<ServiceOrder | null>(null);
  const [orders, setOrders] = useState<ServiceOrder[]>([]);
  const [customerName, setCustomerName] = useState("");
  const [history, setHistory] = useState<StatusHistory[]>([]);

  const handleSearch = async () => {
    if (!searchValue.trim()) {
      toast.error("Por favor, preencha o campo de busca");
      return;
    }

    try {
      setLoading(true);
      setOrder(null);
      setOrders([]);
      setHistory([]);

      if (searchType === "orderNumber") {
        const response = await api.getPublicServiceOrder(searchValue);
        setOrder(response.order);
        // Load history if order found
        try {
          const historyResponse = await api.getServiceOrderHistory(response.order.id);
          setHistory(historyResponse.statusHistory);
        } catch (err) {
          // History might not be available for public
        }
      } else {
        const response = await api.searchPublicServiceOrder({
          [searchType]: searchValue,
        });
        if (response.order) {
          setOrder(response.order);
        } else if (response.orders) {
          setOrders(response.orders);
          if (response.customer) {
            setCustomerName(response.customer.name);
          }
        } else {
          toast.error("Nenhuma ordem encontrada");
        }
      }
    } catch (error: any) {
      // Não mostrar erro se for 404 (recurso não encontrado) ou se a mensagem estiver vazia
      const errorMessage = error.message || "";
      if (errorMessage && !errorMessage.includes("status: 404") && errorMessage.trim() !== "") {
        toast.error(errorMessage || "Erro ao buscar ordem de serviço");
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-50 to-white">
      <div className="w-full container mx-auto px-4 py-12 max-w-5xl xl:max-w-6xl 2xl:max-w-7xl">
        <div className="text-center mb-12">
          <h1 className="text-4xl md:text-5xl font-bold tracking-tight mb-4">Acompanhe sua Ordem</h1>
          <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
            Digite o número da ordem, CPF ou telefone para consultar o status
          </p>
        </div>

        <Card className="mb-8 shadow-lg">
          <CardHeader>
            <CardTitle>Buscar Ordem de Serviço</CardTitle>
            <CardDescription>Escolha o método de busca e informe os dados</CardDescription>
          </CardHeader>
          <CardContent>
            <Tabs value={searchType} onValueChange={(v) => setSearchType(v as any)}>
              <TabsList className="grid w-full grid-cols-3 mb-4">
                <TabsTrigger value="orderNumber">Número da Ordem</TabsTrigger>
                <TabsTrigger value="cpf">CPF</TabsTrigger>
                <TabsTrigger value="phone">Telefone</TabsTrigger>
              </TabsList>
              <TabsContent value="orderNumber" className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="orderNumber">Número da Ordem</Label>
                  <Input
                    id="orderNumber"
                    placeholder="Ex: ORD-2024-0001"
                    value={searchValue}
                    onChange={(e) => setSearchValue(e.target.value)}
                    onKeyPress={(e) => e.key === "Enter" && handleSearch()}
                  />
                </div>
              </TabsContent>
              <TabsContent value="cpf" className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="cpf">CPF</Label>
                  <Input
                    id="cpf"
                    placeholder="000.000.000-00"
                    value={searchValue}
                    onChange={(e) => setSearchValue(e.target.value)}
                    onKeyPress={(e) => e.key === "Enter" && handleSearch()}
                  />
                </div>
              </TabsContent>
              <TabsContent value="phone" className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="phone">Telefone</Label>
                  <Input
                    id="phone"
                    placeholder="(00) 00000-0000"
                    value={searchValue}
                    onChange={(e) => setSearchValue(e.target.value)}
                    onKeyPress={(e) => e.key === "Enter" && handleSearch()}
                  />
                </div>
              </TabsContent>
            </Tabs>
            <Button onClick={handleSearch} disabled={loading} className="w-full" size="lg">
              {loading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Buscando...
                </>
              ) : (
                <>
                  <Search className="mr-2 h-4 w-4" />
                  Buscar
                </>
              )}
            </Button>
          </CardContent>
        </Card>

        {order && (
          <Card className="mb-8 shadow-lg">
            <CardHeader>
              <CardTitle>Ordem #{order.orderNumber}</CardTitle>
              <CardDescription>
                Status: <span className="font-medium">{statusLabels[order.status]}</span>
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-3">
                <h3 className="font-semibold text-base">Informações do Produto</h3>
                <div className="space-y-2 text-sm text-muted-foreground bg-slate-50 p-4 rounded-lg">
                  <p><strong className="text-foreground">Tipo:</strong> {order.productType}</p>
                  <p><strong className="text-foreground">Marca:</strong> {order.productBrand}</p>
                  <p><strong className="text-foreground">Modelo:</strong> {order.productModel}</p>
                  <p><strong className="text-foreground">Problema:</strong> {order.problemDescription}</p>
                </div>
              </div>
              {history.length > 0 && (
                <div className="space-y-3">
                  <h3 className="font-semibold text-base">Histórico de Status</h3>
                  <StatusTimeline history={history} />
                </div>
              )}
            </CardContent>
          </Card>
        )}

        {orders.length > 0 && (
          <div className="space-y-6 mb-8">
            {customerName && (
              <Card className="shadow-lg">
                <CardHeader>
                  <CardTitle>Cliente: {customerName}</CardTitle>
                </CardHeader>
              </Card>
            )}
            {orders.map((ord) => (
              <Card key={ord.orderNumber} className="shadow-lg">
                <CardHeader>
                  <CardTitle>Ordem #{ord.orderNumber}</CardTitle>
                  <CardDescription>
                    Status: <span className="font-medium">{statusLabels[ord.status]}</span>
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2 text-sm text-muted-foreground bg-slate-50 p-4 rounded-lg">
                    <p><strong className="text-foreground">Produto:</strong> {ord.productType} - {ord.productBrand} {ord.productModel}</p>
                    <p><strong className="text-foreground">Criado em:</strong> {new Date(ord.createdAt).toLocaleDateString("pt-BR")}</p>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}

        {/* CTA para criar conta */}
        <Card className="mb-8 shadow-lg border-2 border-blue-200 bg-gradient-to-br from-blue-50 to-slate-50">
          <CardHeader>
            <div className="flex items-center gap-3 mb-2">
              <div className="h-10 w-10 rounded-full bg-blue-600 flex items-center justify-center">
                <UserPlus className="h-5 w-5 text-white" />
              </div>
              <CardTitle className="text-xl">Crie sua conta e acompanhe melhor seus pedidos</CardTitle>
            </div>
            <CardDescription className="text-base">
              Com uma conta, você terá acesso a recursos exclusivos para gerenciar seus serviços
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
              <div className="flex items-start gap-3">
                <CheckCircle2 className="h-5 w-5 text-blue-600 mt-0.5 shrink-0" />
                <div>
                  <p className="font-medium text-sm">Acompanhamento em tempo real</p>
                  <p className="text-xs text-muted-foreground">Receba notificações sobre o status do seu serviço</p>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <Clock className="h-5 w-5 text-blue-600 mt-0.5 shrink-0" />
                <div>
                  <p className="font-medium text-sm">Histórico completo</p>
                  <p className="text-xs text-muted-foreground">Acesse todo o histórico de seus serviços</p>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <Bell className="h-5 w-5 text-blue-600 mt-0.5 shrink-0" />
                <div>
                  <p className="font-medium text-sm">Notificações automáticas</p>
                  <p className="text-xs text-muted-foreground">Seja avisado sobre mudanças de status</p>
                </div>
              </div>
            </div>
            <Button 
              onClick={() => setLocation("/register")} 
              className="w-full" 
              size="lg"
            >
              <UserPlus className="mr-2 h-4 w-4" />
              Criar conta gratuita
            </Button>
            <p className="text-xs text-center text-muted-foreground">
              Já tem uma conta? <button onClick={() => setLocation("/login")} className="text-blue-600 hover:underline font-medium">Faça login</button>
            </p>
          </CardContent>
        </Card>

        <div className="text-center">
          <Button variant="outline" onClick={() => setLocation("/")} size="lg">
            Voltar para o início
          </Button>
        </div>
      </div>
    </div>
  );
}
