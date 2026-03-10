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
import { Separator } from "@/components/ui/separator";
import { api } from "@/lib/api";
import { formatCPF, formatPhone, formatCEP, validateCPF } from "@/lib/formatters";
import { fetchCEP } from "@/lib/cep";
import type { Customer } from "@/types";
import { Plus, Search, Users, Loader2, Edit, Trash2, Bell, UserCircle } from "lucide-react";
import { useEffect, useState } from "react";
import { toast } from "sonner";

export default function Customers() {
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null);
  const [editingCustomer, setEditingCustomer] = useState<Customer | null>(null);
  const [deletingCustomer, setDeletingCustomer] = useState<Customer | null>(null);

  useEffect(() => {
    loadCustomers();
  }, []);

  const loadCustomers = async () => {
    try {
      setLoading(true);
      const params: any = { page: 1, limit: 100 };
      if (searchTerm) params.name = searchTerm;
      const response = await api.listCustomers(params);
      setCustomers(response.customers || []);
    } catch (error: any) {
      if (error.message === "status: 404" || error.message?.includes("404")) {
        setCustomers([]);
        return;
      }
      if (error.message && !error.message.includes("status: 404")) {
        toast.error(error.message || "Erro ao carregar clientes");
      }
    } finally {
      setLoading(false);
    }
  };

  const handleSearch = () => loadCustomers();

  const handleDelete = async () => {
    if (!deletingCustomer) return;
    try {
      await api.deleteCustomer(deletingCustomer.id);
      toast.success("Cliente excluído com sucesso!");
      setDeletingCustomer(null);
      setSelectedCustomer(null);
      loadCustomers();
    } catch (error: any) {
      toast.error(error.message || "Erro ao excluir cliente");
    }
  };

  const filteredCustomers = customers.filter((c) => {
    if (!searchTerm) return true;
    const t = searchTerm.toLowerCase();
    return (
      c.name.toLowerCase().includes(t) ||
      c.cpf?.includes(searchTerm.replace(/\D/g, "")) ||
      c.phone?.includes(searchTerm.replace(/\D/g, "")) ||
      c.email?.toLowerCase().includes(t)
    );
  });

  const isMaintenanceOverdue = (c: Customer) =>
    !!c.maintenanceIntervalMonths && c.maintenanceIntervalMonths > 0 &&
    !!c.nextMaintenanceDate && new Date(c.nextMaintenanceDate) <= new Date();

  return (
    <DashboardLayout>
      <div className="space-y-6 w-full min-w-0">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Clientes</h1>
            <p className="text-muted-foreground">Gerencie todos os clientes do sistema</p>
          </div>
          <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
            <DialogTrigger asChild>
              <Button><Plus className="mr-2 h-4 w-4" />Novo Cliente</Button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl max-h-[90vh] flex flex-col">
              <DialogHeader className="px-6 pt-6 pb-4 border-b">
                <DialogTitle className="text-xl">Novo Cliente</DialogTitle>
                <DialogDescription className="mt-1.5">Preencha os dados para cadastrar um novo cliente</DialogDescription>
              </DialogHeader>
              <div className="flex-1 overflow-y-auto px-6 py-6">
                <CustomerForm onSuccess={() => { setIsCreateDialogOpen(false); loadCustomers(); }} />
              </div>
            </DialogContent>
          </Dialog>
        </div>

        <div className="flex gap-2">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Buscar por nome, CPF ou telefone..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleSearch()}
              className="pl-10"
            />
          </div>
          <Button onClick={handleSearch} variant="outline" size="icon"><Search className="h-4 w-4" /></Button>
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
          </div>
        ) : filteredCustomers.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12 text-muted-foreground gap-3">
            <Users className="h-12 w-12 opacity-30" />
            <p>Nenhum cliente encontrado</p>
          </div>
        ) : (
          <div className="rounded-md border overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow className="bg-muted/50">
                  <TableHead>Nome</TableHead>
                  <TableHead className="hidden sm:table-cell">CPF</TableHead>
                  <TableHead>Telefone</TableHead>
                  <TableHead className="hidden md:table-cell">Email</TableHead>
                  <TableHead className="hidden lg:table-cell">Cidade</TableHead>
                  <TableHead className="w-8"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredCustomers.map((customer) => (
                  <TableRow
                    key={customer.id}
                    className="cursor-pointer hover:bg-muted/50 transition-colors"
                    onClick={() => setSelectedCustomer(customer)}
                  >
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <span className="font-medium">{customer.name}</span>
                        {isMaintenanceOverdue(customer) && (
                          <Bell className="h-3 w-3 text-orange-500 flex-shrink-0" />
                        )}
                      </div>
                    </TableCell>
                    <TableCell className="hidden sm:table-cell text-muted-foreground text-sm">
                      {customer.cpf ? formatCPF(customer.cpf) : "—"}
                    </TableCell>
                    <TableCell className="text-muted-foreground text-sm">
                      {customer.phone ? formatPhone(customer.phone) : "—"}
                    </TableCell>
                    <TableCell className="hidden md:table-cell text-muted-foreground text-sm">
                      {customer.email || "—"}
                    </TableCell>
                    <TableCell className="hidden lg:table-cell text-muted-foreground text-sm">
                      {customer.address ? `${customer.address.city}/${customer.address.state}` : "—"}
                    </TableCell>
                    <TableCell></TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </div>

      {/* Detail Modal */}
      {selectedCustomer && !editingCustomer && (
        <Dialog open={!!selectedCustomer} onOpenChange={(open) => !open && setSelectedCustomer(null)}>
          <DialogContent className="max-w-lg max-h-[90vh] flex flex-col">
            <DialogHeader className="px-6 pt-6 pb-4 border-b">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-full bg-blue-100">
                  <UserCircle className="h-6 w-6 text-blue-600" />
                </div>
                <div>
                  <DialogTitle className="text-xl">{selectedCustomer.name}</DialogTitle>
                  <DialogDescription className="mt-1.5">
                    {selectedCustomer.cpf ? formatCPF(selectedCustomer.cpf) : "Sem CPF"}
                  </DialogDescription>
                </div>
              </div>
            </DialogHeader>
            <div className="flex-1 overflow-y-auto px-6 py-6">
              <div className="space-y-4 text-sm">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <p className="text-xs text-muted-foreground font-medium uppercase tracking-wide">Telefone</p>
                  <p className="mt-1">{formatPhone(selectedCustomer.phone)}</p>
                </div>
                {selectedCustomer.email && (
                  <div>
                    <p className="text-xs text-muted-foreground font-medium uppercase tracking-wide">Email</p>
                    <p className="mt-1 truncate">{selectedCustomer.email}</p>
                  </div>
                )}
              </div>
              {selectedCustomer.address && (
                <div>
                  <p className="text-xs text-muted-foreground font-medium uppercase tracking-wide">Endereço</p>
                  <p className="mt-1">
                    {selectedCustomer.address.street}, {selectedCustomer.address.number}
                    {selectedCustomer.address.complement ? ` — ${selectedCustomer.address.complement}` : ""}<br />
                    {selectedCustomer.address.neighborhood} — {selectedCustomer.address.city}/{selectedCustomer.address.state}
                    {selectedCustomer.address.zipCode ? ` — CEP ${formatCEP(selectedCustomer.address.zipCode)}` : ""}
                  </p>
                </div>
              )}
              {selectedCustomer.notes && (
                <div>
                  <p className="text-xs text-muted-foreground font-medium uppercase tracking-wide">Observações</p>
                  <p className="mt-1 text-muted-foreground">{selectedCustomer.notes}</p>
                </div>
              )}
              {selectedCustomer.maintenanceIntervalMonths != null && selectedCustomer.maintenanceIntervalMonths > 0 && (
                <div className={`rounded-md px-3 py-2 text-xs ${
                  isMaintenanceOverdue(selectedCustomer)
                    ? "bg-orange-50 text-orange-700 border border-orange-200"
                    : "bg-blue-50 text-blue-700 border border-blue-200"
                }`}>
                  <div className="flex items-center gap-1 font-medium mb-1">
                    <Bell className="h-3 w-3" /> Alerta de Manutenção
                  </div>
                  <p>Intervalo: a cada {selectedCustomer.maintenanceIntervalMonths} meses</p>
                  {selectedCustomer.nextMaintenanceDate && (
                    <p>Próxima: {new Date(selectedCustomer.nextMaintenanceDate).toLocaleDateString("pt-BR")}</p>
                  )}
                </div>
              )}
              <div>
                <p className="text-xs text-muted-foreground font-medium uppercase tracking-wide">Cadastrado em</p>
                <p className="mt-1">{new Date(selectedCustomer.createdAt).toLocaleDateString("pt-BR")}</p>
              </div>
              </div>
            </div>
            <div className="px-6 py-4 border-t bg-muted/30 flex justify-end gap-2">
              <Button
                variant="destructive"
                size="sm"
                onClick={() => { setDeletingCustomer(selectedCustomer); setSelectedCustomer(null); }}
              >
                <Trash2 className="h-4 w-4 mr-1" /> Excluir
              </Button>
              <Button
                size="sm"
                onClick={() => { setEditingCustomer(selectedCustomer); setSelectedCustomer(null); }}
              >
                <Edit className="h-4 w-4 mr-1" /> Editar
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      )}

      {/* Edit Dialog */}
      {editingCustomer && (
        <Dialog open={!!editingCustomer} onOpenChange={(open) => !open && setEditingCustomer(null)}>
          <DialogContent className="max-w-2xl max-h-[90vh] flex flex-col">
            <DialogHeader className="px-6 pt-6 pb-4 border-b">
              <DialogTitle className="text-xl">Editar Cliente</DialogTitle>
              <DialogDescription className="mt-1.5">Atualize os dados do cliente</DialogDescription>
            </DialogHeader>
            <div className="flex-1 overflow-y-auto px-6 py-6">
              <CustomerForm
                customer={editingCustomer}
                onSuccess={() => { setEditingCustomer(null); loadCustomers(); }}
                onCancel={() => setEditingCustomer(null)}
              />
            </div>
          </DialogContent>
        </Dialog>
      )}

      {/* Delete Confirmation */}
      <AlertDialog open={!!deletingCustomer} onOpenChange={(open) => !open && setDeletingCustomer(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirmar Exclusão</AlertDialogTitle>
            <AlertDialogDescription>
              Tem certeza que deseja excluir o cliente <strong>{deletingCustomer?.name}</strong>? Esta ação não pode ser desfeita.
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

/** Formulário unificado de criação e edição de clientes */
function CustomerForm({
  customer,
  onSuccess,
  onCancel,
}: {
  customer?: Customer;
  onSuccess: () => void;
  onCancel?: () => void;
}) {
  const isEdit = !!customer;
  const [loading, setLoading] = useState(false);
  const [cepLoading, setCepLoading] = useState(false);
  const [showAddressFields, setShowAddressFields] = useState(false);
  const [formData, setFormData] = useState({
    name: customer?.name || "",
    cpf: customer?.cpf?.replace(/\D/g, "") || "",
    phone: customer?.phone?.replace(/\D/g, "") || "",
    email: customer?.email || "",
    notes: customer?.notes || "",
    maintenanceIntervalMonths: customer?.maintenanceIntervalMonths ?? 0,
    address: {
      street: customer?.address?.street || "",
      number: customer?.address?.number || "",
      complement: customer?.address?.complement || "",
      neighborhood: customer?.address?.neighborhood || "",
      city: customer?.address?.city || "",
      state: customer?.address?.state || "",
      zipCode: customer?.address?.zipCode?.replace(/\D/g, "") || "",
    },
  });

  const handleCEP = async (cep: string) => {
    const raw = cep.replace(/\D/g, "");
    if (raw.length !== 8) return;
    setCepLoading(true);
    try {
      const data = await fetchCEP(raw);
      if (data) {
        setFormData((prev) => ({
          ...prev,
          address: {
            ...prev.address,
            street: data.street || prev.address.street,
            neighborhood: data.neighborhood || prev.address.neighborhood,
            city: data.city || prev.address.city,
            state: data.state || prev.address.state,
          },
        }));
      }
    } catch {
      // silently fail
    } finally {
      setCepLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const cpfRaw = formData.cpf.replace(/\D/g, "");
    if (!isEdit && cpfRaw.length === 11 && !validateCPF(cpfRaw)) {
      toast.error("CPF inválido");
      return;
    }
    try {
      setLoading(true);
      const hasAddress = formData.address.street || formData.address.city;
      const payload: any = {
        name: formData.name,
        cpf: cpfRaw,
        phone: formData.phone,
        email: formData.email || undefined,
        notes: formData.notes || undefined,
        maintenanceIntervalMonths: formData.maintenanceIntervalMonths,
        address: hasAddress ? {
          ...formData.address,
          zipCode: formData.address.zipCode.replace(/\D/g, ""),
        } : undefined,
      };
      if (isEdit) {
        await api.updateCustomer(customer!.id, payload);
        toast.success("Cliente atualizado com sucesso!");
      } else {
        await api.createCustomer(payload);
        toast.success("Cliente cadastrado com sucesso!");
      }
      onSuccess();
    } catch (error: any) {
      toast.error(error.message || "Erro ao salvar cliente");
    } finally {
      setLoading(false);
    }
  };

  const setAddr = (field: string, value: string) =>
    setFormData((prev) => ({ ...prev, address: { ...prev.address, [field]: value } }));

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="c-name">Nome *</Label>
        <Input id="c-name" value={formData.name} onChange={(e) => setFormData({ ...formData, name: e.target.value })} required />
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="c-cpf">CPF {!isEdit && "*"}</Label>
          <Input
            id="c-cpf"
            value={formatCPF(formData.cpf)}
            onChange={(e) => {
              const raw = e.target.value.replace(/\D/g, "");
              if (raw.length <= 11) setFormData({ ...formData, cpf: raw });
            }}
            placeholder="000.000.000-00"
            required={!isEdit}
            disabled={isEdit}
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="c-phone">Telefone *</Label>
          <Input
            id="c-phone"
            value={formatPhone(formData.phone)}
            onChange={(e) => {
              const raw = e.target.value.replace(/\D/g, "");
              if (raw.length <= 11) setFormData({ ...formData, phone: raw });
            }}
            placeholder="(00) 00000-0000"
            required
          />
        </div>
      </div>

      <div className="space-y-2">
        <Label htmlFor="c-email">
          Email <span className="text-xs text-muted-foreground">(opcional)</span>
        </Label>
        <Input
          id="c-email"
          type="email"
          value={formData.email}
          onChange={(e) => setFormData({ ...formData, email: e.target.value })}
          placeholder="cliente@email.com"
        />
      </div>

      {/* Endereço */}
      <div className="space-y-3">
        <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">Endereço</h3>
        <div className="grid grid-cols-3 gap-3">
          <div className="col-span-2 space-y-1">
            <Label className="text-xs">CEP</Label>
            <div className="relative">
              <Input
                value={formatCEP(formData.address.zipCode)}
                onChange={(e) => {
                  const raw = e.target.value.replace(/\D/g, "");
                  if (raw.length <= 8) {
                    setAddr("zipCode", raw);
                    if (raw.length === 8) handleCEP(raw);
                  }
                }}
                placeholder="00000-000"
              />
              {cepLoading && <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 animate-spin text-muted-foreground" />}
            </div>
          </div>
          <div className="space-y-1">
            <Label className="text-xs">Estado</Label>
            <Input value={formData.address.state} onChange={(e) => setAddr("state", e.target.value.toUpperCase().slice(0,2))} placeholder="PE" maxLength={2} />
          </div>
        </div>
        <div className="grid grid-cols-3 gap-3">
          <div className="col-span-2 space-y-1">
            <Label className="text-xs">Rua / Logradouro</Label>
            <Input value={formData.address.street} onChange={(e) => setAddr("street", e.target.value)} placeholder="Rua das Flores" />
          </div>
          <div className="space-y-1">
            <Label className="text-xs">Número</Label>
            <Input value={formData.address.number} onChange={(e) => setAddr("number", e.target.value)} placeholder="123" />
          </div>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-1">
            <Label className="text-xs">Bairro</Label>
            <Input value={formData.address.neighborhood} onChange={(e) => setAddr("neighborhood", e.target.value)} />
          </div>
          <div className="space-y-1">
            <Label className="text-xs">Cidade</Label>
            <Input value={formData.address.city} onChange={(e) => setAddr("city", e.target.value)} />
          </div>
        </div>
        <div className="space-y-1">
          <Label className="text-xs">Complemento</Label>
          <Input value={formData.address.complement} onChange={(e) => setAddr("complement", e.target.value)} placeholder="Apto 10, Bloco A..." />
        </div>
      </div>

      {/* Manutenção */}
      <div className="space-y-3">
        <div className="flex items-center gap-2">
          <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">Manutenção Periódica</h3>
          <Bell className="h-3 w-3 text-blue-500" />
        </div>
        <Separator />
        <div className="space-y-2">
          <Label htmlFor="c-maintenance">
            Intervalo (meses) <span className="text-xs text-muted-foreground">— 0 = sem alertas</span>
          </Label>
          <Input
            id="c-maintenance"
            type="number"
            min="0" max="36"
            value={formData.maintenanceIntervalMonths}
            onChange={(e) => setFormData({ ...formData, maintenanceIntervalMonths: parseInt(e.target.value) || 0 })}
            placeholder="Ex: 12"
          />
        </div>
        {isEdit && customer?.lastMaintenanceDate && (
          <div className="p-3 bg-blue-50 rounded-md text-xs text-blue-800 space-y-1">
            <p><strong>Última:</strong> {new Date(customer.lastMaintenanceDate).toLocaleDateString("pt-BR")}</p>
            {customer.nextMaintenanceDate && (
              <p><strong>Próxima:</strong> {new Date(customer.nextMaintenanceDate).toLocaleDateString("pt-BR")}</p>
            )}
          </div>
        )}
      </div>

      <div className="space-y-2">
        <Label htmlFor="c-notes">Observações</Label>
        <textarea
          id="c-notes"
          className="w-full min-h-[72px] px-3 py-2 border rounded-md text-sm resize-none focus:outline-none focus:ring-2 focus:ring-ring"
          value={formData.notes}
          onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
          placeholder="Notas sobre o cliente, preferências..."
        />
      </div>

      <div className="flex justify-end gap-2 pt-2 border-t">
        {!isEdit && onCancel && <Button type="button" variant="outline" onClick={onCancel} disabled={loading}>Cancelar</Button>}
        <Button type="submit" disabled={loading}>
          {loading ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Salvando...</> : isEdit ? "Atualizar" : "Cadastrar"}
        </Button>
      </div>
    </form>
  );
}
