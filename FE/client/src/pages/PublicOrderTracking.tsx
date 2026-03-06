import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { api } from "@/lib/api";
import { StatusTimeline } from "@/components/StatusTimeline";
import type { ServiceOrder, StatusHistory } from "@/types";
import { Search, FileText } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { useLocation } from "wouter";

const statusLabels: Record<string, string> = {
  pending: "Aguardando Avaliação",
  evaluating: "Em Avaliação",
  approved: "Aprovado",
  waiting_parts: "Aguardando Peças",
  in_repair: "Em Conserto",
  testing: "Em Teste",
  ready: "Pronto para Retirada",
  delivered: "Entregue",
  cancelled: "Cancelado",
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
      toast.error(error.message || "Erro ao buscar ordem de serviço");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-50 to-white">
      <div className="container mx-auto px-4 py-8 max-w-4xl">
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold tracking-tight mb-2">Acompanhe sua Ordem</h1>
          <p className="text-muted-foreground">
            Digite o número da ordem, CPF ou telefone para consultar o status
          </p>
        </div>

        <Card className="mb-6">
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
            <Button onClick={handleSearch} disabled={loading} className="w-full">
              <Search className="mr-2 h-4 w-4" />
              {loading ? "Buscando..." : "Buscar"}
            </Button>
          </CardContent>
        </Card>

        {order && (
          <Card>
            <CardHeader>
              <CardTitle>Ordem #{order.orderNumber}</CardTitle>
              <CardDescription>
                Status: <span className="font-medium">{statusLabels[order.status]}</span>
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <h3 className="font-medium mb-2">Informações do Produto</h3>
                <div className="space-y-1 text-sm text-muted-foreground">
                  <p><strong>Tipo:</strong> {order.productType}</p>
                  <p><strong>Marca:</strong> {order.productBrand}</p>
                  <p><strong>Modelo:</strong> {order.productModel}</p>
                  <p><strong>Problema:</strong> {order.problemDescription}</p>
                </div>
              </div>
              {history.length > 0 && (
                <div>
                  <h3 className="font-medium mb-2">Histórico de Status</h3>
                  <StatusTimeline history={history} />
                </div>
              )}
            </CardContent>
          </Card>
        )}

        {orders.length > 0 && (
          <div className="space-y-4">
            {customerName && (
              <Card>
                <CardHeader>
                  <CardTitle>Cliente: {customerName}</CardTitle>
                </CardHeader>
              </Card>
            )}
            {orders.map((ord) => (
              <Card key={ord.orderNumber}>
                <CardHeader>
                  <CardTitle>Ordem #{ord.orderNumber}</CardTitle>
                  <CardDescription>
                    Status: <span className="font-medium">{statusLabels[ord.status]}</span>
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-1 text-sm text-muted-foreground">
                    <p><strong>Produto:</strong> {ord.productType} - {ord.productBrand} {ord.productModel}</p>
                    <p><strong>Criado em:</strong> {new Date(ord.createdAt).toLocaleDateString("pt-BR")}</p>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}

        <div className="text-center mt-8">
          <Button variant="outline" onClick={() => setLocation("/")}>
            Voltar para o início
          </Button>
        </div>
      </div>
    </div>
  );
}
