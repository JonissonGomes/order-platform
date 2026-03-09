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
import { formatCPF, formatPhone, formatCEP, validateCPF } from "@/lib/formatters";
import { fetchCEP } from "@/lib/cep";
import type { Customer } from "@/types";
import { Plus, Search, User, Loader2, Edit, Trash2, Bell } from "lucide-react";
import { Separator } from "@/components/ui/separator";
import { useEffect, useState } from "react";
import { toast } from "sonner";

export default function Customers() {
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [editingCustomer, setEditingCustomer] = useState<Customer | null>(null);
  const [deletingCustomer, setDeletingCustomer] = useState<Customer | null>(null);

  useEffect(() => {
    loadCustomers();
  }, []);

  const loadCustomers = async () => {
    try {
      setLoading(true);
      const params: any = { page: 1, limit: 50 };
      if (searchTerm) {
        params.name = searchTerm;
      }
      const response = await api.listCustomers(params);
      setCustomers(response.customers || []);
    } catch (error: any) {
      // Se for 404 (não encontrado), apenas definir array vazio sem mostrar erro
      if (error.message === "status: 404" || error.message?.includes("404")) {
        setCustomers([]);
        return;
      }
      // Apenas mostrar erro se não for 404
      if (error.message && error.message.trim() !== "" && !error.message.includes("status: 404")) {
        toast.error(error.message || "Erro ao carregar clientes");
      }
    } finally {
      setLoading(false);
    }
  };

  const handleSearch = () => {
    loadCustomers();
  };

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
              <Button>
                <Plus className="mr-2 h-4 w-4" />
                Novo Cliente
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl">
              <DialogHeader className="flex-shrink-0 px-4 sm:px-6 pt-4 sm:pt-6 pb-3 sm:pb-4 border-b">
                <DialogTitle className="text-lg sm:text-xl">Novo Cliente</DialogTitle>
                <DialogDescription className="text-sm">
                  Preencha os dados para cadastrar um novo cliente
                </DialogDescription>
              </DialogHeader>
              <div className="flex-1 overflow-y-auto px-4 sm:px-6 py-4">
                <CreateCustomerForm onSuccess={() => {
                  setIsCreateDialogOpen(false);
                  loadCustomers();
                }} />
              </div>
            </DialogContent>
          </Dialog>
        </div>

        <div className="flex flex-col sm:flex-row gap-2 sm:gap-4">
          <div className="relative flex-1 min-w-0">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Buscar por nome, CPF ou telefone..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              onKeyPress={(e) => e.key === "Enter" && handleSearch()}
              className="pl-10 w-full"
            />
          </div>
          <Button onClick={handleSearch} size="icon" className="w-full sm:w-auto" variant="outline">
            <Search className="h-4 w-4" />
            <span className="sr-only">Buscar</span>
          </Button>
        </div>

        {loading ? (
          <div className="text-center py-8 text-muted-foreground">Carregando...</div>
        ) : customers.length === 0 ? (
          <Card>
            <CardContent className="py-8 text-center text-muted-foreground">
              Nenhum cliente encontrado
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3">
            {customers.map((customer) => (
              <CustomerCard 
                key={customer.id} 
                customer={customer}
                onEdit={() => setEditingCustomer(customer)}
                onDelete={() => setDeletingCustomer(customer)}
              />
            ))}
          </div>
        )}

        {/* Edit Dialog */}
        {editingCustomer && (
          <Dialog open={!!editingCustomer} onOpenChange={(open) => !open && setEditingCustomer(null)}>
            <DialogContent className="max-w-2xl">
              <DialogHeader className="flex-shrink-0 px-4 sm:px-6 pt-4 sm:pt-6 pb-3 sm:pb-4 border-b">
                <DialogTitle className="text-lg sm:text-xl">Editar Cliente</DialogTitle>
                <DialogDescription className="text-sm">
                  Atualize os dados do cliente
                </DialogDescription>
              </DialogHeader>
              <div className="flex-1 overflow-y-auto px-4 sm:px-6 py-4">
                <EditCustomerForm 
                  customer={editingCustomer}
                  onSuccess={() => {
                    setEditingCustomer(null);
                    loadCustomers();
                  }}
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
                Tem certeza que deseja excluir o cliente {deletingCustomer?.name}? Esta ação não pode ser desfeita.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancelar</AlertDialogCancel>
              <AlertDialogAction
                onClick={async () => {
                  if (deletingCustomer) {
                    try {
                      await api.deleteCustomer(deletingCustomer.id);
                      toast.success("Cliente excluído com sucesso!");
                      setDeletingCustomer(null);
                      loadCustomers();
                    } catch (error: any) {
                      toast.error(error.message || "Erro ao excluir cliente");
                    }
                  }
                }}
                className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              >
                Excluir
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>
    </DashboardLayout>
  );
}

function CustomerCard({ customer, onEdit, onDelete }: { customer: Customer; onEdit: () => void; onDelete: () => void }) {
  return (
    <Card className="hover:shadow-md transition-shadow w-full">
      <CardHeader>
        <div className="flex items-start justify-between gap-2">
          <div className="flex items-center gap-3 min-w-0 flex-1">
            <div className="p-2 bg-blue-100 rounded-full flex-shrink-0">
              <User className="h-5 w-5 text-blue-600" />
            </div>
            <div className="min-w-0 flex-1">
              <CardTitle className="text-base sm:text-lg truncate">{customer.name}</CardTitle>
              <CardDescription className="text-xs sm:text-sm break-all">{customer.cpf || "Sem CPF"}</CardDescription>
            </div>
          </div>
          <div className="flex gap-1 flex-shrink-0">
            <Button variant="ghost" size="icon" onClick={onEdit} className="h-8 w-8">
              <Edit className="h-4 w-4" />
            </Button>
            <Button variant="ghost" size="icon" onClick={onDelete} className="h-8 w-8">
              <Trash2 className="h-4 w-4 text-destructive" />
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <div className="space-y-2 text-sm">
          <p className="text-muted-foreground break-words">
            <strong>Telefone:</strong> {customer.phone}
          </p>
          {customer.email && (
            <p className="text-muted-foreground break-words">
              <strong>Email:</strong> {customer.email}
            </p>
          )}
          {customer.address && (
            <p className="text-muted-foreground break-words text-xs">
              <strong>Endereço:</strong> {customer.address.street}, {customer.address.number} - {customer.address.city}/{customer.address.state}
            </p>
          )}
          {customer.notes && (
            <p className="text-muted-foreground break-words text-xs">
              <strong>Obs:</strong> {customer.notes}
            </p>
          )}
          {/* Alerta de manutenção periódica */}
          {customer.maintenanceIntervalMonths != null && customer.maintenanceIntervalMonths > 0 && (
            <div className={`flex items-center gap-1 text-xs rounded px-2 py-1 w-fit ${
              customer.nextMaintenanceDate && new Date(customer.nextMaintenanceDate) <= new Date()
                ? "bg-orange-100 text-orange-700"
                : "bg-blue-50 text-blue-600"
            }`}>
              <Bell className="h-3 w-3" />
              {customer.nextMaintenanceDate && new Date(customer.nextMaintenanceDate) <= new Date()
                ? `⚠ Manutenção atrasada (${new Date(customer.nextMaintenanceDate).toLocaleDateString("pt-BR")})`
                : `Próx. manutenção: ${customer.nextMaintenanceDate ? new Date(customer.nextMaintenanceDate).toLocaleDateString("pt-BR") : `${customer.maintenanceIntervalMonths}m`}`
              }
            </div>
          )}
          <p className="text-muted-foreground text-xs">
            Cadastrado em {new Date(customer.createdAt).toLocaleDateString("pt-BR")}
          </p>
        </div>
      </CardContent>
    </Card>
  );
}

function CreateCustomerForm({ onSuccess }: { onSuccess: () => void }) {
  const [loading, setLoading] = useState(false);
  const [cepLoading, setCepLoading] = useState(false);
  const [formData, setFormData] = useState({
    name: "",
    cpf: "",
    phone: "",
    email: "",
    address: {
      street: "",
      number: "",
      complement: "",
      neighborhood: "",
      city: "",
      state: "",
      zipCode: "",
    } as any,
  });

  // Auto-busca de CEP ao completar 8 dígitos
  useEffect(() => {
    const cep = formData.address.zipCode.replace(/\D/g, "");
    if (cep.length === 8) {
      setCepLoading(true);
      fetchCEP(cep).then((address) => {
        if (address) {
          setFormData((prev) => ({
            ...prev,
            address: { ...prev.address, ...address },
          }));
        } else {
          toast.error("CEP não encontrado");
        }
      }).finally(() => setCepLoading(false));
    }
  }, [formData.address.zipCode]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setLoading(true);
      await api.createCustomer(formData);
      toast.success("Cliente cadastrado com sucesso!");
      onSuccess();
    } catch (error: any) {
      toast.error(error.message || "Erro ao cadastrar cliente");
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="name">Nome *</Label>
        <Input
          id="name"
          value={formData.name}
          onChange={(e) => setFormData({ ...formData, name: e.target.value })}
          required
        />
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="cpf">CPF *</Label>
          <Input
            id="cpf"
            value={formatCPF(formData.cpf)}
            onChange={(e) => {
              const raw = e.target.value.replace(/\D/g, "");
              if (raw.length <= 11) {
                setFormData({ ...formData, cpf: raw });
              }
            }}
            onBlur={(e) => {
              const raw = e.target.value.replace(/\D/g, "");
              if (raw.length === 11 && !validateCPF(raw)) {
                toast.error("CPF inválido");
              }
            }}
            placeholder="000.000.000-00"
            required
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="phone">Telefone *</Label>
          <Input
            id="phone"
            value={formatPhone(formData.phone)}
            onChange={(e) => {
              const raw = e.target.value.replace(/\D/g, "");
              if (raw.length <= 11) {
                setFormData({ ...formData, phone: raw });
              }
            }}
            placeholder="(00) 00000-0000"
            required
          />
        </div>
      </div>
      <div className="space-y-2">
        <Label htmlFor="email">Email</Label>
        <Input
          id="email"
          type="email"
          value={formData.email}
          onChange={(e) => setFormData({ ...formData, email: e.target.value })}
        />
      </div>
      <div className="space-y-2">
        <Label>Endereço</Label>
        <div className="space-y-2">
          <div className="flex gap-2">
            <div className="space-y-2 flex-1">
              <Label htmlFor="zipCode" className="text-xs">CEP</Label>
              <div className="relative">
                <Input
                  id="zipCode"
                  value={formatCEP(formData.address.zipCode)}
                  onChange={(e) => {
                    const raw = e.target.value.replace(/\D/g, "");
                    if (raw.length <= 8) {
                      setFormData({
                        ...formData,
                        address: { ...formData.address, zipCode: raw }
                      });
                    }
                  }}
                  placeholder="00000-000"
                  maxLength={9}
                />
                {cepLoading && (
                  <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 animate-spin text-muted-foreground" />
                )}
              </div>
            </div>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="street" className="text-xs">Rua</Label>
              <Input
                id="street"
                value={formData.address.street}
                onChange={(e) => setFormData({
                  ...formData,
                  address: { ...formData.address, street: e.target.value }
                })}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="number" className="text-xs">Número</Label>
              <Input
                id="number"
                value={formData.address.number}
                onChange={(e) => setFormData({
                  ...formData,
                  address: { ...formData.address, number: e.target.value }
                })}
              />
            </div>
          </div>
          <div className="space-y-2">
            <Label htmlFor="complement" className="text-xs">Complemento</Label>
            <Input
              id="complement"
              value={formData.address.complement || ""}
              onChange={(e) => setFormData({
                ...formData,
                address: { ...formData.address, complement: e.target.value }
              })}
            />
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="space-y-2">
              <Label htmlFor="neighborhood" className="text-xs">Bairro</Label>
              <Input
                id="neighborhood"
                value={formData.address.neighborhood}
                onChange={(e) => setFormData({
                  ...formData,
                  address: { ...formData.address, neighborhood: e.target.value }
                })}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="city" className="text-xs">Cidade</Label>
              <Input
                id="city"
                value={formData.address.city}
                onChange={(e) => setFormData({
                  ...formData,
                  address: { ...formData.address, city: e.target.value }
                })}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="state" className="text-xs">Estado</Label>
              <Input
                id="state"
                value={formData.address.state}
                onChange={(e) => setFormData({
                  ...formData,
                  address: { ...formData.address, state: e.target.value }
                })}
                maxLength={2}
              />
            </div>
          </div>
        </div>
      </div>
      <div className="flex justify-end gap-2">
        <Button type="submit" disabled={loading}>
          {loading ? "Cadastrando..." : "Cadastrar Cliente"}
        </Button>
      </div>
    </form>
  );
}

function EditCustomerForm({ customer, onSuccess, onCancel }: { customer: Customer; onSuccess: () => void; onCancel: () => void }) {
  const [loading, setLoading] = useState(false);
  const [cepLoading, setCepLoading] = useState(false);
  const [formData, setFormData] = useState({
    name: customer.name,
    phone: customer.phone,
    email: customer.email || "",
    notes: customer.notes || "",
    maintenanceIntervalMonths: customer.maintenanceIntervalMonths ?? 0,
    address: customer.address || {
      street: "",
      number: "",
      complement: "",
      neighborhood: "",
      city: "",
      state: "",
      zipCode: "",
    } as any,
  });

  // Auto-busca de CEP ao completar 8 dígitos
  useEffect(() => {
    const cep = formData.address.zipCode?.replace(/\D/g, "") || "";
    if (cep.length === 8) {
      setCepLoading(true);
      fetchCEP(cep).then((address) => {
        if (address) {
          setFormData((prev) => ({
            ...prev,
            address: { ...prev.address, ...address },
          }));
        } else {
          toast.error("CEP não encontrado");
        }
      }).finally(() => setCepLoading(false));
    }
  }, [formData.address.zipCode]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setLoading(true);
      await api.updateCustomer(customer.id, formData as any);
      toast.success("Cliente atualizado com sucesso!");
      onSuccess();
    } catch (error: any) {
      toast.error(error.message || "Erro ao atualizar cliente");
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="edit-name">Nome *</Label>
        <Input
          id="edit-name"
          value={formData.name}
          onChange={(e) => setFormData({ ...formData, name: e.target.value })}
          required
        />
      </div>
      <div className="space-y-2">
        <Label htmlFor="edit-phone">Telefone *</Label>
        <Input
          id="edit-phone"
          value={formatPhone(formData.phone)}
          onChange={(e) => {
            const raw = e.target.value.replace(/\D/g, "");
            if (raw.length <= 11) {
              setFormData({ ...formData, phone: raw });
            }
          }}
          placeholder="(00) 00000-0000"
          required
        />
      </div>
      <div className="space-y-2">
        <Label htmlFor="edit-email">Email</Label>
        <Input
          id="edit-email"
          type="email"
          value={formData.email}
          onChange={(e) => setFormData({ ...formData, email: e.target.value })}
        />
      </div>
      <div className="space-y-2">
        <Label>Endereço</Label>
        <div className="space-y-2">
          <div className="flex gap-2">
            <div className="space-y-2 flex-1">
              <Label htmlFor="edit-zipCode" className="text-xs">CEP</Label>
              <div className="relative">
                <Input
                  id="edit-zipCode"
                  value={formatCEP(formData.address.zipCode)}
                  onChange={(e) => {
                    const raw = e.target.value.replace(/\D/g, "");
                    if (raw.length <= 8) {
                      setFormData({
                        ...formData,
                        address: { ...formData.address, zipCode: raw }
                      });
                    }
                  }}
                  placeholder="00000-000"
                  maxLength={9}
                />
                {cepLoading && (
                  <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 animate-spin text-muted-foreground" />
                )}
              </div>
            </div>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="edit-street" className="text-xs">Rua</Label>
              <Input
                id="edit-street"
                value={formData.address.street}
                onChange={(e) => setFormData({
                  ...formData,
                  address: { ...formData.address, street: e.target.value }
                })}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit-number" className="text-xs">Número</Label>
              <Input
                id="edit-number"
                value={formData.address.number}
                onChange={(e) => setFormData({
                  ...formData,
                  address: { ...formData.address, number: e.target.value }
                })}
              />
            </div>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="space-y-2">
              <Label htmlFor="edit-neighborhood" className="text-xs">Bairro</Label>
              <Input
                id="edit-neighborhood"
                value={formData.address.neighborhood}
                onChange={(e) => setFormData({
                  ...formData,
                  address: { ...formData.address, neighborhood: e.target.value }
                })}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit-city" className="text-xs">Cidade</Label>
              <Input
                id="edit-city"
                value={formData.address.city}
                onChange={(e) => setFormData({
                  ...formData,
                  address: { ...formData.address, city: e.target.value }
                })}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit-state" className="text-xs">Estado</Label>
              <Input
                id="edit-state"
                value={formData.address.state}
                onChange={(e) => setFormData({
                  ...formData,
                  address: { ...formData.address, state: e.target.value }
                })}
                maxLength={2}
              />
            </div>
          </div>
        </div>
      </div>
      {/* Fidelização e Manutenção */}
      <div className="space-y-1 pt-2">
        <h3 className="font-semibold text-sm flex items-center gap-2">
          <Bell className="h-4 w-4 text-blue-500" />
          Fidelização e Manutenção Periódica
        </h3>
        <Separator />
      </div>
      <div className="space-y-2">
        <Label htmlFor="edit-maintenanceInterval">
          Intervalo de Manutenção (meses)
          <span className="ml-1 text-xs text-muted-foreground">(0 = sem alertas)</span>
        </Label>
        <Input
          id="edit-maintenanceInterval"
          type="number"
          min="0"
          max="36"
          value={formData.maintenanceIntervalMonths}
          onChange={(e) => setFormData({ ...formData, maintenanceIntervalMonths: parseInt(e.target.value) || 0 })}
          placeholder="Ex: 12 para limpeza anual"
        />
        {formData.maintenanceIntervalMonths > 0 && (
          <p className="text-xs text-muted-foreground">
            O sistema alertará quando a manutenção estiver próxima a cada {formData.maintenanceIntervalMonths} meses
          </p>
        )}
      </div>
      {customer.lastMaintenanceDate && (
        <div className="p-3 bg-blue-50 rounded-md text-xs text-blue-800 space-y-1">
          <p><strong>Última manutenção:</strong> {new Date(customer.lastMaintenanceDate).toLocaleDateString("pt-BR")}</p>
          {customer.nextMaintenanceDate && (
            <p><strong>Próxima manutenção:</strong> {new Date(customer.nextMaintenanceDate).toLocaleDateString("pt-BR")}</p>
          )}
        </div>
      )}
      <div className="space-y-2">
        <Label htmlFor="edit-notes">Observações</Label>
        <textarea
          id="edit-notes"
          className="w-full min-h-[80px] px-3 py-2 border rounded-md text-sm resize-none"
          placeholder="Notas sobre o cliente, preferências, histórico..."
          value={formData.notes}
          onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
        />
      </div>
      <div className="flex justify-end gap-2">
        <Button type="button" variant="outline" onClick={onCancel}>
          Cancelar
        </Button>
        <Button type="submit" disabled={loading}>
          {loading ? "Atualizando..." : "Atualizar Cliente"}
        </Button>
      </div>
    </form>
  );
}
