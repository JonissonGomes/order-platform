import DashboardLayout from "@/components/DashboardLayout";
import { Button } from "@/components/ui/button";
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
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { api } from "@/lib/api";
import { formatPhone, formatCPF } from "@/lib/formatters";
import { ImageUpload } from "@/components/ImageUpload";
import { useAuth } from "@/_core/hooks/useAuth";
import type { ServiceOrder, ServiceOrderStatus, Customer, Department, Employee, Image, ServiceItem } from "@/types";
import {
  Plus, Search, FileText, Check, ChevronsUpDown, UserPlus,
  Filter, Trash2, Printer, X, Loader2, ChevronLeft, ChevronRight, Pencil,
} from "lucide-react";
import { Textarea } from "@/components/ui/textarea";
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

const statusColors: Record<ServiceOrderStatus, string> = {
  pending: "bg-gray-100 text-gray-800",
  evaluating: "bg-yellow-100 text-yellow-800",
  approved: "bg-blue-100 text-blue-800",
  waiting_parts: "bg-orange-100 text-orange-800",
  in_repair: "bg-purple-100 text-purple-800",
  testing: "bg-indigo-100 text-indigo-800",
  ready: "bg-teal-100 text-teal-800",
  delivered: "bg-green-100 text-green-800",
  cancelled: "bg-red-100 text-red-800",
};

const priorityLabels: Record<string, string> = {
  low: "Baixa", normal: "Normal", high: "Alta", urgent: "Urgente",
};

export default function ServiceOrders() {
  const { user } = useAuth();
  const [orders, setOrders] = useState<ServiceOrder[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [priorityFilter, setPriorityFilter] = useState<string>("all");
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [selectedOrder, setSelectedOrder] = useState<ServiceOrder | null>(null);
  const [editingOrder, setEditingOrder] = useState<ServiceOrder | null>(null);
  const [deletingOrder, setDeletingOrder] = useState<ServiceOrder | null>(null);

  useEffect(() => {
    loadOrders();
  }, [statusFilter, priorityFilter]);

  const loadOrders = async () => {
    try {
      setLoading(true);
      const params: any = { page: 1, limit: 100 };
      if (statusFilter !== "all") params.status = statusFilter;
      if (priorityFilter !== "all") params.priority = priorityFilter;
      const response = await api.listServiceOrders(params);
      setOrders(response.orders || []);
    } catch (error: any) {
      if (error.message === "status: 404" || error.message?.includes("404")) {
        setOrders([]);
        return;
      }
      if (error.message && !error.message.includes("status: 404")) {
        toast.error(error.message || "Erro ao carregar ordens de serviço");
      }
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async () => {
    if (!deletingOrder) return;
    try {
      await api.deleteServiceOrder(deletingOrder.id);
      toast.success("Ordem de serviço excluída com sucesso!");
      setDeletingOrder(null);
      setSelectedOrder(null);
      loadOrders();
    } catch (error: any) {
      toast.error(error.message || "Erro ao excluir ordem");
    }
  };

  const filteredOrders = orders.filter((order) => {
    if (!searchTerm) return true;
    const term = searchTerm.toLowerCase();
    return (
      order.orderNumber.toLowerCase().includes(term) ||
      order.productType.toLowerCase().includes(term) ||
      order.productBrand.toLowerCase().includes(term) ||
      order.productModel.toLowerCase().includes(term) ||
      order.customer?.name.toLowerCase().includes(term)
    );
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
              <Button><Plus className="mr-2 h-4 w-4" />Nova Ordem</Button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
              <DialogHeader className="border-b pb-3">
                <DialogTitle>Nova Ordem de Serviço</DialogTitle>
                <DialogDescription>Preencha os dados para criar uma nova ordem</DialogDescription>
              </DialogHeader>
              <div className="py-4">
                <CreateOrderForm
                  userId={user?.id}
                  onSuccess={() => { setIsCreateDialogOpen(false); loadOrders(); }}
                />
              </div>
            </DialogContent>
          </Dialog>
        </div>

        <div className="flex flex-col sm:flex-row gap-2">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Buscar por número, produto, cliente..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
            />
          </div>
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-full sm:w-[190px]">
              <div className="flex items-center gap-2">
                <Filter className="h-4 w-4 text-muted-foreground" />
                <SelectValue placeholder="Status" />
              </div>
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos os status</SelectItem>
              {Object.entries(statusLabels).sort(([,a],[,b]) => a.localeCompare(b)).map(([v, l]) => (
                <SelectItem key={v} value={v}>{l}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={priorityFilter} onValueChange={setPriorityFilter}>
            <SelectTrigger className="w-full sm:w-[160px]">
              <div className="flex items-center gap-2">
                <Filter className="h-4 w-4 text-muted-foreground" />
                <SelectValue placeholder="Prioridade" />
              </div>
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todas</SelectItem>
              {Object.entries(priorityLabels).map(([v, l]) => (
                <SelectItem key={v} value={v}>{l}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
          </div>
        ) : filteredOrders.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12 text-muted-foreground gap-3">
            <FileText className="h-12 w-12 opacity-30" />
            <p>Nenhuma ordem de serviço encontrada</p>
          </div>
        ) : (
          <div className="rounded-md border overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow className="bg-muted/50">
                  <TableHead className="w-[120px]">OS #</TableHead>
                  <TableHead>Cliente</TableHead>
                  <TableHead className="hidden sm:table-cell">Tipo</TableHead>
                  <TableHead className="hidden md:table-cell">Produto</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="hidden lg:table-cell">Entrada</TableHead>
                  <TableHead className="text-right">Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredOrders.map((order) => (
                  <TableRow
                    key={order.id}
                    className="cursor-pointer hover:bg-muted/50 transition-colors"
                    onClick={() => setSelectedOrder(order)}
                  >
                    <TableCell className="font-mono font-medium text-sm">#{order.orderNumber}</TableCell>
                    <TableCell className="font-medium text-sm">
                      {order.customer?.name || <span className="text-muted-foreground">—</span>}
                    </TableCell>
                    <TableCell className="hidden sm:table-cell text-sm text-muted-foreground">
                      {order.productType}
                    </TableCell>
                    <TableCell className="hidden md:table-cell text-sm text-muted-foreground">
                      {order.productBrand} {order.productModel}
                    </TableCell>
                    <TableCell>
                      <span className={`px-2 py-0.5 rounded-full text-xs font-medium whitespace-nowrap ${statusColors[order.status]}`}>
                        {statusLabels[order.status]}
                      </span>
                    </TableCell>
                    <TableCell className="hidden lg:table-cell text-sm text-muted-foreground">
                      {new Date(order.entryDate ?? order.createdAt).toLocaleDateString("pt-BR")}
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex items-center justify-end gap-1" onClick={(e) => e.stopPropagation()}>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8"
                          title="Imprimir"
                          onClick={() => window.open(`/print/order/${order.id}`, "_blank")}
                        >
                          <Printer className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8"
                          title="Editar"
                          onClick={() => { setEditingOrder(order); setSelectedOrder(null); }}
                        >
                          <Pencil className="h-4 w-4" />
                        </Button>
                        {(order.status === "pending" || order.status === "cancelled") && (
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 text-destructive hover:text-destructive"
                            title="Excluir"
                            onClick={() => setDeletingOrder(order)}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </div>

      {/* Detail Modal */}
      {selectedOrder && !editingOrder && (
        <Dialog open={!!selectedOrder} onOpenChange={(open) => !open && setSelectedOrder(null)}>
          <DialogContent className="max-w-lg">
            <DialogHeader className="border-b pb-3">
              <div className="flex items-center justify-between">
                <div>
                  <DialogTitle className="font-mono">OS #{selectedOrder.orderNumber}</DialogTitle>
                  <DialogDescription>{selectedOrder.productBrand} {selectedOrder.productModel} • {selectedOrder.productType}</DialogDescription>
                </div>
                <span className={`px-2 py-1 rounded-full text-xs font-medium ${statusColors[selectedOrder.status]}`}>
                  {statusLabels[selectedOrder.status]}
                </span>
              </div>
            </DialogHeader>
            <div className="space-y-3 text-sm py-2">
              {selectedOrder.customer && (
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <p className="text-xs text-muted-foreground font-medium uppercase tracking-wide">Cliente</p>
                    <p className="mt-1 font-medium">{selectedOrder.customer.name}</p>
                  </div>
                  {selectedOrder.customer.phone && (
                    <div>
                      <p className="text-xs text-muted-foreground font-medium uppercase tracking-wide">Telefone</p>
                      <p className="mt-1">{formatPhone(selectedOrder.customer.phone)}</p>
                    </div>
                  )}
                </div>
              )}
              <div>
                <p className="text-xs text-muted-foreground font-medium uppercase tracking-wide">Defeito Relatado</p>
                <p className="mt-1 text-muted-foreground">{selectedOrder.problemDescription}</p>
              </div>
              {selectedOrder.technicalReport && (
                <div>
                  <p className="text-xs text-muted-foreground font-medium uppercase tracking-wide">Laudo Técnico</p>
                  <p className="mt-1 text-muted-foreground">{selectedOrder.technicalReport}</p>
                </div>
              )}
              {selectedOrder.serviceItems && selectedOrder.serviceItems.length > 0 && (
                <div>
                  <p className="text-xs text-muted-foreground font-medium uppercase tracking-wide mb-2">Serviços</p>
                  <div className="space-y-1">
                    {selectedOrder.serviceItems.map((item, i) => (
                      <div key={i} className="flex justify-between text-xs bg-muted rounded px-2 py-1">
                        <span>{item.name} × {item.quantity}</span>
                        <span>R$ {(item.quantity * item.unitPrice).toFixed(2)}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <p className="text-xs text-muted-foreground font-medium uppercase tracking-wide">Entrada</p>
                  <p className="mt-1">{new Date(selectedOrder.entryDate ?? selectedOrder.createdAt).toLocaleDateString("pt-BR")}</p>
                </div>
                {selectedOrder.exitDate && (
                  <div>
                    <p className="text-xs text-muted-foreground font-medium uppercase tracking-wide">Saída</p>
                    <p className="mt-1">{new Date(selectedOrder.exitDate).toLocaleDateString("pt-BR")}</p>
                  </div>
                )}
              </div>
              {selectedOrder.payment?.paid && (
                <div className="bg-green-50 border border-green-200 rounded px-3 py-2 text-xs text-green-800 font-medium">
                  ✓ Pagamento confirmado {selectedOrder.payment.method && `— ${selectedOrder.payment.method.toUpperCase()}`}
                </div>
              )}
            </div>
            <div className="flex justify-between pt-2 border-t">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => window.open(`/print/order/${selectedOrder.id}`, "_blank")}
              >
                <Printer className="h-4 w-4 mr-1" /> Imprimir
              </Button>
              <div className="flex gap-1">
                {(selectedOrder.status === "pending" || selectedOrder.status === "cancelled") && (
                  <Button
                    variant="ghost"
                    size="icon"
                    className="text-destructive hover:text-destructive"
                    title="Excluir"
                    onClick={() => { setDeletingOrder(selectedOrder); setSelectedOrder(null); }}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                )}
                <Button
                  variant="ghost"
                  size="icon"
                  title="Editar"
                  onClick={() => { setEditingOrder(selectedOrder); setSelectedOrder(null); }}
                >
                  <Pencil className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      )}

      {/* Edit Dialog (stepped) */}
      {editingOrder && (
        <Dialog open={!!editingOrder} onOpenChange={(open) => !open && setEditingOrder(null)}>
          <DialogContent className="max-w-3xl max-h-[90vh] overflow-hidden flex flex-col">
            <DialogHeader className="border-b pb-3 flex-shrink-0">
              <DialogTitle>Editar OS #{editingOrder.orderNumber}</DialogTitle>
              <DialogDescription>Atualize as informações da ordem de serviço</DialogDescription>
            </DialogHeader>
            <div className="flex-1 overflow-y-auto py-4">
              <EditOrderForm
                order={editingOrder}
                onSuccess={() => { setEditingOrder(null); loadOrders(); }}
                onCancel={() => setEditingOrder(null)}
              />
            </div>
          </DialogContent>
        </Dialog>
      )}

      {/* Delete Confirmation */}
      <AlertDialog open={!!deletingOrder} onOpenChange={(open) => !open && setDeletingOrder(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirmar Exclusão</AlertDialogTitle>
            <AlertDialogDescription>
              Tem certeza que deseja excluir a OS #{deletingOrder?.orderNumber}? Esta ação não pode ser desfeita.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              Excluir
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </DashboardLayout>
  );
}

// ─── CreateOrderForm ─────────────────────────────────────────────────────────

function CreateOrderForm({ userId, onSuccess }: { userId?: string; onSuccess: () => void }) {
  const [loading, setLoading] = useState(false);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [departments, setDepartments] = useState<Department[]>([]);
  const [customerOpen, setCustomerOpen] = useState(false);
  const [departmentOpen, setDepartmentOpen] = useState(false);
  const [showNewCustomer, setShowNewCustomer] = useState(false);
  const [currentEmployee, setCurrentEmployee] = useState<Employee | null>(null);
  const [formData, setFormData] = useState({
    customerId: "",
    productType: "",
    productBrand: "",
    productModel: "",
    serialNumber: "",
    aestheticConditions: "",
    problemDescription: "",
    departmentId: "",
    images: [] as Image[],
    newCustomer: { name: "", cpf: "", phone: "", email: "" },
  });

  useEffect(() => {
    api.listCustomers({ page: 1, limit: 200 }).then((r) => setCustomers(r.customers || [])).catch(() => {});
    api.listDepartments({ isActive: true }).then((r) => {
      setDepartments(r.departments || []);
    }).catch(() => {});
    if (userId) {
      api.listEmployees().then((r) => {
        const emp = (r.employees || []).find((e: Employee) => e.userId === userId);
        if (emp) {
          setCurrentEmployee(emp);
          if (emp.departmentId) {
            setFormData((prev) => ({ ...prev, departmentId: emp.departmentId! }));
          }
        }
      }).catch(() => {});
    }
  }, [userId]);

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
        payload.customer = {
          name: formData.newCustomer.name,
          phone: formData.newCustomer.phone.replace(/\D/g, ""),
          cpf: formData.newCustomer.cpf.replace(/\D/g, "") || "",
          email: formData.newCustomer.email || "",
        };
      } else if (formData.customerId) {
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
      {/* Cliente */}
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <Label>Cliente *</Label>
          <Button type="button" variant="ghost" size="sm" onClick={() => { setShowNewCustomer(!showNewCustomer); setFormData({ ...formData, customerId: "" }); }}>
            <UserPlus className="mr-1 h-4 w-4" />
            {showNewCustomer ? "Selecionar existente" : "Cliente avulso"}
          </Button>
        </div>

        {showNewCustomer ? (
          <div className="space-y-3 p-4 border rounded-md bg-muted/30">
            <div className="space-y-2">
              <Label htmlFor="nc-name">Nome *</Label>
              <Input id="nc-name" value={formData.newCustomer.name} onChange={(e) => setFormData({ ...formData, newCustomer: { ...formData.newCustomer, name: e.target.value } })} required={showNewCustomer} />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label htmlFor="nc-phone">Telefone *</Label>
                <Input
                  id="nc-phone"
                  value={formatPhone(formData.newCustomer.phone)}
                  onChange={(e) => {
                    const raw = e.target.value.replace(/\D/g, "");
                    if (raw.length <= 11) setFormData({ ...formData, newCustomer: { ...formData.newCustomer, phone: raw } });
                  }}
                  placeholder="(00) 00000-0000"
                  required={showNewCustomer}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="nc-cpf">CPF (opcional)</Label>
                <Input
                  id="nc-cpf"
                  value={formatCPF(formData.newCustomer.cpf)}
                  onChange={(e) => {
                    const raw = e.target.value.replace(/\D/g, "");
                    if (raw.length <= 11) setFormData({ ...formData, newCustomer: { ...formData.newCustomer, cpf: raw } });
                  }}
                  placeholder="000.000.000-00"
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="nc-email">Email <span className="text-xs text-muted-foreground">(opcional)</span></Label>
              <Input id="nc-email" type="email" value={formData.newCustomer.email} onChange={(e) => setFormData({ ...formData, newCustomer: { ...formData.newCustomer, email: e.target.value } })} />
            </div>
          </div>
        ) : (
          <Popover open={customerOpen} onOpenChange={setCustomerOpen}>
            <PopoverTrigger asChild>
              <Button variant="outline" role="combobox" className="w-full justify-between">
                {selectedCustomer ? `${selectedCustomer.name} — ${formatPhone(selectedCustomer.phone)}` : "Selecione um cliente..."}
                <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-[var(--radix-popover-trigger-width)] p-0" align="start">
              <Command>
                <CommandInput placeholder="Buscar por nome, telefone ou CPF..." className="h-9" />
                <CommandList className="max-h-[200px]">
                  <CommandEmpty>Nenhum cliente encontrado.</CommandEmpty>
                  <CommandGroup>
                    {customers.map((c) => (
                      <CommandItem key={c.id} value={`${c.name} ${c.phone} ${c.cpf || ""} ${c.email || ""}`} onSelect={() => { setFormData({ ...formData, customerId: c.id }); setCustomerOpen(false); }}>
                        <Check className={cn("mr-2 h-4 w-4", formData.customerId === c.id ? "opacity-100" : "opacity-0")} />
                        <div>
                          <p className="font-medium">{c.name}</p>
                          <p className="text-xs text-muted-foreground">{formatPhone(c.phone)} {c.cpf && `• ${formatCPF(c.cpf)}`}</p>
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

      {/* Equipamento */}
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label>Tipo *</Label>
          <Input placeholder="Ex: Console, Notebook..." value={formData.productType} onChange={(e) => setFormData({ ...formData, productType: e.target.value })} required />
        </div>
        <div className="space-y-2">
          <Label>Marca *</Label>
          <Input placeholder="Ex: Sony, Samsung..." value={formData.productBrand} onChange={(e) => setFormData({ ...formData, productBrand: e.target.value })} required />
        </div>
        <div className="space-y-2">
          <Label>Modelo *</Label>
          <Input placeholder="Ex: PS5 CFI-114A" value={formData.productModel} onChange={(e) => setFormData({ ...formData, productModel: e.target.value })} required />
        </div>
        <div className="space-y-2">
          <Label>Número de Série</Label>
          <Input placeholder="Ex: AK914195243" value={formData.serialNumber} onChange={(e) => setFormData({ ...formData, serialNumber: e.target.value })} />
        </div>
      </div>

      <div className="space-y-2">
        <Label>Condições Estéticas</Label>
        <Textarea placeholder="Ex: Carenagem suja, lacre de fábrica..." value={formData.aestheticConditions} onChange={(e) => setFormData({ ...formData, aestheticConditions: e.target.value })} rows={2} />
      </div>

      <div className="space-y-2">
        <Label>Defeitos Relatados *</Label>
        <Textarea placeholder="Descreva os defeitos relatados pelo cliente..." value={formData.problemDescription} onChange={(e) => setFormData({ ...formData, problemDescription: e.target.value })} required rows={3} />
      </div>

      {/* Departamento */}
      <div className="space-y-2">
        <Label>Departamento *
          {currentEmployee?.departmentId && (
            <span className="ml-2 text-xs text-muted-foreground">(preenchido com seu departamento)</span>
          )}
        </Label>
        <Popover open={departmentOpen} onOpenChange={setDepartmentOpen}>
          <PopoverTrigger asChild>
            <Button variant="outline" role="combobox" className="w-full justify-between">
              {selectedDepartment ? selectedDepartment.name : "Selecione um departamento..."}
              <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-[var(--radix-popover-trigger-width)] p-0" align="start">
            <Command>
              <CommandInput placeholder="Buscar departamento..." className="h-9" />
              <CommandList className="max-h-[200px]">
                <CommandEmpty>Nenhum departamento encontrado.</CommandEmpty>
                <CommandGroup>
                  {departments.map((d) => (
                    <CommandItem key={d.id} value={`${d.name} ${d.description || ""}`} onSelect={() => { setFormData({ ...formData, departmentId: d.id }); setDepartmentOpen(false); }}>
                      <Check className={cn("mr-2 h-4 w-4", formData.departmentId === d.id ? "opacity-100" : "opacity-0")} />
                      <div>
                        <p className="font-medium">{d.name}</p>
                        {d.description && <p className="text-xs text-muted-foreground">{d.description}</p>}
                      </div>
                    </CommandItem>
                  ))}
                </CommandGroup>
              </CommandList>
            </Command>
          </PopoverContent>
        </Popover>
      </div>

      {/* Fotos */}
      <div className="space-y-2">
        <Label>Fotos (opcional)</Label>
        <ImageUpload
          images={formData.images}
          onChange={(images) => setFormData({ ...formData, images })}
          maxImages={5}
        />
      </div>

      <div className="flex justify-end pt-2 border-t">
        <Button type="submit" disabled={loading}>
          {loading ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Criando...</> : "Criar Ordem"}
        </Button>
      </div>
    </form>
  );
}

// ─── EditOrderForm (stepped) ─────────────────────────────────────────────────

const EDIT_STEPS = [
  { id: "equipment", label: "Equipamento" },
  { id: "diagnosis", label: "Diagnóstico" },
  { id: "services", label: "Serviços" },
  { id: "payment", label: "Pagamento" },
  { id: "status", label: "Status" },
  { id: "finalize", label: "Finalização" },
];

function EditOrderForm({ order, onSuccess, onCancel }: { order: ServiceOrder; onSuccess: () => void; onCancel: () => void }) {
  const [loading, setLoading] = useState(false);
  const [step, setStep] = useState(0);
  const [serviceItems, setServiceItems] = useState<ServiceItem[]>(order.serviceItems ?? []);
  const [formData, setFormData] = useState({
    serialNumber: order.serialNumber ?? "",
    aestheticConditions: order.aestheticConditions ?? "",
    technicalReport: order.technicalReport ?? "",
    solution: order.solution ?? "",
    warrantyTerms: order.warrantyTerms ?? "",
    observations: order.observations ?? "",
    finalCost: order.finalCost?.toString() ?? "",
    paymentMethod: order.payment?.method ?? "",
    paymentObservation: order.payment?.observation ?? "",
    paymentPaid: order.payment?.paid ?? false,
    exitDate: order.exitDate ? new Date(order.exitDate).toISOString().split("T")[0] : "",
    deliveryType: order.delivery?.type ?? "none",
    deliveryCost: order.delivery?.cost?.toString() ?? "",
    deliveryDistanceKm: order.delivery?.distanceKm?.toString() ?? "",
    deliveryObservations: order.delivery?.observations ?? "",
    newStatus: order.status,
    statusNote: "",
  });

  const totalServiceItems = serviceItems.reduce((s, i) => s + i.quantity * i.unitPrice, 0);

  const handleSubmit = async () => {
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

      // Update status if changed
      if (formData.newStatus !== order.status) {
        await api.updateServiceOrderStatus(order.id, { status: formData.newStatus, notes: formData.statusNote || undefined });
      }

      toast.success("Ordem de serviço atualizada!");
      onSuccess();
    } catch (error: any) {
      toast.error(error.message || "Erro ao atualizar ordem");
    } finally {
      setLoading(false);
    }
  };

  const addItem = () => setServiceItems([...serviceItems, { name: "", quantity: 1, unitPrice: 0 }]);
  const removeItem = (i: number) => setServiceItems(serviceItems.filter((_, idx) => idx !== i));
  const updateItem = (i: number, field: keyof ServiceItem, val: string | number) =>
    setServiceItems(serviceItems.map((item, idx) => idx === i ? { ...item, [field]: val } : item));

  return (
    <div className="space-y-6">
      {/* Step indicator */}
      <div className="flex items-center gap-1 overflow-x-auto pb-1">
        {EDIT_STEPS.map((s, i) => (
          <button
            key={s.id}
            type="button"
            onClick={() => setStep(i)}
            className={cn(
              "flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium whitespace-nowrap transition-colors",
              i === step
                ? "bg-primary text-primary-foreground"
                : i < step
                  ? "bg-muted text-muted-foreground"
                  : "text-muted-foreground hover:text-foreground"
            )}
          >
            <span className={cn(
              "w-4 h-4 rounded-full flex items-center justify-center text-[10px] font-bold",
              i === step ? "bg-primary-foreground/20 text-primary-foreground" :
              i < step ? "bg-green-500 text-white" : "bg-muted-foreground/20"
            )}>
              {i < step ? "✓" : i + 1}
            </span>
            {s.label}
          </button>
        ))}
      </div>

      <Separator />

      {/* Step 0: Equipamento */}
      {step === 0 && (
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Número de Série</Label>
              <Input placeholder="Ex: AK914195243" value={formData.serialNumber} onChange={(e) => setFormData({ ...formData, serialNumber: e.target.value })} />
            </div>
          </div>
          <div className="space-y-2">
            <Label>Condições Estéticas</Label>
            <Textarea placeholder="Descreva as condições estéticas..." value={formData.aestheticConditions} onChange={(e) => setFormData({ ...formData, aestheticConditions: e.target.value })} rows={3} />
          </div>
          <div className="bg-muted/30 rounded-md p-3 text-sm">
            <p className="font-medium">{order.productBrand} {order.productModel}</p>
            <p className="text-muted-foreground text-xs mt-1">{order.productType} • OS #{order.orderNumber}</p>
            <p className="text-muted-foreground text-xs mt-1"><strong>Defeito:</strong> {order.problemDescription}</p>
          </div>
        </div>
      )}

      {/* Step 1: Diagnóstico */}
      {step === 1 && (
        <div className="space-y-4">
          <div className="space-y-2">
            <Label>Laudo Técnico</Label>
            <Textarea placeholder="Descreva o laudo técnico detalhado..." value={formData.technicalReport} onChange={(e) => setFormData({ ...formData, technicalReport: e.target.value })} rows={5} />
          </div>
          <div className="space-y-2">
            <Label>Solução Proposta / Executada</Label>
            <Textarea placeholder="Descreva a solução que será ou foi executada..." value={formData.solution} onChange={(e) => setFormData({ ...formData, solution: e.target.value })} rows={4} />
          </div>
        </div>
      )}

      {/* Step 2: Serviços */}
      {step === 2 && (
        <div className="space-y-4">
          {serviceItems.map((item, i) => (
            <div key={i} className="flex gap-2 items-end">
              <div className="flex-1 space-y-1">
                <Label className="text-xs">Serviço/Peça</Label>
                <Input placeholder="Nome do serviço" value={item.name} onChange={(e) => updateItem(i, "name", e.target.value)} />
              </div>
              <div className="w-16 space-y-1">
                <Label className="text-xs">Qtd</Label>
                <Input type="number" min="0.01" step="0.01" value={item.quantity} onChange={(e) => updateItem(i, "quantity", parseFloat(e.target.value) || 1)} />
              </div>
              <div className="w-28 space-y-1">
                <Label className="text-xs">Valor (R$)</Label>
                <Input type="number" min="0" step="0.01" value={item.unitPrice} onChange={(e) => updateItem(i, "unitPrice", parseFloat(e.target.value) || 0)} />
              </div>
              <Button type="button" variant="ghost" size="icon" onClick={() => removeItem(i)}>
                <X className="h-4 w-4 text-destructive" />
              </Button>
            </div>
          ))}
          <Button type="button" variant="outline" size="sm" onClick={addItem}>
            <Plus className="mr-2 h-4 w-4" /> Adicionar
          </Button>
          {totalServiceItems > 0 && (
            <div className="bg-muted rounded-md px-4 py-2 flex justify-between text-sm font-medium">
              <span>Total dos serviços</span>
              <span>R$ {totalServiceItems.toFixed(2).replace(".", ",")}</span>
            </div>
          )}
        </div>
      )}

      {/* Step 3: Pagamento */}
      {step === 3 && (
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
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
              <Input type="number" min="0" step="0.01" placeholder="0,00" value={formData.finalCost} onChange={(e) => setFormData({ ...formData, finalCost: e.target.value })} />
            </div>
          </div>
          <div className="space-y-2">
            <Label>Obs. do Pagamento</Label>
            <Input placeholder="Ex: PAGO ASS DIEGO" value={formData.paymentObservation} onChange={(e) => setFormData({ ...formData, paymentObservation: e.target.value })} />
          </div>
          <div className="flex items-center gap-2">
            <input type="checkbox" id="paid" checked={formData.paymentPaid} onChange={(e) => setFormData({ ...formData, paymentPaid: e.target.checked })} className="h-4 w-4 rounded" />
            <Label htmlFor="paid">Pagamento confirmado</Label>
          </div>
          <Separator />
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
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Distância (km)</Label>
                <Input type="number" min="0" step="0.1" value={formData.deliveryDistanceKm} onChange={(e) => setFormData({ ...formData, deliveryDistanceKm: e.target.value })} />
              </div>
              <div className="space-y-2">
                <Label>Custo da Entrega (R$)</Label>
                <Input type="number" min="0" step="0.01" value={formData.deliveryCost} onChange={(e) => setFormData({ ...formData, deliveryCost: e.target.value })} />
              </div>
              <div className="col-span-2 space-y-2">
                <Label>Obs. da Entrega</Label>
                <Input placeholder="Instruções de entrega..." value={formData.deliveryObservations} onChange={(e) => setFormData({ ...formData, deliveryObservations: e.target.value })} />
              </div>
            </div>
          )}
        </div>
      )}

      {/* Step 4: Status */}
      {step === 4 && (
        <div className="space-y-4">
          <div className="space-y-2">
            <Label>Alterar Status</Label>
            <div className="grid grid-cols-2 gap-2">
              {(Object.entries(statusLabels) as [ServiceOrderStatus, string][]).map(([value, label]) => (
                <button
                  key={value}
                  type="button"
                  onClick={() => setFormData({ ...formData, newStatus: value })}
                  className={cn(
                    "px-3 py-2 rounded-md text-sm font-medium text-left border transition-colors",
                    formData.newStatus === value
                      ? "border-primary bg-primary/10 text-primary"
                      : "border-border hover:bg-muted"
                  )}
                >
                  <span className={`inline-block w-2 h-2 rounded-full mr-2 ${statusColors[value].split(" ")[0]}`} />
                  {label}
                </button>
              ))}
            </div>
          </div>
          {formData.newStatus !== order.status && (
            <div className="space-y-2">
              <Label>Motivo da mudança <span className="text-xs text-muted-foreground">(opcional)</span></Label>
              <Textarea placeholder="Descreva o motivo da alteração do status..." value={formData.statusNote} onChange={(e) => setFormData({ ...formData, statusNote: e.target.value })} rows={3} />
            </div>
          )}
          {formData.newStatus === order.status && (
            <div className="bg-muted/30 rounded-md px-3 py-2 text-sm text-muted-foreground">
              Status atual: <span className={`font-medium px-2 py-0.5 rounded-full text-xs ${statusColors[order.status]}`}>{statusLabels[order.status]}</span>
            </div>
          )}
        </div>
      )}

      {/* Step 5: Finalização */}
      {step === 5 && (
        <div className="space-y-4">
          <div className="space-y-2">
            <Label>Data de Saída</Label>
            <Input type="date" value={formData.exitDate} onChange={(e) => setFormData({ ...formData, exitDate: e.target.value })} />
          </div>
          <div className="space-y-2">
            <Label>Termos de Garantia</Label>
            <Textarea placeholder="Termos e condições de garantia..." value={formData.warrantyTerms} onChange={(e) => setFormData({ ...formData, warrantyTerms: e.target.value })} rows={4} />
          </div>
          <div className="space-y-2">
            <Label>Observações Finais</Label>
            <Textarea placeholder="Observações gerais..." value={formData.observations} onChange={(e) => setFormData({ ...formData, observations: e.target.value })} rows={2} />
          </div>
        </div>
      )}

      {/* Navigation */}
      <div className="flex justify-between pt-4 border-t">
        <div className="flex gap-2">
          <Button type="button" variant="outline" onClick={onCancel} disabled={loading}>Cancelar</Button>
          {step > 0 && (
            <Button type="button" variant="outline" onClick={() => setStep(step - 1)}>
              <ChevronLeft className="mr-1 h-4 w-4" /> Anterior
            </Button>
          )}
        </div>
        <div className="flex gap-2">
          {step < EDIT_STEPS.length - 1 ? (
            <Button type="button" onClick={() => setStep(step + 1)}>
              Próximo <ChevronRight className="ml-1 h-4 w-4" />
            </Button>
          ) : (
            <Button type="button" onClick={handleSubmit} disabled={loading}>
              {loading ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Salvando...</> : "Salvar Alterações"}
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}
