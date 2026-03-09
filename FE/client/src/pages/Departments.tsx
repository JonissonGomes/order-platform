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
import type { Department, Employee } from "@/types";
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
import { Plus, Building2, Check, ChevronsUpDown, Edit, Trash2 } from "lucide-react";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

export default function Departments() {
  const [departments, setDepartments] = useState<Department[]>([]);
  const [loading, setLoading] = useState(true);
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [editingDepartment, setEditingDepartment] = useState<Department | null>(null);
  const [deletingDepartment, setDeletingDepartment] = useState<Department | null>(null);

  useEffect(() => {
    loadDepartments();
  }, []);

  const loadDepartments = async () => {
    try {
      setLoading(true);
      const response = await api.listDepartments({ isActive: true });
      setDepartments(response.departments || []);
    } catch (error: any) {
      // Se for 404 (não encontrado), apenas definir array vazio sem mostrar erro
      if (error.message === "status: 404" || error.message?.includes("404")) {
        setDepartments([]);
        return;
      }
      // Apenas mostrar erro se não for 404
      if (error.message && error.message.trim() !== "" && !error.message.includes("status: 404")) {
        toast.error(error.message || "Erro ao carregar departamentos");
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <DashboardLayout>
      <div className="space-y-6 w-full min-w-0">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Departamentos</h1>
            <p className="text-muted-foreground">Gerencie os departamentos do sistema</p>
          </div>
          <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
            <DialogTrigger asChild>
              <Button>
                <Plus className="mr-2 h-4 w-4" />
                Novo Departamento
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader className="flex-shrink-0 px-4 sm:px-6 pt-4 sm:pt-6 pb-3 sm:pb-4 border-b">
                <DialogTitle className="text-lg sm:text-xl">Novo Departamento</DialogTitle>
                <DialogDescription className="text-sm">
                  Preencha os dados para criar um novo departamento
                </DialogDescription>
              </DialogHeader>
              <div className="flex-1 overflow-y-auto px-4 sm:px-6 py-4">
                <CreateDepartmentForm onSuccess={() => {
                  setIsCreateDialogOpen(false);
                  loadDepartments();
                }} />
              </div>
            </DialogContent>
          </Dialog>
        </div>

        {loading ? (
          <div className="text-center py-8 text-muted-foreground">Carregando...</div>
        ) : departments.length === 0 ? (
          <Card>
            <CardContent className="py-8 text-center text-muted-foreground">
              Nenhum departamento encontrado
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3">
            {departments.map((department) => (
              <DepartmentCard 
                key={department.id} 
                department={department}
                onEdit={() => setEditingDepartment(department)}
                onDelete={() => setDeletingDepartment(department)}
              />
            ))}
          </div>
        )}

        {/* Edit Dialog */}
        {editingDepartment && (
          <Dialog open={!!editingDepartment} onOpenChange={(open) => !open && setEditingDepartment(null)}>
            <DialogContent>
              <DialogHeader className="flex-shrink-0 px-4 sm:px-6 pt-4 sm:pt-6 pb-3 sm:pb-4 border-b">
                <DialogTitle className="text-lg sm:text-xl">Editar Departamento</DialogTitle>
                <DialogDescription className="text-sm">
                  Atualize os dados do departamento
                </DialogDescription>
              </DialogHeader>
              <div className="flex-1 overflow-y-auto px-4 sm:px-6 py-4">
                <EditDepartmentForm 
                  department={editingDepartment}
                  onSuccess={() => {
                    setEditingDepartment(null);
                    loadDepartments();
                  }}
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
                Tem certeza que deseja excluir o departamento {deletingDepartment?.name}? Esta ação não pode ser desfeita.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancelar</AlertDialogCancel>
              <AlertDialogAction
                onClick={async () => {
                  if (deletingDepartment) {
                    try {
                      await api.deleteDepartment(deletingDepartment.id);
                      toast.success("Departamento excluído com sucesso!");
                      setDeletingDepartment(null);
                      loadDepartments();
                    } catch (error: any) {
                      toast.error(error.message || "Erro ao excluir departamento");
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

function DepartmentCard({ department, onEdit, onDelete }: { department: Department; onEdit: () => void; onDelete: () => void }) {
  return (
    <Card className="hover:shadow-md transition-shadow w-full">
      <CardHeader>
        <div className="flex items-start justify-between gap-2">
          <div className="flex items-center gap-3 min-w-0 flex-1">
            <div className="p-2 bg-purple-100 rounded-full flex-shrink-0">
              <Building2 className="h-5 w-5 text-purple-600" />
            </div>
            <div className="min-w-0 flex-1">
              <CardTitle className="text-base sm:text-lg truncate">{department.name}</CardTitle>
              {department.description && (
                <CardDescription className="text-xs sm:text-sm break-words">{department.description}</CardDescription>
              )}
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
          <p className={`inline-block px-2 py-1 rounded-full text-xs font-medium ${
            department.isActive
              ? "bg-green-100 text-green-800"
              : "bg-red-100 text-red-800"
          }`}>
            {department.isActive ? "Ativo" : "Inativo"}
          </p>
          {department.manager && (
            <p className="text-muted-foreground break-words">
              <strong>Gerente:</strong> {department.manager.name}
            </p>
          )}
          <p className="text-muted-foreground text-xs">
            Criado em {new Date(department.createdAt).toLocaleDateString("pt-BR")}
          </p>
        </div>
      </CardContent>
    </Card>
  );
}

function CreateDepartmentForm({ onSuccess }: { onSuccess: () => void }) {
  const [loading, setLoading] = useState(false);
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [managerOpen, setManagerOpen] = useState(false);
  const [formData, setFormData] = useState({
    name: "",
    description: "",
    managerId: "",
  });

  useEffect(() => {
    loadEmployees();
  }, []);

  const loadEmployees = async () => {
    try {
      const response = await api.listEmployees();
      // Filtrar apenas colaboradores que podem ser gerentes (admin ou department_manager)
      const managers = (response.employees || []).filter(
        (emp) => emp.role === "admin" || emp.role === "department_manager"
      );
      setEmployees(managers);
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
        description: formData.description,
      };
      if (formData.managerId) {
        payload.managerId = formData.managerId;
      }
      await api.createDepartment(payload);
      toast.success("Departamento criado com sucesso!");
      onSuccess();
    } catch (error: any) {
      toast.error(error.message || "Erro ao criar departamento");
    } finally {
      setLoading(false);
    }
  };

  const selectedManager = employees.find((e) => e.id === formData.managerId);

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
        <Label htmlFor="description">Descrição</Label>
        <textarea
          id="description"
          className="w-full min-h-[80px] px-3 py-2 border rounded-md"
          value={formData.description}
          onChange={(e) => setFormData({ ...formData, description: e.target.value })}
        />
      </div>
      <div className="space-y-2">
        <Label>Gerente (opcional)</Label>
        <Popover open={managerOpen} onOpenChange={setManagerOpen}>
          <PopoverTrigger asChild>
            <Button
              variant="outline"
              role="combobox"
              aria-expanded={managerOpen}
              className="w-full justify-between"
            >
              {selectedManager
                ? `${selectedManager.name} - ${selectedManager.role === "admin" ? "Administrador" : selectedManager.role === "department_manager" ? "Gerente" : selectedManager.role}`
                : "Selecione um gerente..."}
              <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-[var(--radix-popover-trigger-width)] max-w-[calc(100vw-2rem)] p-0" align="start">
            <Command shouldFilter={true}>
              <CommandInput 
                placeholder="Digite para buscar por nome, email ou perfil..." 
                className="h-9" 
              />
              <CommandList className="max-h-[200px] overflow-y-auto">
                <CommandEmpty>Nenhum colaborador encontrado.</CommandEmpty>
                <CommandGroup>
                  {employees.map((employee) => {
                    const roleLabel = employee.role === "admin" ? "Administrador" :
                                     employee.role === "department_manager" ? "Gerente" :
                                     employee.role === "attendant" ? "Atendente" :
                                     employee.role === "technician" ? "Técnico" : employee.role;
                    return (
                      <CommandItem
                        key={employee.id}
                        value={`${employee.name} ${employee.email} ${roleLabel}`}
                        onSelect={() => {
                          setFormData({ ...formData, managerId: employee.id });
                          setManagerOpen(false);
                        }}
                        className="cursor-pointer"
                      >
                        <Check
                          className={cn(
                            "mr-2 h-4 w-4 flex-shrink-0",
                            formData.managerId === employee.id ? "opacity-100" : "opacity-0"
                          )}
                        />
                        <div className="flex flex-col min-w-0 flex-1">
                          <span className="truncate font-medium">{employee.name}</span>
                          <span className="text-xs text-muted-foreground truncate">
                            {roleLabel} • {employee.email}
                          </span>
                        </div>
                      </CommandItem>
                    );
                  })}
                </CommandGroup>
              </CommandList>
            </Command>
          </PopoverContent>
        </Popover>
      </div>
      <div className="flex justify-end gap-2">
        <Button type="submit" disabled={loading}>
          {loading ? "Criando..." : "Criar Departamento"}
        </Button>
      </div>
    </form>
  );
}

function EditDepartmentForm({ 
  department, 
  onSuccess, 
  onCancel 
}: { 
  department: Department; 
  onSuccess: () => void;
  onCancel: () => void;
}) {
  const [loading, setLoading] = useState(false);
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [managerOpen, setManagerOpen] = useState(false);
  const [formData, setFormData] = useState({
    name: department.name || "",
    description: department.description || "",
    managerId: department.managerId || "",
  });

  useEffect(() => {
    loadEmployees();
  }, []);

  const loadEmployees = async () => {
    try {
      const response = await api.listEmployees();
      // Filtrar apenas colaboradores que podem ser gerentes (admin ou department_manager)
      const managers = (response.employees || []).filter(
        (emp) => emp.role === "admin" || emp.role === "department_manager"
      );
      setEmployees(managers);
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
        description: formData.description,
      };
      if (formData.managerId) {
        payload.managerId = formData.managerId;
      }
      await api.updateDepartment(department.id, payload);
      toast.success("Departamento atualizado com sucesso!");
      onSuccess();
    } catch (error: any) {
      toast.error(error.message || "Erro ao atualizar departamento");
    } finally {
      setLoading(false);
    }
  };

  const selectedManager = employees.find((e) => e.id === formData.managerId);

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
        <Label htmlFor="edit-description">Descrição</Label>
        <textarea
          id="edit-description"
          className="w-full min-h-[80px] px-3 py-2 border rounded-md"
          value={formData.description}
          onChange={(e) => setFormData({ ...formData, description: e.target.value })}
        />
      </div>
      <div className="space-y-2">
        <Label>Gerente (opcional)</Label>
        <Popover open={managerOpen} onOpenChange={setManagerOpen}>
          <PopoverTrigger asChild>
            <Button
              variant="outline"
              role="combobox"
              aria-expanded={managerOpen}
              className="w-full justify-between"
            >
              {selectedManager
                ? `${selectedManager.name} - ${selectedManager.role}`
                : "Selecione um gerente..."}
              <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-[var(--radix-popover-trigger-width)] max-w-[calc(100vw-2rem)] p-0" align="start">
            <Command shouldFilter={true}>
              <CommandInput 
                placeholder="Digite para buscar por nome, email ou perfil..." 
                className="h-9" 
              />
              <CommandList className="max-h-[200px] overflow-y-auto">
                <CommandEmpty>Nenhum colaborador encontrado.</CommandEmpty>
                <CommandGroup>
                  {employees.map((employee) => {
                    const roleLabel = employee.role === "admin" ? "Administrador" :
                                     employee.role === "department_manager" ? "Gerente" :
                                     employee.role === "attendant" ? "Atendente" :
                                     employee.role === "technician" ? "Técnico" : employee.role;
                    return (
                      <CommandItem
                        key={employee.id}
                        value={`${employee.name} ${employee.email} ${roleLabel}`}
                        onSelect={() => {
                          setFormData({ ...formData, managerId: employee.id });
                          setManagerOpen(false);
                        }}
                        className="cursor-pointer"
                      >
                        <Check
                          className={cn(
                            "mr-2 h-4 w-4 flex-shrink-0",
                            formData.managerId === employee.id ? "opacity-100" : "opacity-0"
                          )}
                        />
                        <div className="flex flex-col min-w-0 flex-1">
                          <span className="truncate font-medium">{employee.name}</span>
                          <span className="text-xs text-muted-foreground truncate">
                            {roleLabel} • {employee.email}
                          </span>
                        </div>
                      </CommandItem>
                    );
                  })}
                </CommandGroup>
              </CommandList>
            </Command>
          </PopoverContent>
        </Popover>
      </div>
      <div className="flex justify-end gap-2">
        <Button type="button" variant="outline" onClick={onCancel} disabled={loading}>
          Cancelar
        </Button>
        <Button type="submit" disabled={loading}>
          {loading ? "Atualizando..." : "Atualizar Departamento"}
        </Button>
      </div>
    </form>
  );
}
