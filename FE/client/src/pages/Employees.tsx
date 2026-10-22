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
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { api } from "@/lib/api";
import { formatPhone } from "@/lib/formatters";
import type { Employee, EmployeeRole, Department } from "@/types";
import { Plus, Search, Users, Loader2, Edit, Trash2, Check, ChevronsUpDown, Filter, UserCircle, ShieldOff, ShieldCheck } from "lucide-react";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

const roleLabels: Record<EmployeeRole, string> = {
  admin: "Administrador",
  department_manager: "Gerente",
  attendant: "Atendente",
  technician: "Técnico",
};

const roleBadgeColor: Record<EmployeeRole, string> = {
  admin: "bg-purple-100 text-purple-800",
  department_manager: "bg-blue-100 text-blue-800",
  attendant: "bg-green-100 text-green-800",
  technician: "bg-orange-100 text-orange-800",
};

export default function Employees() {
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [roleFilter, setRoleFilter] = useState<string>("all");
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [selectedEmployee, setSelectedEmployee] = useState<Employee | null>(null);
  const [editingEmployee, setEditingEmployee] = useState<Employee | null>(null);
  const [deletingEmployee, setDeletingEmployee] = useState<Employee | null>(null);
  const [suspendingEmployee, setSuspendingEmployee] = useState<Employee | null>(null);

  useEffect(() => {
    loadEmployees();
  }, [roleFilter]);

  const loadEmployees = async () => {
    try {
      setLoading(true);
      const response = await api.listEmployees();
      let filtered = response.employees || [];
      if (roleFilter !== "all") {
        filtered = filtered.filter((emp) => emp.role === roleFilter);
      }
      setEmployees(filtered);
    } catch (error: any) {
      if (error.message === "status: 404" || error.message?.includes("404")) {
        setEmployees([]);
        return;
      }
      if (error.message && !error.message.includes("status: 404")) {
        toast.error(error.message || "Erro ao carregar colaboradores");
      }
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async () => {
    if (!deletingEmployee) return;
    try {
      await api.updateEmployee(deletingEmployee.id, { isActive: false });
      toast.success("Colaborador desativado com sucesso!");
      setDeletingEmployee(null);
      setSelectedEmployee(null);
      loadEmployees();
    } catch (error: any) {
      toast.error(error.message || "Erro ao desativar colaborador");
    }
  };

  const handleSuspend = async () => {
    if (!suspendingEmployee) return;
    try {
      if (suspendingEmployee.isSuspended) {
        await api.unsuspendEmployee(suspendingEmployee.id);
        toast.success("Colaborador reativado com sucesso!");
      } else {
        await api.suspendEmployee(suspendingEmployee.id);
        toast.success("Colaborador suspenso com sucesso!");
      }
      setSuspendingEmployee(null);
      setSelectedEmployee(null);
      loadEmployees();
    } catch (error: any) {
      toast.error(error.message || "Erro ao alterar suspensão do colaborador");
    }
  };

  const filteredEmployees = employees.filter((employee) => {
    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      return (
        employee.name.toLowerCase().includes(term) ||
        employee.email.toLowerCase().includes(term) ||
        (employee.phone && employee.phone.includes(term)) ||
        roleLabels[employee.role].toLowerCase().includes(term)
      );
    }
    return true;
  });

  return (
    <DashboardLayout>
      <div className="space-y-6 w-full min-w-0">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Colaboradores</h1>
            <p className="text-muted-foreground">Gerencie todos os colaboradores do sistema</p>
          </div>
          <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
            <DialogTrigger asChild>
              <Button>
                <Plus className="mr-2 h-4 w-4" />
                Novo Colaborador
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl max-h-[90vh] flex flex-col">
              <DialogHeader className="px-6 pt-6 pb-4 border-b">
                <DialogTitle className="text-xl">Novo Colaborador</DialogTitle>
                <DialogDescription className="mt-1.5">Preencha os dados para cadastrar um novo colaborador</DialogDescription>
              </DialogHeader>
              <div className="flex-1 overflow-y-auto px-6 py-6">
                <CreateEmployeeForm onSuccess={() => { setIsCreateDialogOpen(false); loadEmployees(); }} />
              </div>
            </DialogContent>
          </Dialog>
        </div>

        <div className="flex flex-col sm:flex-row gap-2 sm:gap-4">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Buscar por nome, email ou telefone..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
            />
          </div>
          <Select value={roleFilter} onValueChange={setRoleFilter}>
            <SelectTrigger className="w-full sm:w-[200px]">
              <div className="flex items-center gap-2">
                <Filter className="h-4 w-4 text-muted-foreground" />
                <SelectValue placeholder="Filtrar por perfil" />
              </div>
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos os perfis</SelectItem>
              {Object.entries(roleLabels)
                .sort(([, a], [, b]) => a.localeCompare(b))
                .map(([value, label]) => (
                  <SelectItem key={value} value={value}>{label}</SelectItem>
                ))}
            </SelectContent>
          </Select>
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
          </div>
        ) : filteredEmployees.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12 text-muted-foreground gap-3">
            <Users className="h-12 w-12 opacity-30" />
            <p>Nenhum colaborador encontrado</p>
          </div>
        ) : (
          <div className="rounded-md border overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow className="bg-muted/50">
                  <TableHead>Nome</TableHead>
                  <TableHead className="hidden sm:table-cell">Email</TableHead>
                  <TableHead className="hidden md:table-cell">Telefone</TableHead>
                  <TableHead>Perfil</TableHead>
                  <TableHead className="hidden lg:table-cell">Departamento</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredEmployees.map((employee) => (
                  <TableRow
                    key={employee.id}
                    className="cursor-pointer hover:bg-muted/50 transition-colors"
                    onClick={() => setSelectedEmployee(employee)}
                  >
                    <TableCell className="font-medium">{employee.name}</TableCell>
                    <TableCell className="hidden sm:table-cell text-muted-foreground text-sm">{employee.email}</TableCell>
                    <TableCell className="hidden md:table-cell text-muted-foreground text-sm">
                      {employee.phone ? formatPhone(employee.phone) : "—"}
                    </TableCell>
                    <TableCell>
                      <span className={`px-2 py-1 rounded-full text-xs font-medium ${roleBadgeColor[employee.role]}`}>
                        {roleLabels[employee.role]}
                      </span>
                    </TableCell>
                    <TableCell className="hidden lg:table-cell text-muted-foreground text-sm">
                      {employee.department?.name || "—"}
                    </TableCell>
                    <TableCell>
                      {employee.isSuspended ? (
                        <Badge variant="destructive" className="text-xs">Suspenso</Badge>
                      ) : (
                        <Badge variant={employee.isActive ? "default" : "secondary"} className="text-xs">
                          {employee.isActive ? "Ativo" : "Inativo"}
                        </Badge>
                      )}
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex items-center justify-end gap-1" onClick={(e) => e.stopPropagation()}>
                        <Button
                          variant="ghost" size="icon" className="h-8 w-8"
                          title={employee.isSuspended ? "Reativar" : "Suspender"}
                          onClick={() => setSuspendingEmployee(employee)}
                        >
                          {employee.isSuspended
                            ? <ShieldCheck className="h-4 w-4 text-green-600" />
                            : <ShieldOff className="h-4 w-4 text-amber-500" />}
                        </Button>
                        <Button
                          variant="ghost" size="icon" className="h-8 w-8"
                          title="Editar"
                          onClick={() => { setEditingEmployee(employee); setSelectedEmployee(null); }}
                        >
                          <Edit className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost" size="icon" className="h-8 w-8 text-destructive hover:text-destructive"
                          title="Desativar"
                          onClick={() => { setDeletingEmployee(employee); setSelectedEmployee(null); }}
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

      {/* Detail/View Modal */}
      {selectedEmployee && !editingEmployee && (
        <Dialog open={!!selectedEmployee} onOpenChange={(open) => !open && setSelectedEmployee(null)}>
          <DialogContent className="max-w-lg max-h-[90vh] flex flex-col">
            <DialogHeader className="px-6 pt-6 pb-4 border-b">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-full bg-blue-100">
                  <UserCircle className="h-6 w-6 text-blue-600" />
                </div>
                <div>
                  <DialogTitle className="text-xl">{selectedEmployee.name}</DialogTitle>
                  <DialogDescription className="mt-1.5">{selectedEmployee.email}</DialogDescription>
                </div>
              </div>
            </DialogHeader>
            <div className="flex-1 overflow-y-auto px-6 py-6">
              <div className="space-y-4 text-sm">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <p className="text-xs text-muted-foreground font-medium uppercase tracking-wide">Perfil</p>
                  <p className="mt-1">
                    <span className={`px-2 py-1 rounded-full text-xs font-medium ${roleBadgeColor[selectedEmployee.role]}`}>
                      {roleLabels[selectedEmployee.role]}
                    </span>
                  </p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground font-medium uppercase tracking-wide">Status</p>
                  <p className="mt-1">
                    {selectedEmployee.isSuspended ? (
                      <Badge variant="destructive">Suspenso</Badge>
                    ) : (
                      <Badge variant={selectedEmployee.isActive ? "default" : "secondary"}>
                        {selectedEmployee.isActive ? "Ativo" : "Inativo"}
                      </Badge>
                    )}
                  </p>
                </div>
              </div>
              {selectedEmployee.phone && (
                <div>
                  <p className="text-xs text-muted-foreground font-medium uppercase tracking-wide">Telefone</p>
                  <p className="mt-1">{formatPhone(selectedEmployee.phone)}</p>
                </div>
              )}
              {selectedEmployee.department && (
                <div>
                  <p className="text-xs text-muted-foreground font-medium uppercase tracking-wide">Departamento</p>
                  <p className="mt-1">{selectedEmployee.department.name}</p>
                </div>
              )}
              <div>
                <p className="text-xs text-muted-foreground font-medium uppercase tracking-wide">Cadastrado em</p>
                <p className="mt-1">{new Date(selectedEmployee.createdAt).toLocaleDateString("pt-BR")}</p>
              </div>
              </div>
            </div>
            <div className="px-6 py-4 border-t bg-muted/30 flex justify-between items-center">
              <Button
                variant="ghost"
                size="sm"
                className={selectedEmployee.isSuspended ? "text-green-600 hover:text-green-700" : "text-amber-600 hover:text-amber-700"}
                onClick={() => { setSuspendingEmployee(selectedEmployee); setSelectedEmployee(null); }}
              >
                {selectedEmployee.isSuspended
                  ? <><ShieldCheck className="h-4 w-4 mr-1" /> Reativar</>
                  : <><ShieldOff className="h-4 w-4 mr-1" /> Suspender</>}
              </Button>
              <div className="flex gap-1">
                <Button
                  variant="ghost"
                  size="icon"
                  className="text-destructive hover:text-destructive"
                  title="Desativar"
                  onClick={() => { setDeletingEmployee(selectedEmployee); setSelectedEmployee(null); }}
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  title="Editar"
                  onClick={() => { setEditingEmployee(selectedEmployee); setSelectedEmployee(null); }}
                >
                  <Edit className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      )}

      {/* Edit Dialog */}
      {editingEmployee && (
        <EditEmployeeDialog
          employee={editingEmployee}
          open={!!editingEmployee}
          onOpenChange={(open) => !open && setEditingEmployee(null)}
          onSuccess={() => { setEditingEmployee(null); loadEmployees(); }}
        />
      )}

      {/* Delete Confirmation */}
      <AlertDialog open={!!deletingEmployee} onOpenChange={(open) => !open && setDeletingEmployee(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirmar Desativação</AlertDialogTitle>
            <AlertDialogDescription>
              Deseja desativar o colaborador <strong>{deletingEmployee?.name}</strong>? 
              O colaborador não terá mais acesso ao sistema mas seus dados serão mantidos.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              Desativar
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Suspend/Unsuspend Confirmation */}
      <AlertDialog open={!!suspendingEmployee} onOpenChange={(open) => !open && setSuspendingEmployee(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {suspendingEmployee?.isSuspended ? "Reativar Colaborador" : "Suspender Colaborador"}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {suspendingEmployee?.isSuspended
                ? <>Deseja reativar o acesso de <strong>{suspendingEmployee?.name}</strong>? O colaborador poderá acessar o sistema novamente.</>
                : <>Deseja suspender o acesso de <strong>{suspendingEmployee?.name}</strong>? O colaborador não conseguirá acessar o sistema e verá uma mensagem informando que deve entrar em contato com o RH.</>}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleSuspend}
              className={suspendingEmployee?.isSuspended
                ? "bg-green-600 text-white hover:bg-green-700"
                : "bg-amber-600 text-white hover:bg-amber-700"}
            >
              {suspendingEmployee?.isSuspended ? "Reativar" : "Suspender"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </DashboardLayout>
  );
}

function CreateEmployeeForm({ onSuccess }: { onSuccess: () => void }) {
  const [loading, setLoading] = useState(false);
  const [departments, setDepartments] = useState<Department[]>([]);
  const [departmentOpen, setDepartmentOpen] = useState(false);
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    password: "",
    confirmPassword: "",
    phone: "",
    role: "attendant" as EmployeeRole,
    departmentId: "",
  });

  useEffect(() => {
    api.listDepartments().then((r) => setDepartments(r.departments || [])).catch(() => {});
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (formData.password !== formData.confirmPassword) {
      toast.error("As senhas não coincidem");
      return;
    }
    try {
      setLoading(true);
      await api.createEmployee({
        name: formData.name,
        email: formData.email,
        password: formData.password,
        phone: formData.phone || undefined,
        role: formData.role,
        departmentId: formData.departmentId || undefined,
      });
      toast.success("Colaborador criado com sucesso!");
      onSuccess();
    } catch (error: any) {
      toast.error(error.message || "Erro ao criar colaborador");
    } finally {
      setLoading(false);
    }
  };

  const selectedDepartment = departments.find((d) => d.id === formData.departmentId);

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="name">Nome *</Label>
        <Input id="name" value={formData.name} onChange={(e) => setFormData({ ...formData, name: e.target.value })} required />
      </div>

      <div className="space-y-2">
        <Label htmlFor="email">Email *</Label>
        <Input id="email" type="email" value={formData.email} onChange={(e) => setFormData({ ...formData, email: e.target.value })} required />
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="password">Senha *</Label>
          <Input id="password" type="password" value={formData.password} onChange={(e) => setFormData({ ...formData, password: e.target.value })} required minLength={6} />
        </div>
        <div className="space-y-2">
          <Label htmlFor="confirmPassword">Confirmar Senha *</Label>
          <Input id="confirmPassword" type="password" value={formData.confirmPassword} onChange={(e) => setFormData({ ...formData, confirmPassword: e.target.value })} required minLength={6} />
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="phone">Telefone</Label>
          <Input
            id="phone"
            value={formData.phone ? `(${formData.phone.slice(0,2)}) ${formData.phone.slice(2,7)}-${formData.phone.slice(7,11)}`.replace(/[\s\-\(\)]+$/, "").replace(/\((\d{0,2})\) ?$/, "($1)") : ""}
            onChange={(e) => {
              const raw = e.target.value.replace(/\D/g, "");
              if (raw.length <= 11) setFormData({ ...formData, phone: raw });
            }}
            placeholder="(00) 00000-0000"
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="role">Função *</Label>
          <Select value={formData.role} onValueChange={(v) => setFormData({ ...formData, role: v as EmployeeRole })}>
            <SelectTrigger>
              <SelectValue placeholder="Selecione" />
            </SelectTrigger>
            <SelectContent>
              {Object.entries(roleLabels).sort(([,a],[,b]) => a.localeCompare(b)).map(([value, label]) => (
                <SelectItem key={value} value={value}>{label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="space-y-2">
        <Label>Departamento (opcional)</Label>
        <Popover open={departmentOpen} onOpenChange={setDepartmentOpen}>
          <PopoverTrigger asChild>
            <Button variant="outline" role="combobox" aria-expanded={departmentOpen} className="w-full justify-between">
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
                  <CommandItem value="" onSelect={() => { setFormData({ ...formData, departmentId: "" }); setDepartmentOpen(false); }}>
                    <Check className={cn("mr-2 h-4 w-4", !formData.departmentId ? "opacity-100" : "opacity-0")} />
                    Nenhum
                  </CommandItem>
                  {departments.map((d) => (
                    <CommandItem key={d.id} value={`${d.name} ${d.description || ""}`} onSelect={() => { setFormData({ ...formData, departmentId: d.id }); setDepartmentOpen(false); }}>
                      <Check className={cn("mr-2 h-4 w-4", formData.departmentId === d.id ? "opacity-100" : "opacity-0")} />
                      {d.name}
                    </CommandItem>
                  ))}
                </CommandGroup>
              </CommandList>
            </Command>
          </PopoverContent>
        </Popover>
      </div>

      <div className="flex justify-end pt-2">
        <Button type="submit" disabled={loading}>
          {loading ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Criando...</> : "Criar Colaborador"}
        </Button>
      </div>
    </form>
  );
}

function EditEmployeeDialog({ employee, open, onOpenChange, onSuccess }: {
  employee: Employee; open: boolean; onOpenChange: (open: boolean) => void; onSuccess: () => void;
}) {
  const [loading, setLoading] = useState(false);
  const [departments, setDepartments] = useState<Department[]>([]);
  const [departmentOpen, setDepartmentOpen] = useState(false);
  const [formData, setFormData] = useState({
    name: employee.name,
    phone: employee.phone || "",
    role: employee.role,
    departmentId: employee.departmentId || "",
    isActive: employee.isActive,
  });

  useEffect(() => {
    api.listDepartments().then((r) => setDepartments(r.departments || [])).catch(() => {});
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setLoading(true);
      await api.updateEmployee(employee.id, {
        name: formData.name,
        phone: formData.phone || undefined,
        role: formData.role,
        departmentId: formData.departmentId || undefined,
        isActive: formData.isActive,
      });
      toast.success("Colaborador atualizado com sucesso!");
      onSuccess();
    } catch (error: any) {
      toast.error(error.message || "Erro ao atualizar colaborador");
    } finally {
      setLoading(false);
    }
  };

  const selectedDepartment = departments.find((d) => d.id === formData.departmentId);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg max-h-[90vh] flex flex-col">
        <DialogHeader className="px-6 pt-6 pb-4 border-b">
          <DialogTitle className="text-xl">Editar Colaborador</DialogTitle>
          <DialogDescription className="mt-1.5">Atualize as informações do colaborador</DialogDescription>
        </DialogHeader>
        <div className="flex-1 overflow-y-auto px-6 py-6">
          <form id="edit-employee-form" onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="edit-name">Nome *</Label>
            <Input id="edit-name" value={formData.name} onChange={(e) => setFormData({ ...formData, name: e.target.value })} required />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="edit-phone">Telefone</Label>
              <Input
                id="edit-phone"
                value={formData.phone ? `(${formData.phone.slice(0,2)}) ${formData.phone.slice(2,7)}-${formData.phone.slice(7,11)}`.replace(/[\s\-\(\)]+$/, "").replace(/\((\d{0,2})\) ?$/, "($1)") : ""}
                onChange={(e) => {
                  const raw = e.target.value.replace(/\D/g, "");
                  if (raw.length <= 11) setFormData({ ...formData, phone: raw });
                }}
                placeholder="(00) 00000-0000"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit-role">Função *</Label>
              <Select value={formData.role} onValueChange={(v) => setFormData({ ...formData, role: v as EmployeeRole })}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {Object.entries(roleLabels).sort(([,a],[,b]) => a.localeCompare(b)).map(([value, label]) => (
                    <SelectItem key={value} value={value}>{label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="space-y-2">
            <Label>Departamento</Label>
            <Popover open={departmentOpen} onOpenChange={setDepartmentOpen}>
              <PopoverTrigger asChild>
                <Button variant="outline" role="combobox" className="w-full justify-between">
                  {selectedDepartment ? selectedDepartment.name : "Nenhum departamento"}
                  <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-[var(--radix-popover-trigger-width)] p-0" align="start">
                <Command>
                  <CommandInput placeholder="Buscar..." className="h-9" />
                  <CommandList className="max-h-[180px]">
                    <CommandEmpty>Nenhum encontrado.</CommandEmpty>
                    <CommandGroup>
                      <CommandItem value="" onSelect={() => { setFormData({ ...formData, departmentId: "" }); setDepartmentOpen(false); }}>
                        <Check className={cn("mr-2 h-4 w-4", !formData.departmentId ? "opacity-100" : "opacity-0")} />
                        Nenhum
                      </CommandItem>
                      {departments.map((d) => (
                        <CommandItem key={d.id} value={`${d.name} ${d.description || ""}`} onSelect={() => { setFormData({ ...formData, departmentId: d.id }); setDepartmentOpen(false); }}>
                          <Check className={cn("mr-2 h-4 w-4", formData.departmentId === d.id ? "opacity-100" : "opacity-0")} />
                          {d.name}
                        </CommandItem>
                      ))}
                    </CommandGroup>
                  </CommandList>
                </Command>
              </PopoverContent>
            </Popover>
          </div>

          <div className="space-y-2">
            <Label>Status</Label>
            <Select value={formData.isActive ? "active" : "inactive"} onValueChange={(v) => setFormData({ ...formData, isActive: v === "active" })}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="active">Ativo</SelectItem>
                <SelectItem value="inactive">Inativo</SelectItem>
              </SelectContent>
            </Select>
          </div>

          </form>
        </div>
        <div className="px-6 py-4 border-t bg-muted/30 flex justify-end">
          <Button type="submit" form="edit-employee-form" disabled={loading}>
            {loading ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Salvando...</> : "Salvar"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
