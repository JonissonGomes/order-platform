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
import { formatPhone } from "@/lib/formatters";
import type { Employee, EmployeeRole, Department } from "@/types";
import { Plus, Search, Users, Loader2, Edit, Trash2, Check, ChevronsUpDown, Filter } from "lucide-react";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

const roleLabels: Record<EmployeeRole, string> = {
  admin: "Administrador",
  department_manager: "Gerente",
  attendant: "Atendente",
  technician: "Técnico",
};

export default function Employees() {
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [roleFilter, setRoleFilter] = useState<string>("all");
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [editingEmployee, setEditingEmployee] = useState<Employee | null>(null);

  useEffect(() => {
    loadEmployees();
  }, [roleFilter]);

  const loadEmployees = async () => {
    try {
      setLoading(true);
      const response = await api.listEmployees();
      let filtered = response.employees || [];
      
      // Filtrar por perfil se selecionado
      if (roleFilter !== "all") {
        filtered = filtered.filter((emp) => emp.role === roleFilter);
      }
      
      setEmployees(filtered);
    } catch (error: any) {
      // Se for 404 (não encontrado), apenas definir array vazio sem mostrar erro
      if (error.message === "status: 404" || error.message?.includes("404")) {
        setEmployees([]);
        return;
      }
      // Apenas mostrar erro se não for 404
      if (error.message && error.message.trim() !== "" && !error.message.includes("status: 404")) {
        toast.error(error.message || "Erro ao carregar colaboradores");
      }
    } finally {
      setLoading(false);
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
            <DialogContent className="max-w-2xl">
              <DialogHeader className="flex-shrink-0 px-4 sm:px-6 pt-4 sm:pt-6 pb-3 sm:pb-4 border-b">
                <DialogTitle className="text-lg sm:text-xl">Novo Colaborador</DialogTitle>
                <DialogDescription className="text-sm">
                  Preencha os dados para cadastrar um novo colaborador
                </DialogDescription>
              </DialogHeader>
              <div className="flex-1 overflow-y-auto px-4 sm:px-6 py-4">
                <CreateEmployeeForm onSuccess={() => {
                  setIsCreateDialogOpen(false);
                  loadEmployees();
                }} />
              </div>
            </DialogContent>
          </Dialog>
        </div>

        <div className="flex flex-col sm:flex-row gap-2 sm:gap-4">
          <div className="relative flex-1 min-w-0">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Buscar por nome, email, telefone ou perfil..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10 w-full"
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
                .sort(([, labelA], [, labelB]) => labelA.localeCompare(labelB))
                .map(([value, label]) => (
                  <SelectItem key={value} value={value}>
                    {label}
                  </SelectItem>
                ))}
            </SelectContent>
          </Select>
        </div>

        {loading ? (
          <div className="text-center py-8 text-muted-foreground">Carregando...</div>
        ) : filteredEmployees.length === 0 ? (
          <Card>
            <CardContent className="py-8 text-center text-muted-foreground">
              Nenhum colaborador encontrado
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-4">
            {filteredEmployees.map((employee) => (
              <EmployeeCard key={employee.id} employee={employee} onUpdate={loadEmployees} />
            ))}
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}

function EmployeeCard({ employee, onUpdate }: { employee: Employee; onUpdate: () => void }) {
  const [showEditDialog, setShowEditDialog] = useState(false);

  return (
    <>
      <Card className="hover:shadow-md transition-shadow w-full">
        <CardHeader>
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 sm:gap-4">
            <div className="flex-1 min-w-0">
              <CardTitle className="text-base sm:text-lg truncate">{employee.name}</CardTitle>
              <CardDescription className="text-xs sm:text-sm break-words">
                {employee.email} {employee.phone && `• ${formatPhone(employee.phone)}`}
              </CardDescription>
            </div>
            <div className="flex items-center gap-2 flex-shrink-0">
              <span className={`px-2 sm:px-3 py-1 rounded-full text-xs font-medium whitespace-nowrap ${
                employee.isActive 
                  ? "bg-green-100 text-green-800" 
                  : "bg-gray-100 text-gray-800"
              }`}>
                {employee.isActive ? "Ativo" : "Inativo"}
              </span>
              <span className="px-2 sm:px-3 py-1 rounded-full text-xs font-medium whitespace-nowrap bg-blue-100 text-blue-800">
                {roleLabels[employee.role]}
              </span>
              <Button
                variant="ghost"
                size="icon"
                onClick={() => setShowEditDialog(true)}
                className="h-8 w-8"
              >
                <Edit className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="space-y-2 text-sm">
            {employee.department && (
              <p className="text-muted-foreground">
                <strong>Departamento:</strong> {employee.department.name}
              </p>
            )}
            <p className="text-muted-foreground text-xs">
              Criado em {new Date(employee.createdAt).toLocaleDateString("pt-BR")}
            </p>
          </div>
        </CardContent>
      </Card>

      {showEditDialog && (
        <EditEmployeeDialog
          employee={employee}
          open={showEditDialog}
          onOpenChange={setShowEditDialog}
          onSuccess={() => {
            setShowEditDialog(false);
            onUpdate();
          }}
        />
      )}
    </>
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
    loadDepartments();
  }, []);

  const loadDepartments = async () => {
    try {
      const response = await api.listDepartments();
      setDepartments(response.departments || []);
    } catch (error) {
      // Silently fail
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (formData.password !== formData.confirmPassword) {
      toast.error("As senhas não coincidem");
      return;
    }

    try {
      setLoading(true);
      const payload: any = {
        name: formData.name,
        email: formData.email,
        password: formData.password,
        phone: formData.phone || undefined,
        role: formData.role,
        departmentId: formData.departmentId || undefined,
      };

      await api.createEmployee(payload);
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
        <Input
          id="name"
          value={formData.name}
          onChange={(e) => setFormData({ ...formData, name: e.target.value })}
          required
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="email">Email *</Label>
        <Input
          id="email"
          type="email"
          value={formData.email}
          onChange={(e) => setFormData({ ...formData, email: e.target.value })}
          required
        />
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="password">Senha *</Label>
          <Input
            id="password"
            type="password"
            value={formData.password}
            onChange={(e) => setFormData({ ...formData, password: e.target.value })}
            required
            minLength={6}
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="confirmPassword">Confirmar Senha *</Label>
          <Input
            id="confirmPassword"
            type="password"
            value={formData.confirmPassword}
            onChange={(e) => setFormData({ ...formData, confirmPassword: e.target.value })}
            required
            minLength={6}
          />
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="phone">Telefone</Label>
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
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="role">Perfil *</Label>
          <Select
            value={formData.role}
            onValueChange={(value) => setFormData({ ...formData, role: value as EmployeeRole })}
          >
            <SelectTrigger>
              <SelectValue placeholder="Selecione um perfil" />
            </SelectTrigger>
            <SelectContent>
              {Object.entries(roleLabels)
                .sort(([, labelA], [, labelB]) => labelA.localeCompare(labelB))
                .map(([value, label]) => (
                  <SelectItem key={value} value={value}>
                    {label}
                  </SelectItem>
                ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="space-y-2">
        <Label>Departamento (opcional)</Label>
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
            <Command shouldFilter={true}>
              <CommandInput 
                placeholder="Digite para buscar por nome ou descrição..." 
                className="h-9" 
              />
              <CommandList className="max-h-[200px] overflow-y-auto">
                <CommandEmpty>Nenhum departamento encontrado.</CommandEmpty>
                <CommandGroup>
                  <CommandItem
                    value=""
                    onSelect={() => {
                      setFormData({ ...formData, departmentId: "" });
                      setDepartmentOpen(false);
                    }}
                    className="cursor-pointer"
                  >
                    <Check
                      className={cn(
                        "mr-2 h-4 w-4 flex-shrink-0",
                        formData.departmentId === "" ? "opacity-100" : "opacity-0"
                      )}
                    />
                    <span>Nenhum departamento</span>
                  </CommandItem>
                  {departments.map((department) => (
                    <CommandItem
                      key={department.id}
                      value={`${department.name} ${department.description || ""}`}
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
                        <span className="truncate font-medium">{department.name}</span>
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

      <div className="flex justify-end gap-2 pt-4">
        <Button type="submit" disabled={loading}>
          {loading ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Criando...
            </>
          ) : (
            "Criar Colaborador"
          )}
        </Button>
      </div>
    </form>
  );
}

function EditEmployeeDialog({
  employee,
  open,
  onOpenChange,
  onSuccess,
}: {
  employee: Employee;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
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
    loadDepartments();
  }, []);

  const loadDepartments = async () => {
    try {
      const response = await api.listDepartments();
      setDepartments(response.departments || []);
    } catch (error) {
      // Silently fail
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setLoading(true);
      const payload: any = {
        name: formData.name,
        phone: formData.phone || undefined,
        role: formData.role,
        departmentId: formData.departmentId || undefined,
        isActive: formData.isActive,
      };

      await api.updateEmployee(employee.id, payload);
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
      <DialogContent className="max-w-2xl">
        <DialogHeader className="flex-shrink-0 px-4 sm:px-6 pt-4 sm:pt-6 pb-3 sm:pb-4 border-b">
          <DialogTitle className="text-lg sm:text-xl">Editar Colaborador</DialogTitle>
          <DialogDescription className="text-sm">
            Atualize as informações do colaborador
          </DialogDescription>
        </DialogHeader>
        <div className="flex-1 overflow-y-auto px-4 sm:px-6 py-4">
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
              <Label htmlFor="edit-phone">Telefone</Label>
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
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="edit-role">Perfil *</Label>
              <Select
                value={formData.role}
                onValueChange={(value) => setFormData({ ...formData, role: value as EmployeeRole })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Selecione um perfil" />
                </SelectTrigger>
                <SelectContent>
                  {Object.entries(roleLabels)
                    .sort(([, labelA], [, labelB]) => labelA.localeCompare(labelB))
                    .map(([value, label]) => (
                      <SelectItem key={value} value={value}>
                        {label}
                      </SelectItem>
                    ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Departamento (opcional)</Label>
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
                  <Command shouldFilter={true}>
                    <CommandInput 
                      placeholder="Digite para buscar por nome ou descrição..." 
                      className="h-9" 
                    />
                    <CommandList className="max-h-[200px] overflow-y-auto">
                      <CommandEmpty>Nenhum departamento encontrado.</CommandEmpty>
                      <CommandGroup>
                        <CommandItem
                          value=""
                          onSelect={() => {
                            setFormData({ ...formData, departmentId: "" });
                            setDepartmentOpen(false);
                          }}
                          className="cursor-pointer"
                        >
                          <Check
                            className={cn(
                              "mr-2 h-4 w-4 flex-shrink-0",
                              formData.departmentId === "" ? "opacity-100" : "opacity-0"
                            )}
                          />
                          <span>Nenhum departamento</span>
                        </CommandItem>
                        {departments.map((department) => (
                          <CommandItem
                            key={department.id}
                            value={`${department.name} ${department.description || ""}`}
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
                              <span className="truncate font-medium">{department.name}</span>
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

            <div className="space-y-2">
              <Label htmlFor="edit-isActive">Status</Label>
              <Select
                value={formData.isActive ? "active" : "inactive"}
                onValueChange={(value) => setFormData({ ...formData, isActive: value === "active" })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="active">Ativo</SelectItem>
                  <SelectItem value="inactive">Inativo</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="flex justify-end gap-2 pt-4">
              <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={loading}>
                Cancelar
              </Button>
              <Button type="submit" disabled={loading}>
                {loading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Atualizando...
                  </>
                ) : (
                  "Atualizar Colaborador"
                )}
              </Button>
            </div>
          </form>
        </div>
      </DialogContent>
    </Dialog>
  );
}
