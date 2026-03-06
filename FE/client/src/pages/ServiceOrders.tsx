import DashboardLayout from "@/components/DashboardLayout";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { api } from "@/lib/api";
import type { ServiceOrder, ServiceOrderStatus, Customer, Department } from "@/types";
import { Plus, Search, FileText, Check, ChevronsUpDown, UserPlus } from "lucide-react";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

const statusLabels: Record<ServiceOrderStatus, string> = {
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

export default function ServiceOrders() {
  const [orders, setOrders] = useState<ServiceOrder[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);

  useEffect(() => {
    loadOrders();
  }, [statusFilter]);

  const loadOrders = async () => {
    try {
      setLoading(true);
      const params: any = { page: 1, limit: 50 };
      if (statusFilter !== "all") {
        params.status = statusFilter;
      }
      const response = await api.listServiceOrders(params);
      setOrders(response.orders);
    } catch (error: any) {
      toast.error(error.message || "Erro ao carregar ordens de serviço");
    } finally {
      setLoading(false);
    }
  };

  const filteredOrders = orders.filter((order) => {
    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      return (
        order.orderNumber.toLowerCase().includes(term) ||
        order.productType.toLowerCase().includes(term) ||
        order.productBrand.toLowerCase().includes(term) ||
        order.productModel.toLowerCase().includes(term)
      );
    }
    return true;
  });

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Ordens de Serviço</h1>
            <p className="text-muted-foreground">Gerencie todas as ordens de serviço do sistema</p>
          </div>
          <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
            <DialogTrigger asChild>
              <Button>
                <Plus className="mr-2 h-4 w-4" />
                Nova Ordem
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>Nova Ordem de Serviço</DialogTitle>
                <DialogDescription>
                  Preencha os dados para criar uma nova ordem de serviço
                </DialogDescription>
              </DialogHeader>
              <CreateOrderForm onSuccess={() => {
                setIsCreateDialogOpen(false);
                loadOrders();
              }} />
            </DialogContent>
          </Dialog>
        </div>

        <div className="flex flex-col sm:flex-row gap-4">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Buscar por número, produto, marca..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
            />
          </div>
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-full sm:w-[200px]">
              <SelectValue placeholder="Filtrar por status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos os status</SelectItem>
              {Object.entries(statusLabels).map(([value, label]) => (
                <SelectItem key={value} value={value}>
                  {label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {loading ? (
          <div className="text-center py-8 text-muted-foreground">Carregando...</div>
        ) : filteredOrders.length === 0 ? (
          <Card>
            <CardContent className="py-8 text-center text-muted-foreground">
              Nenhuma ordem de serviço encontrada
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-4">
            {filteredOrders.map((order) => (
              <OrderCard key={order.id} order={order} onUpdate={loadOrders} />
            ))}
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}

function OrderCard({ order, onUpdate }: { order: ServiceOrder; onUpdate: () => void }) {
  return (
    <Card className="hover:shadow-md transition-shadow">
      <CardHeader>
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div>
            <CardTitle className="text-lg">#{order.orderNumber}</CardTitle>
            <CardDescription>
              {order.productType} - {order.productBrand} {order.productModel}
            </CardDescription>
          </div>
          <div className="flex items-center gap-2">
            <span className={`px-3 py-1 rounded-full text-xs font-medium ${
              order.status === "delivered" ? "bg-green-100 text-green-800" :
              order.status === "cancelled" ? "bg-red-100 text-red-800" :
              order.status === "ready" ? "bg-blue-100 text-blue-800" :
              "bg-gray-100 text-gray-800"
            }`}>
              {statusLabels[order.status]}
            </span>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <div className="space-y-2 text-sm">
          <p className="text-muted-foreground">
            <strong>Problema:</strong> {order.problemDescription}
          </p>
          {order.estimatedCost && (
            <p className="text-muted-foreground">
              <strong>Valor estimado:</strong> R$ {order.estimatedCost.toFixed(2)}
            </p>
          )}
          <p className="text-muted-foreground text-xs">
            Criado em {new Date(order.createdAt).toLocaleDateString("pt-BR")}
          </p>
        </div>
      </CardContent>
    </Card>
  );
}

function CreateOrderForm({ onSuccess }: { onSuccess: () => void }) {
  const [loading, setLoading] = useState(false);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [departments, setDepartments] = useState<Department[]>([]);
  const [customerOpen, setCustomerOpen] = useState(false);
  const [departmentOpen, setDepartmentOpen] = useState(false);
  const [showNewCustomer, setShowNewCustomer] = useState(false);
  const [formData, setFormData] = useState({
    customerId: "",
    customer: null as any,
    productType: "",
    productBrand: "",
    productModel: "",
    problemDescription: "",
    departmentId: "",
    newCustomer: {
      name: "",
      cpf: "",
      phone: "",
      email: "",
    },
  });

  useEffect(() => {
    loadCustomers();
    loadDepartments();
  }, []);

  const loadCustomers = async () => {
    try {
      const response = await api.listCustomers({ page: 1, limit: 100 });
      setCustomers(response.customers);
    } catch (error) {
      // Silently fail, will show error on submit
    }
  };

  const loadDepartments = async () => {
    try {
      const response = await api.listDepartments({ isActive: true });
      setDepartments(response.departments);
    } catch (error) {
      // Silently fail, will show error on submit
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setLoading(true);
      const payload: any = {
        productType: formData.productType,
        productBrand: formData.productBrand,
        productModel: formData.productModel,
        problemDescription: formData.problemDescription,
        departmentId: formData.departmentId,
      };

      if (showNewCustomer && formData.newCustomer.name) {
        // Cliente avulso
        payload.customer = {
          name: formData.newCustomer.name,
          phone: formData.newCustomer.phone,
          cpf: formData.newCustomer.cpf || "",
          email: formData.newCustomer.email || "",
        };
      } else if (formData.customerId) {
        // Cliente existente
        payload.customerId = formData.customerId;
      } else {
        toast.error("Selecione um cliente ou cadastre um cliente avulso");
        return;
      }

      await api.createServiceOrder(payload);
      toast.success("Ordem de serviço criada com sucesso!");
      onSuccess();
    } catch (error: any) {
      toast.error(error.message || "Erro ao criar ordem de serviço");
    } finally {
      setLoading(false);
    }
  };

  const selectedCustomer = customers.find((c) => c.id === formData.customerId);
  const selectedDepartment = departments.find((d) => d.id === formData.departmentId);

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <Label>Cliente *</Label>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={() => {
              setShowNewCustomer(!showNewCustomer);
              if (!showNewCustomer) {
                setFormData({ ...formData, customerId: "", customer: null });
              }
            }}
          >
            <UserPlus className="mr-2 h-4 w-4" />
            {showNewCustomer ? "Selecionar existente" : "Cliente avulso"}
          </Button>
        </div>

        {showNewCustomer ? (
          <div className="space-y-3 p-4 border rounded-md bg-gray-50">
            <div className="space-y-2">
              <Label htmlFor="newCustomerName">Nome *</Label>
              <Input
                id="newCustomerName"
                value={formData.newCustomer.name}
                onChange={(e) =>
                  setFormData({
                    ...formData,
                    newCustomer: { ...formData.newCustomer, name: e.target.value },
                  })
                }
                required={showNewCustomer}
              />
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label htmlFor="newCustomerPhone">Telefone *</Label>
                <Input
                  id="newCustomerPhone"
                  value={formData.newCustomer.phone}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      newCustomer: { ...formData.newCustomer, phone: e.target.value },
                    })
                  }
                  required={showNewCustomer}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="newCustomerCPF">CPF (opcional)</Label>
                <Input
                  id="newCustomerCPF"
                  value={formData.newCustomer.cpf}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      newCustomer: { ...formData.newCustomer, cpf: e.target.value },
                    })
                  }
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="newCustomerEmail">Email (opcional)</Label>
              <Input
                id="newCustomerEmail"
                type="email"
                value={formData.newCustomer.email}
                onChange={(e) =>
                  setFormData({
                    ...formData,
                    newCustomer: { ...formData.newCustomer, email: e.target.value },
                  })
                }
              />
            </div>
          </div>
        ) : (
          <Popover open={customerOpen} onOpenChange={setCustomerOpen}>
            <PopoverTrigger asChild>
              <Button
                variant="outline"
                role="combobox"
                aria-expanded={customerOpen}
                className="w-full justify-between"
              >
                {selectedCustomer
                  ? `${selectedCustomer.name} - ${selectedCustomer.phone}`
                  : "Selecione um cliente..."}
                <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-full p-0" align="start">
              <Command>
                <CommandInput placeholder="Buscar cliente..." />
                <CommandList>
                  <CommandEmpty>Nenhum cliente encontrado.</CommandEmpty>
                  <CommandGroup>
                    {customers.map((customer) => (
                      <CommandItem
                        key={customer.id}
                        value={`${customer.name} ${customer.phone} ${customer.cpf}`}
                        onSelect={() => {
                          setFormData({ ...formData, customerId: customer.id });
                          setCustomerOpen(false);
                        }}
                      >
                        <Check
                          className={cn(
                            "mr-2 h-4 w-4",
                            formData.customerId === customer.id ? "opacity-100" : "opacity-0"
                          )}
                        />
                        <div className="flex flex-col">
                          <span>{customer.name}</span>
                          <span className="text-xs text-muted-foreground">
                            {customer.phone} {customer.cpf && `- ${customer.cpf}`}
                          </span>
                        </div>
                      </CommandItem>
                    ))}
                  </CommandGroup>
                </CommandList>
              </Command>
            </PopoverContent>
          </Popover>
        )}
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="productType">Tipo de Produto *</Label>
          <Input
            id="productType"
            value={formData.productType}
            onChange={(e) => setFormData({ ...formData, productType: e.target.value })}
            required
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="productBrand">Marca *</Label>
          <Input
            id="productBrand"
            value={formData.productBrand}
            onChange={(e) => setFormData({ ...formData, productBrand: e.target.value })}
            required
          />
        </div>
      </div>
      <div className="space-y-2">
        <Label htmlFor="productModel">Modelo *</Label>
        <Input
          id="productModel"
          value={formData.productModel}
          onChange={(e) => setFormData({ ...formData, productModel: e.target.value })}
          required
        />
      </div>
      <div className="space-y-2">
        <Label htmlFor="problemDescription">Descrição do Problema *</Label>
        <textarea
          id="problemDescription"
          className="w-full min-h-[100px] px-3 py-2 border rounded-md"
          value={formData.problemDescription}
          onChange={(e) => setFormData({ ...formData, problemDescription: e.target.value })}
          required
        />
      </div>
      <div className="space-y-2">
        <Label>Departamento *</Label>
        <Popover open={departmentOpen} onOpenChange={setDepartmentOpen}>
          <PopoverTrigger asChild>
            <Button
              variant="outline"
              role="combobox"
              aria-expanded={departmentOpen}
              className="w-full justify-between"
            >
              {selectedDepartment
                ? selectedDepartment.name
                : "Selecione um departamento..."}
              <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-full p-0" align="start">
            <Command>
              <CommandInput placeholder="Buscar departamento..." />
              <CommandList>
                <CommandEmpty>Nenhum departamento encontrado.</CommandEmpty>
                <CommandGroup>
                  {departments.map((department) => (
                    <CommandItem
                      key={department.id}
                      value={department.name}
                      onSelect={() => {
                        setFormData({ ...formData, departmentId: department.id });
                        setDepartmentOpen(false);
                      }}
                    >
                      <Check
                        className={cn(
                          "mr-2 h-4 w-4",
                          formData.departmentId === department.id ? "opacity-100" : "opacity-0"
                        )}
                      />
                      <div className="flex flex-col">
                        <span>{department.name}</span>
                        {department.description && (
                          <span className="text-xs text-muted-foreground">
                            {department.description}
                          </span>
                        )}
                      </div>
                    </CommandItem>
                  ))}
                </CommandGroup>
              </CommandList>
            </Command>
          </PopoverContent>
        </Popover>
      </div>
      <div className="flex justify-end gap-2">
        <Button type="submit" disabled={loading}>
          {loading ? "Criando..." : "Criar Ordem"}
        </Button>
      </div>
    </form>
  );
}
