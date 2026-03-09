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
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { api } from "@/lib/api";
import { formatPhone } from "@/lib/formatters";
import { fetchCEP } from "@/lib/cep";
import { ImageUpload } from "@/components/ImageUpload";
import type { ServiceOrder, ServiceOrderStatus, Customer, Department, Image, ServiceItem, PaymentInfo } from "@/types";
import { Plus, Search, FileText, Check, ChevronsUpDown, UserPlus, Filter, Trash2, Printer, X } from "lucide-react";
import { Textarea } from "@/components/ui/textarea";
import { Separator } from "@/components/ui/separator";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

const statusLabels: Record<ServiceOrderStatus, string> = {
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

export default function ServiceOrders() {
  const [orders, setOrders] = useState<ServiceOrder[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [priorityFilter, setPriorityFilter] = useState<string>("all");
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);

  useEffect(() => {
    loadOrders();
  }, [statusFilter, priorityFilter]);

  const loadOrders = async () => {
    try {
      setLoading(true);
      const params: any = { page: 1, limit: 50 };
      if (statusFilter !== "all") {
        params.status = statusFilter;
      }
      if (priorityFilter !== "all") {
        params.priority = priorityFilter;
      }
      const response = await api.listServiceOrders(params);
      setOrders(response.orders || []);
    } catch (error: any) {
      // Se for 404 (não encontrado), apenas definir array vazio sem mostrar erro
      if (error.message === "status: 404" || error.message?.includes("404")) {
        setOrders([]);
        return;
      }
      // Apenas mostrar erro se não for 404
      if (error.message && error.message.trim() !== "" && !error.message.includes("status: 404")) {
        toast.error(error.message || "Erro ao carregar ordens de serviço");
      }
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
      <div className="space-y-6 w-full min-w-0">
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
            <DialogContent className="max-w-2xl">
              <DialogHeader className="flex-shrink-0 px-4 sm:px-6 pt-4 sm:pt-6 pb-3 sm:pb-4 border-b">
                <DialogTitle className="text-lg sm:text-xl">Nova Ordem de Serviço</DialogTitle>
                <DialogDescription className="text-sm">
                  Preencha os dados para criar uma nova ordem de serviço
                </DialogDescription>
              </DialogHeader>
              <div className="flex-1 overflow-y-auto px-4 sm:px-6 py-4">
                <CreateOrderForm onSuccess={() => {
                  setIsCreateDialogOpen(false);
                  loadOrders();
                }} />
              </div>
            </DialogContent>
          </Dialog>
        </div>

        <div className="flex flex-col sm:flex-row gap-2 sm:gap-4">
          <div className="relative flex-1 min-w-0">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Buscar por número, produto, marca..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10 w-full"
            />
          </div>
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-full sm:w-[200px]">
              <div className="flex items-center gap-2">
                <Filter className="h-4 w-4 text-muted-foreground" />
                <SelectValue placeholder="Filtrar por status" />
              </div>
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos os status</SelectItem>
              {Object.entries(statusLabels)
                .sort(([, labelA], [, labelB]) => labelA.localeCompare(labelB))
                .map(([value, label]) => (
                  <SelectItem key={value} value={value}>
                    {label}
                  </SelectItem>
                ))}
            </SelectContent>
          </Select>
          <Select value={priorityFilter} onValueChange={setPriorityFilter}>
            <SelectTrigger className="w-full sm:w-[200px]">
              <div className="flex items-center gap-2">
                <Filter className="h-4 w-4 text-muted-foreground" />
                <SelectValue placeholder="Filtrar por prioridade" />
              </div>
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todas as prioridades</SelectItem>
              <SelectItem value="low">Baixa</SelectItem>
              <SelectItem value="normal">Normal</SelectItem>
              <SelectItem value="high">Alta</SelectItem>
              <SelectItem value="urgent">Urgente</SelectItem>
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
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [showEditDialog, setShowEditDialog] = useState(false);

  const handleDelete = async () => {
    try {
      await api.deleteServiceOrder(order.id);
      toast.success("Ordem de serviço excluída com sucesso!");
      setShowDeleteDialog(false);
      onUpdate();
    } catch (error: any) {
      toast.error(error.message || "Erro ao excluir ordem de serviço");
    }
  };

  const handlePrint = () => {
    const url = `/print/order/${order.id}`;
    window.open(url, "_blank");
  };

  const totalServiceItems = order.serviceItems?.reduce(
    (sum, item) => sum + item.quantity * item.unitPrice,
    0
  ) ?? 0;

  return (
    <>
      <Card className="hover:shadow-md transition-shadow w-full">
        <CardHeader>
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 sm:gap-4">
            <div className="flex-1 min-w-0">
              <CardTitle className="text-base sm:text-lg truncate">#{order.orderNumber}</CardTitle>
              <CardDescription className="text-xs sm:text-sm break-words">
                {order.productType} - {order.productBrand} {order.productModel}
                {order.serialNumber && ` • Série: ${order.serialNumber}`}
              </CardDescription>
            </div>
            <div className="flex items-center gap-2 flex-shrink-0">
              <span className={`px-2 sm:px-3 py-1 rounded-full text-xs font-medium whitespace-nowrap ${
                order.status === "delivered" ? "bg-green-100 text-green-800" :
                order.status === "cancelled" ? "bg-red-100 text-red-800" :
                order.status === "ready" ? "bg-blue-100 text-blue-800" :
                "bg-gray-100 text-gray-800"
              }`}>
                {statusLabels[order.status]}
              </span>
              <Button variant="ghost" size="icon" onClick={handlePrint} className="h-8 w-8" title="Imprimir OS">
                <Printer className="h-4 w-4" />
              </Button>
              <Button variant="ghost" size="icon" onClick={() => setShowEditDialog(true)} className="h-8 w-8" title="Editar OS">
                <FileText className="h-4 w-4" />
              </Button>
              {(order.status === "pending" || order.status === "cancelled") && (
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => setShowDeleteDialog(true)}
                  className="h-8 w-8"
                >
                  <Trash2 className="h-4 w-4 text-destructive" />
                </Button>
              )}
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="space-y-2 text-sm">
            {order.customer && (
              <p className="text-muted-foreground">
                <strong>Cliente:</strong> {order.customer.name} {order.customer.phone && `• ${order.customer.phone}`}
              </p>
            )}
            <p className="text-muted-foreground break-words">
              <strong>Problema:</strong> {order.problemDescription}
            </p>
            <div className="flex flex-wrap gap-4">
              {order.estimatedCost != null && order.estimatedCost > 0 && (
                <p className="text-muted-foreground">
                  <strong>Estimado:</strong> R$ {order.estimatedCost.toFixed(2)}
                </p>
              )}
              {totalServiceItems > 0 && (
                <p className="text-muted-foreground">
                  <strong>Total serviços:</strong> R$ {totalServiceItems.toFixed(2)}
                </p>
              )}
              {order.finalCost != null && order.finalCost > 0 && (
                <p className="text-muted-foreground">
                  <strong>Total final:</strong> R$ {order.finalCost.toFixed(2)}
                </p>
              )}
            </div>
            {order.payment?.paid && (
              <span className="inline-block px-2 py-0.5 bg-green-100 text-green-700 rounded text-xs font-medium">
                Pago {order.payment.method && `• ${order.payment.method.toUpperCase()}`}
              </span>
            )}
            <p className="text-muted-foreground text-xs">
              Entrada: {new Date(order.entryDate ?? order.createdAt).toLocaleDateString("pt-BR")}
              {order.exitDate && ` • Saída: ${new Date(order.exitDate).toLocaleDateString("pt-BR")}`}
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Dialog de edição */}
      <Dialog open={showEditDialog} onOpenChange={setShowEditDialog}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-hidden flex flex-col">
          <DialogHeader className="flex-shrink-0 px-4 sm:px-6 pt-4 sm:pt-6 pb-3 border-b">
            <DialogTitle>Editar OS #{order.orderNumber}</DialogTitle>
            <DialogDescription>Atualize as informações da ordem de serviço</DialogDescription>
          </DialogHeader>
          <div className="flex-1 overflow-y-auto px-4 sm:px-6 py-4">
            <EditOrderForm order={order} onSuccess={() => { setShowEditDialog(false); onUpdate(); }} />
          </div>
        </DialogContent>
      </Dialog>

      <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirmar Exclusão</AlertDialogTitle>
            <AlertDialogDescription>
              Tem certeza que deseja excluir a ordem #{order.orderNumber}? Esta ação não pode ser desfeita.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Excluir
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
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
    serialNumber: "",
    aestheticConditions: "",
    problemDescription: "",
    departmentId: "",
    images: [] as Image[],
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
        serialNumber: formData.serialNumber || undefined,
        aestheticConditions: formData.aestheticConditions || undefined,
        problemDescription: formData.problemDescription,
        departmentId: formData.departmentId,
        images: formData.images.map((img) => img.url),
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
                  value={formatPhone(formData.newCustomer.phone)}
                  onChange={(e) => {
                    const raw = e.target.value.replace(/\D/g, "");
                    if (raw.length <= 11) {
                      setFormData({
                        ...formData,
                        newCustomer: { ...formData.newCustomer, phone: raw },
                      });
                    }
                  }}
                  placeholder="(00) 00000-0000"
                  required={showNewCustomer}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="newCustomerCPF">CPF (opcional)</Label>
                <Input
                  id="newCustomerCPF"
                  value={formData.newCustomer.cpf}
                  onChange={(e) => {
                    const raw = e.target.value.replace(/\D/g, "");
                    if (raw.length <= 11) {
                      setFormData({
                        ...formData,
                        newCustomer: { ...formData.newCustomer, cpf: raw },
                      });
                    }
                  }}
                  placeholder="000.000.000-00"
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
            <PopoverContent className="w-[var(--radix-popover-trigger-width)] max-w-[calc(100vw-2rem)] p-0" align="start">
            <Command shouldFilter={true}>
                <CommandInput 
                  placeholder="Digite para buscar por nome, telefone ou CPF..." 
                  className="h-9" 
                />
                <CommandList className="max-h-[200px] overflow-y-auto">
                <CommandEmpty>Nenhum cliente encontrado.</CommandEmpty>
                <CommandGroup>
                  {customers.map((customer) => (
                      <CommandItem
                        key={customer.id}
                        value={`${customer.name} ${customer.phone} ${customer.cpf || ""} ${customer.email || ""}`}
                        onSelect={() => {
                          setFormData({ ...formData, customerId: customer.id });
                          setCustomerOpen(false);
                        }}
                        className="cursor-pointer"
                      >
                        <Check
                          className={cn(
                            "mr-2 h-4 w-4 flex-shrink-0",
                            formData.customerId === customer.id ? "opacity-100" : "opacity-0"
                          )}
                        />
                        <div className="flex flex-col min-w-0 flex-1">
                          <span className="truncate font-medium">{customer.name}</span>
                          <span className="text-xs text-muted-foreground truncate">
                            {customer.phone} {customer.cpf && `• ${customer.cpf}`} {customer.email && `• ${customer.email}`}
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
            placeholder="Ex: Console, Notebook..."
            value={formData.productType}
            onChange={(e) => setFormData({ ...formData, productType: e.target.value })}
            required
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="productBrand">Marca *</Label>
          <Input
            id="productBrand"
            placeholder="Ex: Sony, Samsung..."
            value={formData.productBrand}
            onChange={(e) => setFormData({ ...formData, productBrand: e.target.value })}
            required
          />
        </div>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="productModel">Modelo *</Label>
          <Input
            id="productModel"
            placeholder="Ex: PS5 CFI-114A"
            value={formData.productModel}
            onChange={(e) => setFormData({ ...formData, productModel: e.target.value })}
            required
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="serialNumber">Número de Série</Label>
          <Input
            id="serialNumber"
            placeholder="Ex: AK914195243"
            value={formData.serialNumber}
            onChange={(e) => setFormData({ ...formData, serialNumber: e.target.value })}
          />
        </div>
      </div>
      <div className="space-y-2">
        <Label htmlFor="aestheticConditions">Condições Estéticas</Label>
        <Textarea
          id="aestheticConditions"
          placeholder="Ex: Carenagem suja, lacre de fábrica, entradas USB oxidadas..."
          value={formData.aestheticConditions}
          onChange={(e) => setFormData({ ...formData, aestheticConditions: e.target.value })}
          rows={2}
        />
      </div>
      <div className="space-y-2">
        <Label htmlFor="problemDescription">Defeitos Relatados *</Label>
        <Textarea
          id="problemDescription"
          placeholder="Descreva os defeitos relatados pelo cliente..."
          value={formData.problemDescription}
          onChange={(e) => setFormData({ ...formData, problemDescription: e.target.value })}
          required
          rows={3}
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
          <PopoverContent className="w-[var(--radix-popover-trigger-width)] max-w-[calc(100vw-2rem)] p-0" align="start">
            <Command>
                <CommandInput placeholder="Buscar departamento..." className="h-9" />
                <CommandList className="max-h-[200px] overflow-y-auto">
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
                        className="cursor-pointer"
                      >
                        <Check
                          className={cn(
                            "mr-2 h-4 w-4 flex-shrink-0",
                            formData.departmentId === department.id ? "opacity-100" : "opacity-0"
                          )}
                        />
                        <div className="flex flex-col min-w-0 flex-1">
                          <span className="truncate">{department.name}</span>
                          {department.description && (
                            <span className="text-xs text-muted-foreground truncate">
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

function EditOrderForm({ order, onSuccess }: { order: ServiceOrder; onSuccess: () => void }) {
  const [loading, setLoading] = useState(false);
  const [serviceItems, setServiceItems] = useState<ServiceItem[]>(order.serviceItems ?? []);
  const [formData, setFormData] = useState({
    technicalReport: order.technicalReport ?? "",
    solution: order.solution ?? "",
    warrantyTerms: order.warrantyTerms ?? "",
    observations: order.observations ?? "",
    serialNumber: order.serialNumber ?? "",
    aestheticConditions: order.aestheticConditions ?? "",
    finalCost: order.finalCost?.toString() ?? "",
    paymentMethod: order.payment?.method ?? "",
    paymentObservation: order.payment?.observation ?? "",
    paymentPaid: order.payment?.paid ?? false,
    exitDate: order.exitDate ? new Date(order.exitDate).toISOString().split("T")[0] : "",
    deliveryType: order.delivery?.type ?? "none",
    deliveryCost: order.delivery?.cost?.toString() ?? "",
    deliveryDistanceKm: order.delivery?.distanceKm?.toString() ?? "",
    deliveryObservations: order.delivery?.observations ?? "",
  });

  const addServiceItem = () => {
    setServiceItems([...serviceItems, { name: "", quantity: 1, unitPrice: 0 }]);
  };

  const removeServiceItem = (index: number) => {
    setServiceItems(serviceItems.filter((_, i) => i !== index));
  };

  const updateServiceItem = (index: number, field: keyof ServiceItem, value: string | number) => {
    const updated = serviceItems.map((item, i) =>
      i === index ? { ...item, [field]: value } : item
    );
    setServiceItems(updated);
  };

  const totalServiceItems = serviceItems.reduce((sum, item) => sum + item.quantity * item.unitPrice, 0);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setLoading(true);
      const payload: any = {
        technicalReport: formData.technicalReport || undefined,
        solution: formData.solution || undefined,
        warrantyTerms: formData.warrantyTerms || undefined,
        observations: formData.observations || undefined,
        serialNumber: formData.serialNumber || undefined,
        aestheticConditions: formData.aestheticConditions || undefined,
        finalCost: formData.finalCost ? parseFloat(formData.finalCost) : undefined,
        serviceItems: serviceItems.filter((i) => i.name),
        payment: {
          method: formData.paymentMethod || undefined,
          observation: formData.paymentObservation || undefined,
          paid: formData.paymentPaid,
        },
        delivery: formData.deliveryType !== "none" ? {
          type: formData.deliveryType,
          cost: formData.deliveryCost ? parseFloat(formData.deliveryCost) : 0,
          distanceKm: formData.deliveryDistanceKm ? parseFloat(formData.deliveryDistanceKm) : 0,
          observations: formData.deliveryObservations || undefined,
        } : undefined,
        exitDate: formData.exitDate ? new Date(formData.exitDate).toISOString() : undefined,
      };
      await api.updateServiceOrder(order.id, payload);
      toast.success("Ordem de serviço atualizada!");
      onSuccess();
    } catch (error: any) {
      toast.error(error.message || "Erro ao atualizar ordem de serviço");
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      {/* Dados do equipamento */}
      <div className="space-y-1">
        <h3 className="font-semibold text-sm">Equipamento</h3>
        <Separator />
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label>Número de Série</Label>
          <Input
            placeholder="Ex: AK914195243"
            value={formData.serialNumber}
            onChange={(e) => setFormData({ ...formData, serialNumber: e.target.value })}
          />
        </div>
      </div>
      <div className="space-y-2">
        <Label>Condições Estéticas</Label>
        <Textarea
          placeholder="Descreva as condições estéticas do equipamento..."
          value={formData.aestheticConditions}
          onChange={(e) => setFormData({ ...formData, aestheticConditions: e.target.value })}
          rows={2}
        />
      </div>

      {/* Diagnóstico */}
      <div className="space-y-1 pt-2">
        <h3 className="font-semibold text-sm">Diagnóstico Técnico</h3>
        <Separator />
      </div>
      <div className="space-y-2">
        <Label>Laudo Técnico</Label>
        <Textarea
          placeholder="Descreva o laudo técnico detalhado..."
          value={formData.technicalReport}
          onChange={(e) => setFormData({ ...formData, technicalReport: e.target.value })}
          rows={4}
        />
      </div>
      <div className="space-y-2">
        <Label>Solução Proposta / Executada</Label>
        <Textarea
          placeholder="Descreva a solução que será ou foi executada..."
          value={formData.solution}
          onChange={(e) => setFormData({ ...formData, solution: e.target.value })}
          rows={3}
        />
      </div>

      {/* Serviços */}
      <div className="space-y-1 pt-2">
        <h3 className="font-semibold text-sm">Serviços Executados</h3>
        <Separator />
      </div>
      <div className="space-y-3">
        {serviceItems.map((item, index) => (
          <div key={index} className="flex gap-2 items-end">
            <div className="flex-1 space-y-1">
              <Label className="text-xs">Serviço</Label>
              <Input
                placeholder="Nome do serviço"
                value={item.name}
                onChange={(e) => updateServiceItem(index, "name", e.target.value)}
              />
            </div>
            <div className="w-20 space-y-1">
              <Label className="text-xs">Qtd</Label>
              <Input
                type="number"
                min="0.01"
                step="0.01"
                value={item.quantity}
                onChange={(e) => updateServiceItem(index, "quantity", parseFloat(e.target.value) || 1)}
              />
            </div>
            <div className="w-28 space-y-1">
              <Label className="text-xs">Valor Unit. (R$)</Label>
              <Input
                type="number"
                min="0"
                step="0.01"
                value={item.unitPrice}
                onChange={(e) => updateServiceItem(index, "unitPrice", parseFloat(e.target.value) || 0)}
              />
            </div>
            <Button type="button" variant="ghost" size="icon" onClick={() => removeServiceItem(index)}>
              <X className="h-4 w-4 text-destructive" />
            </Button>
          </div>
        ))}
        <Button type="button" variant="outline" size="sm" onClick={addServiceItem}>
          <Plus className="mr-2 h-4 w-4" /> Adicionar Serviço
        </Button>
        {totalServiceItems > 0 && (
          <p className="text-sm font-medium text-right">Total: R$ {totalServiceItems.toFixed(2)}</p>
        )}
      </div>

      {/* Pagamento */}
      <div className="space-y-1 pt-2">
        <h3 className="font-semibold text-sm">Pagamento</h3>
        <Separator />
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label>Forma de Pagamento</Label>
          <Select value={formData.paymentMethod} onValueChange={(v) => setFormData({ ...formData, paymentMethod: v })}>
            <SelectTrigger><SelectValue placeholder="Selecione..." /></SelectTrigger>
            <SelectContent>
              <SelectItem value="pix">PIX</SelectItem>
              <SelectItem value="cartao">Cartão</SelectItem>
              <SelectItem value="dinheiro">Dinheiro</SelectItem>
              <SelectItem value="boleto">Boleto</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-2">
          <Label>Valor Final (R$)</Label>
          <Input
            type="number"
            min="0"
            step="0.01"
            placeholder="0,00"
            value={formData.finalCost}
            onChange={(e) => setFormData({ ...formData, finalCost: e.target.value })}
          />
        </div>
        <div className="space-y-2">
          <Label>Observação do Pagamento</Label>
          <Input
            placeholder="Ex: PAGO ASS DIEGO"
            value={formData.paymentObservation}
            onChange={(e) => setFormData({ ...formData, paymentObservation: e.target.value })}
          />
        </div>
        <div className="flex items-center gap-2 pt-6">
          <input
            type="checkbox"
            id="paymentPaid"
            checked={formData.paymentPaid}
            onChange={(e) => setFormData({ ...formData, paymentPaid: e.target.checked })}
            className="h-4 w-4"
          />
          <Label htmlFor="paymentPaid">Pagamento confirmado</Label>
        </div>
      </div>

      {/* Entrega */}
      <div className="space-y-1 pt-2">
        <h3 className="font-semibold text-sm">Entrega</h3>
        <Separator />
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label>Tipo de Entrega</Label>
          <Select value={formData.deliveryType} onValueChange={(v) => setFormData({ ...formData, deliveryType: v })}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="none">Retirada pelo cliente</SelectItem>
              <SelectItem value="own">Entrega própria</SelectItem>
              <SelectItem value="third">Serviço terceirizado</SelectItem>
            </SelectContent>
          </Select>
        </div>
        {formData.deliveryType !== "none" && (
          <>
            <div className="space-y-2">
              <Label>Distância (km)</Label>
              <Input
                type="number"
                min="0"
                step="0.1"
                placeholder="0"
                value={formData.deliveryDistanceKm}
                onChange={(e) => setFormData({ ...formData, deliveryDistanceKm: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label>Custo da Entrega (R$)</Label>
              <Input
                type="number"
                min="0"
                step="0.01"
                placeholder="0,00"
                value={formData.deliveryCost}
                onChange={(e) => setFormData({ ...formData, deliveryCost: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label>Obs. de Entrega</Label>
              <Input
                placeholder="Instruções de entrega..."
                value={formData.deliveryObservations}
                onChange={(e) => setFormData({ ...formData, deliveryObservations: e.target.value })}
              />
            </div>
          </>
        )}
      </div>

      {/* Finalização */}
      <div className="space-y-1 pt-2">
        <h3 className="font-semibold text-sm">Finalização</h3>
        <Separator />
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label>Data de Saída</Label>
          <Input
            type="date"
            value={formData.exitDate}
            onChange={(e) => setFormData({ ...formData, exitDate: e.target.value })}
          />
        </div>
      </div>
      <div className="space-y-2">
        <Label>Termos de Garantia</Label>
        <Textarea
          placeholder="Termos e condições de garantia do serviço..."
          value={formData.warrantyTerms}
          onChange={(e) => setFormData({ ...formData, warrantyTerms: e.target.value })}
          rows={3}
        />
      </div>
      <div className="space-y-2">
        <Label>Observações Finais</Label>
        <Textarea
          placeholder="Observações gerais..."
          value={formData.observations}
          onChange={(e) => setFormData({ ...formData, observations: e.target.value })}
          rows={2}
        />
      </div>

      <div className="flex justify-end gap-2 pt-2">
        <Button type="submit" disabled={loading}>
          {loading ? "Salvando..." : "Salvar Alterações"}
        </Button>
      </div>
    </form>
  );
}
