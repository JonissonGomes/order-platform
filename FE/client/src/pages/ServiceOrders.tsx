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
import { formatPhone, formatCPF, formatCurrency, unformatCurrency, formatCEP } from "@/lib/formatters";
import { fetchCEP } from "@/lib/cep";
import { ImageUpload } from "@/components/ImageUpload";
import { useAuth } from "@/_core/hooks/useAuth";
import { usePermissions } from "@/lib/permissions";
import type { ServiceOrder, ServiceOrderStatus, Customer, Department, Employee, Image, ServiceItem } from "@/types";
import {
  Plus, Search, FileText, Check, ChevronsUpDown, UserPlus,
  Filter, Trash2, Printer, X, Loader2, ChevronLeft, ChevronRight, Pencil,
  Copy, ExternalLink, RefreshCw, Lock,
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

// Valid status transitions (mirrors backend logic)
const VALID_STATUS_TRANSITIONS: Record<ServiceOrderStatus, ServiceOrderStatus[]> = {
  pending:       ["evaluating", "cancelled"],
  evaluating:    ["approved", "cancelled"],
  approved:      ["waiting_parts", "in_repair", "cancelled"],
  waiting_parts: ["in_repair", "cancelled"],
  in_repair:     ["testing", "waiting_parts", "cancelled"],
  testing:       ["ready", "in_repair", "cancelled"],
  ready:         ["delivered", "cancelled"],
  delivered:     [],
  cancelled:     [],
};

export default function ServiceOrders() {
  const { user } = useAuth();
  const permissions = usePermissions("/service-orders");
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
            {permissions.canCreate && (
              <DialogTrigger asChild>
                <Button><Plus className="mr-2 h-4 w-4" />Nova Ordem</Button>
              </DialogTrigger>
            )}
            <DialogContent className="max-w-2xl max-h-[90vh] flex flex-col">
              <DialogHeader className="px-6 pt-6 pb-4 border-b">
                <DialogTitle className="text-xl">Nova Ordem de Serviço</DialogTitle>
                <DialogDescription className="mt-1.5">Preencha os dados para criar uma nova ordem</DialogDescription>
              </DialogHeader>
              <div className="flex-1 overflow-y-auto px-6 py-6">
                <CreateOrderForm
                  userEmail={user?.email}
                  userId={user?.id}
                  userType={user?.type}
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
                  <TableHead className="w-[120px]">Ordem</TableHead>
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
                        {permissions.canEdit && (
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8"
                            title="Editar"
                            onClick={() => { setEditingOrder(order); setSelectedOrder(null); }}
                          >
                            <Pencil className="h-4 w-4" />
                          </Button>
                        )}
                        {permissions.canDelete && (order.status === "pending" || order.status === "cancelled") && (
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
          <DialogContent className="max-w-lg max-h-[90vh] flex flex-col">
            <DialogHeader className="px-6 pt-6 pb-4 border-b">
              <div className="flex items-center justify-between">
                <div>
                  <DialogTitle className="text-xl font-mono font-semibold">Ordem #{selectedOrder.orderNumber}</DialogTitle>
                  <DialogDescription className="mt-1.5 text-sm">{selectedOrder.productBrand} {selectedOrder.productModel} • {selectedOrder.productType}</DialogDescription>
                </div>
                <span className={`px-3 py-1 rounded-full text-xs font-medium ${statusColors[selectedOrder.status]}`}>
                  {statusLabels[selectedOrder.status]}
                </span>
              </div>
            </DialogHeader>
            <div className="flex-1 overflow-y-auto px-6 py-6">
              <div className="space-y-4 text-sm">
              {selectedOrder.customer && (
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-xs text-muted-foreground font-medium uppercase tracking-wide mb-1">Cliente</p>
                    <p className="mt-1 font-medium text-base">{selectedOrder.customer.name}</p>
                  </div>
                  {selectedOrder.customer.phone && (
                    <div>
                      <p className="text-xs text-muted-foreground font-medium uppercase tracking-wide mb-1">Telefone</p>
                      <p className="mt-1 text-base">{formatPhone(selectedOrder.customer.phone)}</p>
                    </div>
                  )}
                </div>
              )}
              <Separator />
              <div>
                <p className="text-xs text-muted-foreground font-medium uppercase tracking-wide mb-1">Defeito Relatado</p>
                <p className="mt-1 text-muted-foreground text-base">{selectedOrder.problemDescription || "Não informado"}</p>
              </div>
              {selectedOrder.technicalReport && (
                <>
                  <Separator />
                  <div>
                    <p className="text-xs text-muted-foreground font-medium uppercase tracking-wide mb-1">Laudo Técnico</p>
                    <p className="mt-1 text-muted-foreground text-base">{selectedOrder.technicalReport}</p>
                  </div>
                </>
              )}
              {selectedOrder.serviceItems && selectedOrder.serviceItems.length > 0 && (
                <>
                  <Separator />
                  <div>
                    <p className="text-xs text-muted-foreground font-medium uppercase tracking-wide mb-2">Serviços</p>
                    <div className="space-y-2">
                      {selectedOrder.serviceItems.map((item, i) => (
                        <div key={i} className="flex justify-between text-sm bg-muted rounded-lg px-3 py-2">
                          <span className="font-medium">{item.name} × {item.quantity}</span>
                          <span className="font-semibold">R$ {(item.quantity * item.unitPrice).toFixed(2).replace(".", ",")}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                </>
              )}
              <Separator />
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-xs text-muted-foreground font-medium uppercase tracking-wide mb-1">Entrada</p>
                  <p className="mt-1 text-base">{new Date(selectedOrder.entryDate ?? selectedOrder.createdAt).toLocaleDateString("pt-BR")}</p>
                </div>
                {selectedOrder.exitDate && (
                  <div>
                    <p className="text-xs text-muted-foreground font-medium uppercase tracking-wide mb-1">Saída</p>
                    <p className="mt-1 text-base">{new Date(selectedOrder.exitDate).toLocaleDateString("pt-BR")}</p>
                  </div>
                )}
              </div>
              {selectedOrder.payment?.paid && (
                <div className="bg-green-50 border border-green-200 rounded-lg px-4 py-3 text-sm text-green-800 font-medium flex items-center gap-2">
                  <Check className="h-4 w-4" />
                  <span>Pagamento confirmado {selectedOrder.payment.method && `— ${selectedOrder.payment.method.toUpperCase()}`}</span>
                </div>
              )}
              </div>
            </div>
            <div className="px-6 py-4 border-t bg-muted/30 flex justify-between items-center">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => window.open(`/print/order/${selectedOrder.id}`, "_blank")}
              >
                <Printer className="h-4 w-4 mr-1" /> Imprimir
              </Button>
              <div className="flex gap-1">
                {permissions.canDelete && (selectedOrder.status === "pending" || selectedOrder.status === "cancelled") && (
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
                {permissions.canEdit && (
                  <Button
                    variant="ghost"
                    size="icon"
                    title="Editar"
                    onClick={() => { setEditingOrder(selectedOrder); setSelectedOrder(null); }}
                  >
                    <Pencil className="h-4 w-4" />
                  </Button>
                )}
              </div>
            </div>
          </DialogContent>
        </Dialog>
      )}

      {/* Edit Dialog (stepped) */}
      {editingOrder && (
        <EditOrderDialog
          order={editingOrder}
          onClose={() => setEditingOrder(null)}
          onSuccess={() => { setEditingOrder(null); loadOrders(); }}
        />
      )}

      {/* Delete Confirmation */}
      <AlertDialog open={!!deletingOrder} onOpenChange={(open) => !open && setDeletingOrder(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirmar Exclusão</AlertDialogTitle>
            <AlertDialogDescription>
              Tem certeza que deseja excluir a Ordem #{deletingOrder?.orderNumber}? Esta ação não pode ser desfeita.
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

function CreateOrderForm({ userId, userEmail, userType, onSuccess }: { userId?: string; userEmail?: string; userType?: string; onSuccess: () => void }) {
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
    if (userId && userType === "employee") {
      // Try to get employee by id first
      api.getEmployee(userId).then((r) => {
        setCurrentEmployee(r.employee);
        if (r.employee.departmentId) {
          setFormData((prev) => ({ ...prev, departmentId: r.employee.departmentId! }));
        }
      }).catch(() => {
        // Fallback to list search by email or id
        api.listEmployees().then((r) => {
          const emp = (r.employees || []).find((e: Employee) => e.email === userEmail || e.id === userId);
          if (emp) {
            setCurrentEmployee(emp);
            if (emp.departmentId) {
              setFormData((prev) => ({ ...prev, departmentId: emp.departmentId! }));
            }
          }
        }).catch(() => {});
      });
    }
  }, [userId, userEmail, userType]);

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
          value={formData.images}
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
  { id: "delivery", label: "Entrega" },
  { id: "status", label: "Status" },
  { id: "finalize", label: "Finalização" },
];

function EditOrderDialog({ order, onClose, onSuccess }: { order: ServiceOrder; onClose: () => void; onSuccess: () => void }) {
  const [showCloseConfirm, setShowCloseConfirm] = useState(false);

  const handleDialogClose = (open: boolean) => {
    if (!open) {
      setShowCloseConfirm(true);
    }
  };

  const confirmClose = () => {
    setShowCloseConfirm(false);
    onClose();
  };

  return (
    <>
      <Dialog open={true} onOpenChange={handleDialogClose}>
        <DialogContent 
          className="max-w-5xl max-h-[90vh] flex flex-col"
          onInteractOutside={(e) => {
            e.preventDefault();
            setShowCloseConfirm(true);
          }}
          onEscapeKeyDown={(e) => {
            e.preventDefault();
            setShowCloseConfirm(true);
          }}
        >
          <DialogHeader className="px-6 pt-6 pb-4 border-b">
            <DialogTitle className="text-xl">Editar Ordem #{order.orderNumber}</DialogTitle>
            <DialogDescription className="mt-1.5">Atualize as informações da ordem de serviço</DialogDescription>
          </DialogHeader>
          <div className="flex-1 overflow-y-auto px-6 py-6">
            <EditOrderForm
              order={order}
              onSuccess={onSuccess}
              onCancel={onClose}
            />
          </div>
        </DialogContent>
      </Dialog>
      <AlertDialog open={showCloseConfirm} onOpenChange={setShowCloseConfirm}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirmar Fechamento</AlertDialogTitle>
            <AlertDialogDescription>
              Todas as informações preenchidas serão perdidas. Deseja realmente fechar?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setShowCloseConfirm(false)}>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={confirmClose} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              Fechar
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}

function EditOrderForm({ order, onSuccess, onCancel }: { order: ServiceOrder; onSuccess: () => void; onCancel: () => void }) {
  const [loading, setLoading] = useState(false);
  const [step, setStep] = useState(0);
  const [serviceItems, setServiceItems] = useState<ServiceItem[]>(order.serviceItems ?? []);
  const [paymentLink, setPaymentLink] = useState<string | null>(null);
  const [generatingLink, setGeneratingLink] = useState(false);
  const [settings, setSettings] = useState<any>(null);
  const [cepLoading, setCepLoading] = useState(false);
  const [deliveryAddress, setDeliveryAddress] = useState({
    zipCode: order.delivery?.address?.zipCode?.replace(/\D/g, "") || "",
    street: order.delivery?.address?.street || "",
    number: order.delivery?.address?.number || "",
    complement: order.delivery?.address?.complement || "",
    neighborhood: order.delivery?.address?.neighborhood || "",
    city: order.delivery?.address?.city || "",
    state: order.delivery?.address?.state || "",
  });
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
    images: order.images ?? [],
  });

  const totalServiceItems = serviceItems.reduce((s, i) => s + i.quantity * i.unitPrice, 0);

  useEffect(() => {
    const loadSettings = async () => {
      try {
        const { settings: loadedSettings } = await api.getSettings();
        setSettings(loadedSettings);
        if (loadedSettings?.warrantyTerms && !formData.warrantyTerms) {
          setFormData(prev => ({ ...prev, warrantyTerms: loadedSettings.warrantyTerms || "" }));
        }
      } catch {
        // Silently fail
      }
    };
    loadSettings();
  }, []);


  const calculateDeliveryCost = async (zipCode: string) => {
    if (!zipCode || zipCode.replace(/\D/g, "").length !== 8) return;
    if (!settings?.deliveryCostPerKm) {
      toast.error("Custo por km não configurado nas configurações");
      return;
    }
    // Aqui você pode implementar cálculo de distância usando API de geolocalização
    // Por enquanto, vamos usar um valor fixo ou deixar o usuário informar
    toast.info("Cálculo de distância será implementado com API de geolocalização");
  };

  const handleCEPSearch = async (cep: string) => {
    const raw = cep.replace(/\D/g, "");
    if (raw.length !== 8) return;
    setCepLoading(true);
    try {
      const data = await fetchCEP(raw);
      if (data) {
        setDeliveryAddress(prev => ({
          ...prev,
          street: data.street || prev.street,
          neighborhood: data.neighborhood || prev.neighborhood,
          city: data.city || prev.city,
          state: data.state || prev.state,
        }));
        await calculateDeliveryCost(raw);
      }
    } catch {
      toast.error("CEP não encontrado");
    } finally {
      setCepLoading(false);
    }
  };

  const validateStep = (currentStep: number): boolean => {
    switch (currentStep) {
      case 0: // Equipamento - sempre válido
        return true;
      case 1: // Diagnóstico - sempre válido
        return true;
      case 2: // Serviços - sempre válido
        return true;
      case 3: // Pagamento - sempre válido
        return true;
      case 4: // Entrega
        if (formData.deliveryType !== "none") {
          if (!deliveryAddress.zipCode || deliveryAddress.zipCode.replace(/\D/g, "").length !== 8) {
            toast.error("Informe um CEP válido para entrega");
            return false;
          }
        }
        return true;
      case 5: // Status - sempre válido
        return true;
      case 6: // Finalização - só aparece se status for delivered
        return formData.newStatus === "delivered";
      default:
        return true;
    }
  };

  const handleNextStep = () => {
    if (validateStep(step)) {
      const maxStep = formData.newStatus === "delivered" ? EDIT_STEPS.length - 1 : EDIT_STEPS.length - 2;
      if (step < maxStep) {
        setStep(step + 1);
      }
    }
  };

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
          cost: formData.deliveryCost && formData.deliveryCost !== "" ? unformatCurrency(formData.deliveryCost) : undefined,
          distanceKm: formData.deliveryDistanceKm ? parseFloat(formData.deliveryDistanceKm) : 0,
          address: deliveryAddress.zipCode ? {
            zipCode: deliveryAddress.zipCode,
            street: deliveryAddress.street,
            number: deliveryAddress.number,
            complement: deliveryAddress.complement,
            neighborhood: deliveryAddress.neighborhood,
            city: deliveryAddress.city,
            state: deliveryAddress.state,
          } : undefined,
          observations: formData.deliveryObservations || undefined,
        } : undefined,
        exitDate: formData.exitDate ? new Date(formData.exitDate).toISOString() : undefined,
      };

      // Update status first if changed, then update other fields
      if (formData.newStatus !== order.status) {
        await api.updateServiceOrderStatus(order.id, { status: formData.newStatus, notes: formData.statusNote || undefined });
      }
      
      // Then update other fields
      await api.updateServiceOrder(order.id, payload);

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

  const handleGeneratePaymentLink = async () => {
    if (!order.customerId) {
      toast.error("Cliente não encontrado na ordem");
      return;
    }
    if (!formData.finalCost || parseFloat(formData.finalCost) <= 0) {
      toast.error("Informe o valor final para gerar o link de pagamento");
      return;
    }

    try {
      setGeneratingLink(true);
      const response = await api.createPayment({
        amount: parseFloat(formData.finalCost),
        currency: "BRL",
        description: `Pagamento da Ordem de Serviço #${order.orderNumber}`,
        orderId: order.id,
        customerId: order.customerId,
        metadata: {
          orderNumber: order.orderNumber,
        },
      });
      setPaymentLink(response.payment.paymentLink);
      toast.success("Link de pagamento gerado com sucesso!");
    } catch (error: any) {
      toast.error(error.message || "Erro ao gerar link de pagamento");
    } finally {
      setGeneratingLink(false);
    }
  };

  const handleCopyPaymentLink = () => {
    if (paymentLink) {
      navigator.clipboard.writeText(paymentLink);
      toast.success("Link copiado para a área de transferência!");
    }
  };

  const handleCheckPaymentStatus = async () => {
    // This would be called after payment is completed via webhook
    // For now, we'll just refresh the order data
    toast.info("Verificando status do pagamento...");
    onSuccess();
  };
  const updateItem = (i: number, field: keyof ServiceItem, val: string | number) =>
    setServiceItems(serviceItems.map((item, idx) => idx === i ? { ...item, [field]: val } : item));

  // Filter steps based on status - Finalização only shows if status is delivered
  const visibleSteps = formData.newStatus === "delivered" 
    ? EDIT_STEPS 
    : EDIT_STEPS.filter((s) => s.id !== "finalize");

  return (
    <div className="space-y-6">
      {/* Step indicator */}
      <div className="relative">
        <div className="flex items-center gap-2 overflow-x-auto pb-2 px-1">
          {EDIT_STEPS.map((s, i) => {
            const isFinalizeStep = s.id === "finalize";
            const isHidden = isFinalizeStep && formData.newStatus !== "delivered";
            const isVisible = !isHidden;
            const isActive = i === step;
            const isCompleted = i < step;
            const isClickable = isVisible && (isCompleted || i === step || (i === step + 1 && validateStep(step)));

            return (
              <div key={s.id} className="flex items-center gap-2 flex-shrink-0">
                <button
                  type="button"
                  onClick={() => {
                    if (isClickable) {
                      setStep(i);
                    }
                  }}
                  disabled={!isClickable}
                  className={cn(
                    "relative flex items-center gap-2 px-4 py-2.5 rounded-lg text-sm font-medium whitespace-nowrap transition-all duration-200",
                    isHidden && "opacity-40 cursor-not-allowed",
                    isActive
                      ? "bg-primary text-primary-foreground shadow-md scale-105"
                      : isCompleted
                        ? "bg-green-50 text-green-700 border border-green-200 hover:bg-green-100"
                        : isClickable
                          ? "bg-muted text-muted-foreground hover:bg-muted/80 border border-border"
                          : "bg-muted/50 text-muted-foreground/50 border border-border/50 cursor-not-allowed"
                  )}
                  title={isHidden ? "Este step só aparece quando o status for 'Entregue'" : undefined}
                >
                  <span className={cn(
                    "w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold transition-all",
                    isActive
                      ? "bg-primary-foreground text-primary shadow-sm"
                      : isCompleted
                        ? "bg-green-500 text-white"
                        : "bg-muted-foreground/20 text-muted-foreground"
                  )}>
                    {isCompleted ? "✓" : i + 1}
                  </span>
                  <span className="hidden sm:inline">{s.label}</span>
                  {isHidden && (
                    <div className="absolute -top-1 -right-1 w-4 h-4 bg-orange-100 border border-orange-300 rounded-full flex items-center justify-center" title="Step oculto - só aparece quando status for 'Entregue'">
                      <Lock className="w-2.5 h-2.5 text-orange-600" />
                    </div>
                  )}
                </button>
                {i < EDIT_STEPS.length - 1 && (
                  <div className={cn(
                    "w-8 h-0.5 transition-colors",
                    isCompleted ? "bg-green-500" : "bg-border"
                  )} />
                )}
              </div>
            );
          })}
        </div>
        {formData.newStatus !== "delivered" && (
          <p className="text-xs text-muted-foreground mt-2 px-1 flex items-center gap-1">
            <span className="w-2 h-2 bg-orange-400 rounded-full" />
            O step "Finalização" só aparece quando o status for alterado para "Entregue"
          </p>
        )}
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
            <p className="text-muted-foreground text-xs mt-1">{order.productType} • Ordem #{order.orderNumber}</p>
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
                <Input 
                  value={formatCurrency(item.unitPrice)} 
                  onChange={(e) => {
                    const numValue = unformatCurrency(e.target.value);
                    updateItem(i, "unitPrice", numValue);
                  }}
                  placeholder="R$ 0,00"
                />
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
              <Select value={formData.paymentMethod} onValueChange={(v) => setFormData({ ...formData, paymentMethod: v as "pix" | "cartao" | "dinheiro" | "boleto" })}>
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
          
          {/* Payment Link Section */}
          <Separator />
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <Label>Link de Pagamento</Label>
              <div className="flex gap-2">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={handleGeneratePaymentLink}
                  disabled={generatingLink || !formData.finalCost || parseFloat(formData.finalCost) <= 0}
                >
                  {generatingLink ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Gerando...
                    </>
                  ) : (
                    <>
                      <ExternalLink className="mr-2 h-4 w-4" />
                      Gerar Link
                    </>
                  )}
                </Button>
                {paymentLink && (
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={handleCheckPaymentStatus}
                  >
                    <RefreshCw className="mr-2 h-4 w-4" />
                    Verificar Status
                  </Button>
                )}
              </div>
            </div>
            {paymentLink && (
              <div className="flex items-center gap-2 p-3 bg-muted rounded-md">
                <Input
                  value={paymentLink}
                  readOnly
                  className="flex-1 font-mono text-xs"
                />
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={handleCopyPaymentLink}
                >
                  <Copy className="h-4 w-4" />
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => window.open(paymentLink, "_blank")}
                >
                  <ExternalLink className="h-4 w-4" />
                </Button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Step 4: Entrega */}
      {step === 4 && (
        <div className="space-y-4">
          <div className="space-y-2">
            <Label>Tipo de Entrega</Label>
            <Select value={formData.deliveryType} onValueChange={(v) => setFormData({ ...formData, deliveryType: v as "none" | "own" | "third" })}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="none">Retirada pelo cliente</SelectItem>
                <SelectItem value="own">Entrega própria</SelectItem>
                <SelectItem value="third">Serviço terceirizado</SelectItem>
              </SelectContent>
            </Select>
          </div>
          {formData.deliveryType !== "none" && (
            <div className="space-y-4">
              <div className="space-y-2">
                <Label>CEP de Entrega</Label>
                <div className="flex gap-2">
                  <Input 
                    value={formatCEP(deliveryAddress.zipCode)} 
                    onChange={(e) => {
                      const raw = e.target.value.replace(/\D/g, "");
                      if (raw.length <= 8) {
                        setDeliveryAddress(prev => ({ ...prev, zipCode: raw }));
                        if (raw.length === 8) {
                          handleCEPSearch(raw);
                        }
                      }
                    }}
                    placeholder="00000-000"
                    maxLength={9}
                  />
                  {cepLoading && <Loader2 className="h-4 w-4 animate-spin mt-2" />}
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Rua</Label>
                  <Input value={deliveryAddress.street} onChange={(e) => setDeliveryAddress(prev => ({ ...prev, street: e.target.value }))} />
                </div>
                <div className="space-y-2">
                  <Label>Número</Label>
                  <Input value={deliveryAddress.number} onChange={(e) => setDeliveryAddress(prev => ({ ...prev, number: e.target.value }))} />
                </div>
                <div className="space-y-2">
                  <Label>Bairro</Label>
                  <Input value={deliveryAddress.neighborhood} onChange={(e) => setDeliveryAddress(prev => ({ ...prev, neighborhood: e.target.value }))} />
                </div>
                <div className="space-y-2">
                  <Label>Cidade</Label>
                  <Input value={deliveryAddress.city} onChange={(e) => setDeliveryAddress(prev => ({ ...prev, city: e.target.value }))} />
                </div>
                <div className="space-y-2">
                  <Label>Estado</Label>
                  <Input value={deliveryAddress.state} onChange={(e) => setDeliveryAddress(prev => ({ ...prev, state: e.target.value }))} maxLength={2} />
                </div>
                <div className="space-y-2">
                  <Label>Complemento</Label>
                  <Input value={deliveryAddress.complement} onChange={(e) => setDeliveryAddress(prev => ({ ...prev, complement: e.target.value }))} />
                </div>
              </div>
              {settings?.deliveryCostPerKm && (
                <div className="space-y-2">
                  <Label>Custo da Entrega (R$)</Label>
                  <Input 
                    value={formatCurrency(formData.deliveryCost)} 
                    onChange={(e) => {
                      const numValue = unformatCurrency(e.target.value);
                      setFormData({ ...formData, deliveryCost: numValue.toString() });
                    }}
                    placeholder="R$ 0,00"
                  />
                  <p className="text-xs text-muted-foreground">
                    Custo por km configurado: R$ {settings.deliveryCostPerKm.toFixed(2).replace(".", ",")}
                  </p>
                </div>
              )}
              <div className="space-y-2">
                <Label>Obs. da Entrega</Label>
                <Input placeholder="Instruções de entrega..." value={formData.deliveryObservations} onChange={(e) => setFormData({ ...formData, deliveryObservations: e.target.value })} />
              </div>
            </div>
          )}
        </div>
      )}

      {/* Step 5: Status */}
      {step === 5 && (
        <div className="space-y-4">
          <div className="space-y-2">
            <Label>Status Atual</Label>
            <div className="bg-muted/30 rounded-md px-3 py-2 text-sm">
              <span className={`font-medium px-2 py-0.5 rounded-full text-xs ${statusColors[order.status]}`}>{statusLabels[order.status]}</span>
            </div>
          </div>
          <div className="space-y-2">
            <Label>Alterar Status</Label>
            <div className="grid grid-cols-3 gap-2">
              {(Object.entries(statusLabels) as [ServiceOrderStatus, string][]).map(([value, label]) => {
                const isCurrentStatus = value === order.status;
                const isValidNext = VALID_STATUS_TRANSITIONS[order.status]?.includes(value) ?? false;
                const isSelected = formData.newStatus === value;
                const isDisabled = !isCurrentStatus && !isValidNext;
                return (
                  <button
                    key={value}
                    type="button"
                    disabled={isDisabled}
                    onClick={() => {
                      if (isDisabled) return;
                      const previousStatus = formData.newStatus;
                      setFormData({ ...formData, newStatus: value });
                      if (value === "delivered" && previousStatus !== "delivered" && step === EDIT_STEPS.findIndex(s => s.id === "status")) {
                        setTimeout(() => setStep(EDIT_STEPS.findIndex(s => s.id === "finalize")), 100);
                      }
                      if (previousStatus === "delivered" && value !== "delivered" && step === EDIT_STEPS.findIndex(s => s.id === "finalize")) {
                        setTimeout(() => setStep(EDIT_STEPS.findIndex(s => s.id === "status")), 100);
                      }
                    }}
                    title={isDisabled ? `Transição de "${statusLabels[order.status]}" para "${label}" não é permitida` : undefined}
                    className={cn(
                      "px-3 py-2.5 rounded-md text-sm font-medium text-left border transition-colors",
                      isSelected
                        ? "border-primary bg-primary/10 text-primary"
                        : isCurrentStatus
                          ? "border-blue-300 bg-blue-50 text-blue-700"
                          : isDisabled
                            ? "border-border/30 bg-muted/30 text-muted-foreground/40 cursor-not-allowed"
                            : "border-border hover:bg-muted"
                    )}
                  >
                    <span className={`inline-block w-2 h-2 rounded-full mr-2 ${statusColors[value].split(" ")[0]}`} />
                    {label}
                    {isCurrentStatus && !isSelected && (
                      <span className="block text-xs text-blue-500 mt-0.5">atual</span>
                    )}
                  </button>
                );
              })}
            </div>
            <p className="text-xs text-muted-foreground">
              Apenas as transições válidas para o fluxo de trabalho estão disponíveis. Itens em cinza não podem ser selecionados a partir do status atual.
            </p>
          </div>
          {formData.newStatus !== order.status && (
            <div className="space-y-2">
              <Label>Motivo da mudança <span className="text-xs text-muted-foreground">(opcional)</span></Label>
              <Textarea placeholder="Descreva o motivo da alteração do status..." value={formData.statusNote} onChange={(e) => setFormData({ ...formData, statusNote: e.target.value })} rows={3} />
            </div>
          )}
        </div>
      )}

      {/* Step 6: Finalização - só aparece se status for delivered */}
      {step === 6 && formData.newStatus === "delivered" && (
        <div className="space-y-4">
          <div className="space-y-2">
            <Label>Data de Saída</Label>
            <Input type="date" value={formData.exitDate} onChange={(e) => setFormData({ ...formData, exitDate: e.target.value })} />
          </div>
          <div className="space-y-2">
            <Label>Termos de Garantia</Label>
            <Textarea 
              placeholder="Termos e condições de garantia..." 
              value={formData.warrantyTerms || settings?.warrantyTerms || ""} 
              onChange={(e) => setFormData({ ...formData, warrantyTerms: e.target.value })} 
              rows={4} 
            />
            {settings?.warrantyTerms && !formData.warrantyTerms && (
              <p className="text-xs text-muted-foreground">Termos pré-preenchidos das configurações</p>
            )}
          </div>
          <div className="space-y-2">
            <Label>Observações Finais</Label>
            <Textarea placeholder="Observações gerais..." value={formData.observations} onChange={(e) => setFormData({ ...formData, observations: e.target.value })} rows={2} />
          </div>
        </div>
      )}

      {/* Navigation */}
      <div className="flex justify-between items-center pt-6 border-t mt-6">
        <div className="flex gap-2">
          {step > 0 && (
            <Button type="button" variant="outline" onClick={() => setStep(step - 1)} size="lg">
              <ChevronLeft className="mr-2 h-4 w-4" /> Anterior
            </Button>
          )}
        </div>
        <div className="flex gap-2">
          {(() => {
            const maxStep = formData.newStatus === "delivered" ? EDIT_STEPS.length - 1 : EDIT_STEPS.length - 2;
            const isLastStep = step >= maxStep;
            return !isLastStep ? (
              <Button type="button" onClick={handleNextStep} size="lg">
                Próximo <ChevronRight className="ml-2 h-4 w-4" />
              </Button>
            ) : (
            <Button type="button" onClick={handleSubmit} disabled={loading} size="lg">
              {loading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Salvando...
                </>
              ) : (
                <>
                  <Check className="mr-2 h-4 w-4" />
                  Salvar Alterações
                </>
              )}
            </Button>
            );
          })()}
        </div>
      </div>

    </div>
  );
}
