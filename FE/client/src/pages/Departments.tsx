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
import { Badge } from "@/components/ui/badge";
import { api } from "@/lib/api";
import { formatPhone, formatCEP } from "@/lib/formatters";
import { fetchCEP } from "@/lib/cep";
import type { Department, Employee, Address } from "@/types";
import { Plus, Building2, Check, ChevronsUpDown, Pencil, Trash2, MapPin, Loader2, Users, Search } from "lucide-react";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

export default function Departments() {
  const [departments, setDepartments] = useState<Department[]>([]);
  const [loading, setLoading] = useState(true);
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [selectedDepartment, setSelectedDepartment] = useState<Department | null>(null);
  const [editingDepartment, setEditingDepartment] = useState<Department | null>(null);
  const [deletingDepartment, setDeletingDepartment] = useState<Department | null>(null);
  const [linkingEmployeesDept, setLinkingEmployeesDept] = useState<Department | null>(null);

  useEffect(() => {
    loadDepartments();
  }, []);

  const loadDepartments = async () => {
    try {
      setLoading(true);
      const response = await api.listDepartments({ isActive: true });
      setDepartments(response.departments || []);
    } catch (error: any) {
      if (error.message === "status: 404" || error.message?.includes("404")) {
        setDepartments([]);
        return;
      }
      if (error.message && !error.message.includes("status: 404")) {
        toast.error(error.message || "Erro ao carregar departamentos");
      }
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async () => {
    if (!deletingDepartment) return;
    try {
      await api.deleteDepartment(deletingDepartment.id);
      toast.success("Departamento excluído com sucesso!");
      setDeletingDepartment(null);
      setSelectedDepartment(null);
      loadDepartments();
    } catch (error: any) {
      toast.error(error.message || "Erro ao excluir departamento");
    }
  };

  return (
    <DashboardLayout>
      <div className="space-y-6 w-full min-w-0">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Departamentos</h1>
            <p className="text-muted-foreground">Gerencie os departamentos da empresa</p>
          </div>
          <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
            <DialogTrigger asChild>
              <Button><Plus className="mr-2 h-4 w-4" />Novo Departamento</Button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl max-h-[90vh] flex flex-col">
              <DialogHeader className="px-6 pt-6 pb-4 border-b">
                <DialogTitle className="text-xl">Novo Departamento</DialogTitle>
                <DialogDescription className="mt-1.5">Preencha os dados para criar um novo departamento</DialogDescription>
              </DialogHeader>
              <div className="flex-1 overflow-y-auto px-6 py-6">
                <DepartmentForm onSuccess={() => { setIsCreateDialogOpen(false); loadDepartments(); }} />
              </div>
            </DialogContent>
          </Dialog>
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
          </div>
        ) : departments.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12 text-muted-foreground gap-3">
            <Building2 className="h-12 w-12 opacity-30" />
            <p>Nenhum departamento encontrado</p>
          </div>
        ) : (
          <div className="rounded-md border overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow className="bg-muted/50">
                  <TableHead>Nome</TableHead>
                  <TableHead className="hidden sm:table-cell">Descrição</TableHead>
                  <TableHead className="hidden md:table-cell">Localização</TableHead>
                  <TableHead className="hidden lg:table-cell">Gerente</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {departments.map((dept) => (
                  <TableRow
                    key={dept.id}
                    className="cursor-pointer hover:bg-muted/50 transition-colors"
                    onClick={() => setSelectedDepartment(dept)}
                  >
                    <TableCell className="font-medium">
                      <div className="flex items-center gap-2">
                        <div className="p-1.5 rounded bg-blue-100 flex-shrink-0">
                          <Building2 className="h-3 w-3 text-blue-600" />
                        </div>
                        {dept.name}
                      </div>
                    </TableCell>
                    <TableCell className="hidden sm:table-cell text-muted-foreground text-sm">
                      {dept.description || "—"}
                    </TableCell>
                    <TableCell className="hidden md:table-cell text-muted-foreground text-sm">
                      {dept.address ? (
                        <span className="flex items-center gap-1">
                          <MapPin className="h-3 w-3" />
                          {dept.address.city}/{dept.address.state}
                        </span>
                      ) : "—"}
                    </TableCell>
                    <TableCell className="hidden lg:table-cell text-muted-foreground text-sm">
                      {dept.manager?.name || "—"}
                    </TableCell>
                    <TableCell>
                      <Badge variant={dept.isActive ? "default" : "secondary"} className="text-xs">
                        {dept.isActive ? "Ativo" : "Inativo"}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex items-center justify-end gap-1" onClick={(e) => e.stopPropagation()}>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8"
                          title="Definir Colaboradores"
                          onClick={() => setLinkingEmployeesDept(dept)}
                        >
                          <Users className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8"
                          title="Editar"
                          onClick={() => { setEditingDepartment(dept); setSelectedDepartment(null); }}
                        >
                          <Pencil className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 text-destructive hover:text-destructive"
                          title="Excluir"
                          onClick={() => setDeletingDepartment(dept)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
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
      {selectedDepartment && !editingDepartment && (
        <Dialog open={!!selectedDepartment} onOpenChange={(open) => !open && setSelectedDepartment(null)}>
          <DialogContent className="max-w-md max-h-[90vh] flex flex-col">
            <DialogHeader className="px-6 pt-6 pb-4 border-b">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-full bg-blue-100">
                  <Building2 className="h-6 w-6 text-blue-600" />
                </div>
                <div>
                  <DialogTitle className="text-xl">{selectedDepartment.name}</DialogTitle>
                  <DialogDescription className="mt-1.5">{selectedDepartment.description || "Sem descrição"}</DialogDescription>
                </div>
              </div>
            </DialogHeader>
            <div className="flex-1 overflow-y-auto px-6 py-6">
              <div className="space-y-4 text-sm">
              {selectedDepartment.manager && (
                <div>
                  <p className="text-xs text-muted-foreground font-medium uppercase tracking-wide">Gerente</p>
                  <p className="mt-1">{selectedDepartment.manager.name}</p>
                </div>
              )}
              {selectedDepartment.address && (
                <div>
                  <p className="text-xs text-muted-foreground font-medium uppercase tracking-wide flex items-center gap-1">
                    <MapPin className="h-3 w-3" /> Localização
                  </p>
                  <p className="mt-1">
                    {selectedDepartment.address.street}{selectedDepartment.address.number ? `, ${selectedDepartment.address.number}` : ""}
                    {selectedDepartment.address.neighborhood ? ` — ${selectedDepartment.address.neighborhood}` : ""}<br />
                    {selectedDepartment.address.city}/{selectedDepartment.address.state}
                    {selectedDepartment.address.zipCode ? ` — CEP ${formatCEP(selectedDepartment.address.zipCode)}` : ""}
                  </p>
                </div>
              )}
              <div>
                <p className="text-xs text-muted-foreground font-medium uppercase tracking-wide">Status</p>
                <p className="mt-1">
                  <Badge variant={selectedDepartment.isActive ? "default" : "secondary"}>
                    {selectedDepartment.isActive ? "Ativo" : "Inativo"}
                  </Badge>
                </p>
              </div>
              </div>
            </div>
            <div className="px-6 py-4 border-t bg-muted/30 flex justify-between items-center">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => { setLinkingEmployeesDept(selectedDepartment); setSelectedDepartment(null); }}
              >
                <Users className="h-4 w-4 mr-1" /> Colaboradores
              </Button>
              <div className="flex gap-1">
                <Button
                  variant="ghost"
                  size="icon"
                  className="text-destructive hover:text-destructive"
                  title="Excluir"
                  onClick={() => { setDeletingDepartment(selectedDepartment); setSelectedDepartment(null); }}
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  title="Editar"
                  onClick={() => { setEditingDepartment(selectedDepartment); setSelectedDepartment(null); }}
                >
                  <Pencil className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      )}

      {/* Edit Dialog */}
      {editingDepartment && (
        <Dialog open={!!editingDepartment} onOpenChange={(open) => !open && setEditingDepartment(null)}>
          <DialogContent className="max-w-2xl max-h-[90vh] flex flex-col">
            <DialogHeader className="px-6 pt-6 pb-4 border-b">
              <DialogTitle className="text-xl">Editar Departamento</DialogTitle>
              <DialogDescription className="mt-1.5">Atualize as informações do departamento</DialogDescription>
            </DialogHeader>
            <div className="flex-1 overflow-y-auto px-6 py-6">
              <DepartmentForm
                department={editingDepartment}
                onSuccess={() => { setEditingDepartment(null); loadDepartments(); }}
                onCancel={() => setEditingDepartment(null)}
              />
            </div>
          </DialogContent>
        </Dialog>
      )}

      {/* Delete Confirmation */}
      <AlertDialog open={!!deletingDepartment} onOpenChange={(open) => !open && setDeletingDepartment(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirmar Exclusão</AlertDialogTitle>
            <AlertDialogDescription>
              Tem certeza que deseja excluir o departamento <strong>{deletingDepartment?.name}</strong>?
              Esta ação não pode ser desfeita e falhará se houver colaboradores ou ordens vinculados.
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

      {/* Link Employees Dialog */}
      {linkingEmployeesDept && (
        <LinkEmployeesDialog
          department={linkingEmployeesDept}
          open={!!linkingEmployeesDept}
          onOpenChange={(open) => !open && setLinkingEmployeesDept(null)}
          onSuccess={() => { setLinkingEmployeesDept(null); loadDepartments(); }}
        />
      )}
    </DashboardLayout>
  );
}

function LinkEmployeesDialog({
  department,
  open,
  onOpenChange,
  onSuccess,
}: {
  department: Department;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
}) {
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [search, setSearch] = useState("");

  useEffect(() => {
    if (open) {
      setLoading(true);
      api.listEmployees()
        .then((r) => setEmployees(r.employees || []))
        .catch(() => {})
        .finally(() => setLoading(false));
    }
  }, [open]);

  const deptEmployees = employees.filter((e) => e.departmentId === department.id);
  const otherEmployees = employees.filter((e) => e.departmentId !== department.id);

  const filtered = (list: Employee[]) =>
    search
      ? list.filter(
          (e) =>
            e.name.toLowerCase().includes(search.toLowerCase()) ||
            e.email.toLowerCase().includes(search.toLowerCase())
        )
      : list;

  const handleLink = async (employee: Employee) => {
    setSaving(true);
    try {
      await api.updateEmployee(employee.id, { departmentId: department.id });
      toast.success(`${employee.name} vinculado ao departamento`);
      const r = await api.listEmployees();
      setEmployees(r.employees || []);
    } catch (e: any) {
      toast.error(e.message || "Erro ao vincular colaborador");
    } finally {
      setSaving(false);
    }
  };

  const handleUnlink = async (employee: Employee) => {
    setSaving(true);
    try {
      await api.updateEmployee(employee.id, { departmentId: "" });
      toast.success(`${employee.name} desvinculado do departamento`);
      const r = await api.listEmployees();
      setEmployees(r.employees || []);
    } catch (e: any) {
      toast.error(e.message || "Erro ao desvincular colaborador");
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg max-h-[90vh] flex flex-col">
        <DialogHeader className="px-6 pt-6 pb-4 border-b">
          <DialogTitle className="text-xl flex items-center gap-2">
            <Users className="h-5 w-5" />
            Colaboradores — {department.name}
          </DialogTitle>
          <DialogDescription>Vincule ou desvincule colaboradores a este departamento</DialogDescription>
        </DialogHeader>
        <div className="py-3 space-y-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Buscar colaborador..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9"
            />
          </div>

          {loading ? (
            <div className="flex justify-center py-8">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          ) : (
            <>
              {deptEmployees.length > 0 && (
                <div className="space-y-2">
                  <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                    Neste departamento ({deptEmployees.length})
                  </p>
                  <div className="space-y-1">
                    {filtered(deptEmployees).map((emp) => (
                      <div
                        key={emp.id}
                        className="flex items-center justify-between rounded-lg border bg-muted/30 px-3 py-2"
                      >
                        <div>
                          <p className="text-sm font-medium">{emp.name}</p>
                          <p className="text-xs text-muted-foreground">{emp.email}</p>
                        </div>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="text-destructive hover:text-destructive"
                          disabled={saving}
                          onClick={() => handleUnlink(emp)}
                        >
                          Remover
                        </Button>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {otherEmployees.length > 0 && (
                <div className="space-y-2">
                  <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                    Outros colaboradores ({otherEmployees.length})
                  </p>
                  <div className="space-y-1">
                    {filtered(otherEmployees).map((emp) => (
                      <div
                        key={emp.id}
                        className="flex items-center justify-between rounded-lg border px-3 py-2"
                      >
                        <div>
                          <p className="text-sm font-medium">{emp.name}</p>
                          <p className="text-xs text-muted-foreground">
                            {emp.email}
                            {emp.departmentId && emp.department?.name ? (
                              <span className="ml-1 text-amber-600">({emp.department.name})</span>
                            ) : null}
                          </p>
                        </div>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="text-blue-600 hover:text-blue-700"
                          disabled={saving}
                          onClick={() => handleLink(emp)}
                        >
                          Vincular
                        </Button>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {employees.length === 0 && (
                <div className="text-center py-6 text-muted-foreground text-sm">
                  Nenhum colaborador encontrado
                </div>
              )}
            </>
          )}
        </div>
        <div className="flex justify-end border-t pt-3">
          <Button onClick={() => { onSuccess(); onOpenChange(false); }}>Concluído</Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

function DepartmentForm({
  department,
  onSuccess,
  onCancel,
}: {
  department?: Department;
  onSuccess: () => void;
  onCancel?: () => void;
}) {
  const isEdit = !!department;
  const [loading, setLoading] = useState(false);
  const [cepLoading, setCepLoading] = useState(false);
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [managerOpen, setManagerOpen] = useState(false);
  const [formData, setFormData] = useState({
    name: department?.name || "",
    description: department?.description || "",
    managerId: department?.managerId || "",
    isActive: department?.isActive ?? true,
    address: {
      street: department?.address?.street || "",
      number: department?.address?.number || "",
      complement: department?.address?.complement || "",
      neighborhood: department?.address?.neighborhood || "",
      city: department?.address?.city || "",
      state: department?.address?.state || "",
      zipCode: department?.address?.zipCode?.replace(/\D/g, "") || "",
    },
  });

  useEffect(() => {
    api.listEmployees().then((r) => setEmployees(r.employees || [])).catch(() => {});
  }, []);

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

  const setAddr = (field: string, value: string) =>
    setFormData((prev) => ({ ...prev, address: { ...prev.address, [field]: value } }));

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setLoading(true);
      const hasAddress = formData.address.street || formData.address.city;
      const payload: any = {
        name: formData.name,
        description: formData.description || undefined,
        managerId: formData.managerId || undefined,
        address: hasAddress ? {
          ...formData.address,
          zipCode: formData.address.zipCode.replace(/\D/g, ""),
        } : undefined,
      };
      if (isEdit) {
        payload.isActive = formData.isActive;
        await api.updateDepartment(department!.id, payload);
        toast.success("Departamento atualizado com sucesso!");
      } else {
        await api.createDepartment(payload);
        toast.success("Departamento criado com sucesso!");
      }
      onSuccess();
    } catch (error: any) {
      toast.error(error.message || "Erro ao salvar departamento");
    } finally {
      setLoading(false);
    }
  };

  const selectedManager = employees.find((e) => e.id === formData.managerId);

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="d-name">Nome *</Label>
        <Input id="d-name" value={formData.name} onChange={(e) => setFormData({ ...formData, name: e.target.value })} required />
      </div>

      <div className="space-y-2">
        <Label htmlFor="d-description">Descrição</Label>
        <Input id="d-description" value={formData.description} onChange={(e) => setFormData({ ...formData, description: e.target.value })} placeholder="Breve descrição do departamento" />
      </div>

      <div className="space-y-2">
        <Label>Gerente (opcional)</Label>
        <Popover open={managerOpen} onOpenChange={setManagerOpen}>
          <PopoverTrigger asChild>
            <Button variant="outline" role="combobox" className="w-full justify-between">
              {selectedManager ? selectedManager.name : "Selecione um gerente..."}
              <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-[var(--radix-popover-trigger-width)] p-0" align="start">
            <Command>
              <CommandInput placeholder="Buscar colaborador..." className="h-9" />
              <CommandList className="max-h-[200px]">
                <CommandEmpty>Nenhum encontrado.</CommandEmpty>
                <CommandGroup>
                  <CommandItem value="" onSelect={() => { setFormData({ ...formData, managerId: "" }); setManagerOpen(false); }}>
                    <Check className={cn("mr-2 h-4 w-4", !formData.managerId ? "opacity-100" : "opacity-0")} />
                    Nenhum
                  </CommandItem>
                  {employees.map((emp) => (
                    <CommandItem key={emp.id} value={`${emp.name} ${emp.email}`} onSelect={() => { setFormData({ ...formData, managerId: emp.id }); setManagerOpen(false); }}>
                      <Check className={cn("mr-2 h-4 w-4", formData.managerId === emp.id ? "opacity-100" : "opacity-0")} />
                      <div>
                        <p className="font-medium">{emp.name}</p>
                        <p className="text-xs text-muted-foreground">{emp.email}</p>
                      </div>
                    </CommandItem>
                  ))}
                </CommandGroup>
              </CommandList>
            </Command>
          </PopoverContent>
        </Popover>
      </div>

      {/* Localização */}
      <div className="space-y-3">
        <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide flex items-center gap-2">
          <MapPin className="h-3 w-3" /> Localização do Departamento
        </h3>
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
          <Input value={formData.address.complement} onChange={(e) => setAddr("complement", e.target.value)} placeholder="Sala 2, Andar 3..." />
        </div>
      </div>

      {isEdit && (
        <div className="space-y-2">
          <Label>Status</Label>
          <div className="flex gap-2">
            {[{ value: true, label: "Ativo" }, { value: false, label: "Inativo" }].map(({ value, label }) => (
              <Button
                key={label}
                type="button"
                variant={formData.isActive === value ? "default" : "outline"}
                size="sm"
                onClick={() => setFormData({ ...formData, isActive: value })}
              >
                {label}
              </Button>
            ))}
          </div>
        </div>
      )}

      <div className="flex justify-end gap-2 pt-2 border-t">
        {onCancel && <Button type="button" variant="outline" onClick={onCancel} disabled={loading}>Cancelar</Button>}
        <Button type="submit" disabled={loading}>
          {loading ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Salvando...</> : isEdit ? "Atualizar" : "Criar Departamento"}
        </Button>
      </div>
    </form>
  );
}
