import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { api } from "@/lib/api";
import { formatPhone, formatCPF } from "@/lib/formatters";
import { StatusTimeline } from "@/components/StatusTimeline";
import type { ServiceOrder, StatusHistory } from "@/types";
import { Search, FileText, UserPlus, CheckCircle2, Clock, Bell, Loader2, Copy } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { useLocation } from "wouter";

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
  const [searchType, setSearchType] = useState<"orderNumber" | "cpf" | "phone" | "email">("orderNumber");
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
        const response = await api.getPublicServiceOrder(searchValue.trim());
        setOrder(response.order);
        // Load history if order found
        try {
          const historyResponse = await api.getServiceOrderHistory(response.order.id);
          setHistory(historyResponse.statusHistory);
        } catch (err) {
          // History might not be available for public
        }
        // Load customer name if available
        if (response.order.customer?.name) {
          setCustomerName(response.order.customer.name);
        }
      } else {
        // For CPF/phone, strip formatting before sending
        const cleanValue = searchType === "cpf" || searchType === "phone"
          ? searchValue.replace(/\D/g, "")
          : searchValue.trim();
        const response = await api.searchPublicServiceOrder({
          [searchType]: cleanValue,
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
      <div className="w-full container mx-auto px-4 py-12 max-w-4xl">
        <div className="text-center mb-12">
          <h1 className="text-4xl md:text-5xl font-bold tracking-tight mb-4">Acompanhe sua Ordem</h1>
          <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
            Digite o número da ordem, CPF ou telefone para consultar o status
          </p>
        </div>

        {/* CTA para criar conta - movido para cima */}
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
              Já tem uma conta? <button onClick={() => setLocation("/cliente/login")} className="text-blue-600 hover:underline font-medium">Faça login</button>
            </p>
          </CardContent>
        </Card>

        <Card className="mb-8 shadow-lg">
          <CardHeader>
            <CardTitle>Buscar Ordem de Serviço</CardTitle>
            <CardDescription>Escolha o método de busca e informe os dados</CardDescription>
          </CardHeader>
          <CardContent>
            <Tabs value={searchType} onValueChange={(v) => { setSearchType(v as any); setSearchValue(""); }}>
              <TabsList className="grid w-full grid-cols-4 mb-4">
                <TabsTrigger value="orderNumber" className="text-xs">Nº da Ordem</TabsTrigger>
                <TabsTrigger value="cpf" className="text-xs">CPF</TabsTrigger>
                <TabsTrigger value="phone" className="text-xs">Telefone</TabsTrigger>
                <TabsTrigger value="email" className="text-xs">E-mail</TabsTrigger>
              </TabsList>
              <TabsContent value="orderNumber" className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="orderNumber">Número da Ordem</Label>
                  <Input
                    id="orderNumber"
                    placeholder="Ex: ORD-2024-0001"
                    value={searchValue}
                    onChange={(e) => setSearchValue(e.target.value)}
                    onKeyDown={(e) => e.key === "Enter" && handleSearch()}
                  />
                </div>
              </TabsContent>
              <TabsContent value="cpf" className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="cpf">CPF</Label>
                  <Input
                    id="cpf"
                    placeholder="000.000.000-00"
                    value={formatCPF(searchValue)}
                    onChange={(e) => {
                      const raw = e.target.value.replace(/\D/g, "");
                      if (raw.length <= 11) setSearchValue(raw);
                    }}
                    onKeyDown={(e) => e.key === "Enter" && handleSearch()}
                  />
                </div>
              </TabsContent>
              <TabsContent value="phone" className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="phone">Telefone</Label>
                  <Input
                    id="phone"
                    placeholder="(00) 00000-0000"
                    value={formatPhone(searchValue)}
                    onChange={(e) => {
                      const raw = e.target.value.replace(/\D/g, "");
                      if (raw.length <= 11) setSearchValue(raw);
                    }}
                    onKeyDown={(e) => e.key === "Enter" && handleSearch()}
                  />
                </div>
              </TabsContent>
              <TabsContent value="email" className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="email">E-mail</Label>
                  <Input
                    id="email"
                    type="email"
                    placeholder="seu@email.com"
                    value={searchValue}
                    onChange={(e) => setSearchValue(e.target.value)}
                    onKeyDown={(e) => e.key === "Enter" && handleSearch()}
                  />
                </div>
              </TabsContent>
            </Tabs>
            <div className="mt-4">
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
            </div>
          </CardContent>
        </Card>

        {order && (
          <div className="space-y-4 mb-8">
            {/* Header com número da ordem e status */}
            <Card className="shadow-lg">
              <CardContent className="pt-6">
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-3">
                    <div className="h-10 w-10 rounded-lg bg-orange-500 flex items-center justify-center">
                      <FileText className="h-5 w-5 text-white" />
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-semibold text-lg">Ordem: #{order.orderNumber}</span>
                        <button
                          onClick={() => {
                            navigator.clipboard.writeText(order.orderNumber);
                            toast.success("Número da ordem copiado!");
                          }}
                          className="text-muted-foreground hover:text-foreground"
                        >
                          <Copy className="h-4 w-4" />
                        </button>
                      </div>
                      {customerName && (
                        <p className="text-sm text-muted-foreground mt-1">Cliente: {customerName}</p>
                      )}
                    </div>
                  </div>
                </div>
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-xs text-muted-foreground mb-1">Status</p>
                    <p className="font-semibold text-base">{statusLabels[order.status]}</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Botão de Pagamento */}
            {order.finalCost && (
              <Card className="shadow-lg">
                <CardContent className="pt-6 space-y-4">
                  {!order.payment?.paid && (
                    <>
                      <div className="bg-blue-50 border border-blue-200 rounded-md p-3 text-sm text-blue-800">
                        <p className="font-medium mb-1">Link de Pagamento</p>
                        <p>Este é o link de pagamento e irá direcionar para o Mercado Pago. O status da ordem de serviço mudará automaticamente assim que o pagamento for confirmado.</p>
                      </div>
                      <Button 
                        className="w-full bg-orange-500 hover:bg-orange-600 text-white" 
                        size="lg"
                        onClick={() => {
                          if (order.payment?.method === "pix" || order.payment?.method === "boleto") {
                            toast.info("Link de pagamento será enviado em breve");
                          } else {
                            toast.info("Entre em contato para finalizar o pagamento");
                          }
                        }}
                      >
                        Pagar R$ {order.finalCost.toFixed(2).replace(".", ",")}
                      </Button>
                    </>
                  )}
                  {order.payment?.paid && (
                    <Button 
                      className="w-full bg-green-500 text-white cursor-not-allowed" 
                      size="lg"
                      disabled
                    >
                      Pago
                    </Button>
                  )}
                </CardContent>
              </Card>
            )}

            {/* Detalhes do Pedido */}
            <Card className="shadow-lg">
              <CardHeader>
                <CardTitle className="text-base">Detalhes do Pedido</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Pedido de:</span>
                  <span className="font-medium">{order.productBrand} {order.productModel}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Forma de Pagamento:</span>
                  <span className="font-medium">
                    {order.payment?.method 
                      ? (order.payment.method === "pix" ? "PIX" : 
                         order.payment.method === "cartao" ? "Cartão" : 
                         order.payment.method === "dinheiro" ? "Dinheiro" : 
                         order.payment.method === "boleto" ? "Boleto" : 
                         order.payment.method)
                      : "Não informado"}
                  </span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Tipo de Entrega:</span>
                  <span className="font-medium">
                    {order.delivery?.type === "none" 
                      ? "Retirada pelo cliente" 
                      : order.delivery?.type === "own" 
                      ? "Entrega própria" 
                      : "Serviço terceirizado"}
                  </span>
                </div>
              </CardContent>
            </Card>

            {/* Informações do Produto */}
            <Card className="shadow-lg">
              <CardHeader>
                <CardTitle className="text-base">Informações do Produto</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Tipo:</span>
                  <span className="font-medium">{order.productType}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Marca:</span>
                  <span className="font-medium">{order.productBrand}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Modelo:</span>
                  <span className="font-medium">{order.productModel}</span>
                </div>
                {order.serialNumber && (
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Número de Série:</span>
                    <span className="font-medium">{order.serialNumber}</span>
                  </div>
                )}
                <div className="pt-2 border-t">
                  <p className="text-muted-foreground mb-1">Problema:</p>
                  <p className="text-foreground">{order.problemDescription}</p>
                </div>
                {order.technicalReport && (
                  <div className="pt-2 border-t">
                    <p className="text-muted-foreground mb-1">Laudo Técnico:</p>
                    <p className="text-foreground">{order.technicalReport}</p>
                  </div>
                )}
                {order.delivery?.deliveryEvidence && (
                  <div className="pt-2 border-t">
                    <p className="text-muted-foreground mb-2">Evidência de Conserto:</p>
                    <img 
                      src={order.delivery.deliveryEvidence.url} 
                      alt="Evidência de conserto" 
                      className="w-full rounded-md border border-border"
                    />
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Histórico de Status - Timeline Vertical */}
            {history.length > 0 && (
              <Card className="shadow-lg">
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-base flex items-center gap-2">
                      <FileText className="h-4 w-4" />
                      Histórico de Status
                    </CardTitle>
                    <button className="text-sm text-blue-600 hover:underline">Ver mais</button>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="relative">
                    {history.map((item, index) => {
                      const isLast = index === history.length - 1;
                      const date = new Date(item.changedAt);
                      const formattedDate = date.toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit", year: "numeric" });
                      const formattedTime = date.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" });
                      
                      return (
                        <div key={item.id} className="relative flex gap-4 pb-6 last:pb-0">
                          {/* Timeline line */}
                          {!isLast && (
                            <div className="absolute left-[11px] top-6 bottom-0 w-0.5 bg-gray-200"></div>
                          )}
                          
                          {/* Timeline dot */}
                          <div className={`relative z-10 flex-shrink-0 w-6 h-6 rounded-full ${isLast ? "bg-red-500" : "bg-gray-300"} flex items-center justify-center`}>
                            <div className={`w-2 h-2 rounded-full ${isLast ? "bg-white" : "bg-gray-500"}`}></div>
                          </div>
                          
                          {/* Content */}
                          <div className="flex-1 pt-0.5">
                            <div className="flex items-center gap-2 mb-1">
                              <span className="font-medium text-sm">{statusLabels[item.newStatus]}</span>
                            </div>
                            {item.notes && (
                              <p className="text-xs text-muted-foreground mb-1">{item.notes}</p>
                            )}
                            <div className="flex items-center gap-2 text-xs text-muted-foreground">
                              <span>{formattedTime}</span>
                              <span>•</span>
                              <span>{formattedDate}</span>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </CardContent>
              </Card>
            )}
          </div>
        )}

        {orders.length > 0 && (
          <div className="space-y-4 mb-8">
            {orders.map((ord) => (
              <Card key={ord.orderNumber} className="shadow-lg">
                <CardContent className="pt-6">
                  <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center gap-3">
                      <div className="h-10 w-10 rounded-lg bg-orange-500 flex items-center justify-center">
                        <FileText className="h-5 w-5 text-white" />
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-semibold text-lg">Ordem: #{ord.orderNumber}</span>
                        </div>
                        {customerName && (
                          <p className="text-sm text-muted-foreground mt-1">Cliente: {customerName}</p>
                        )}
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-xs text-muted-foreground mb-1">Status</p>
                      <p className="font-semibold text-base">{statusLabels[ord.status]}</p>
                    </div>
                  </div>
                  <div className="mt-4 pt-4 border-t space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Produto:</span>
                      <span className="font-medium">{ord.productType} - {ord.productBrand} {ord.productModel}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Criado em:</span>
                      <span className="font-medium">{new Date(ord.createdAt).toLocaleDateString("pt-BR")}</span>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}

        <div className="text-center">
          <Button variant="outline" onClick={() => setLocation("/")} size="lg">
            Voltar para o início
          </Button>
        </div>
      </div>
    </div>
  );
}
