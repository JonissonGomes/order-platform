import { useState, useEffect } from "react";
import DashboardLayout from "@/components/DashboardLayout";
import { api } from "@/lib/api";
import type { Profile } from "@/types";
import { MODULE_NAMES } from "@/types/modules";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Loader2, Save } from "lucide-react";
import { toast } from "sonner";
import { Separator } from "@/components/ui/separator";
import {
  permissionMatchesModule,
  moduleInEditOrDeletePermissions,
  modulePathToPermissionPrefix,
  modulePathToEditDeleteFormat,
} from "@/lib/permission-mapper";

export default function Profiles() {
  const [selectedRole, setSelectedRole] = useState<string>("");
  const [viewPermissions, setViewPermissions] = useState<Record<string, boolean>>({});
  const [createPermissions, setCreatePermissions] = useState<Record<string, boolean>>({});
  const [editPermissions, setEditPermissions] = useState<Record<string, boolean>>({});
  const [deletePermissions, setDeletePermissions] = useState<Record<string, boolean>>({});
  const [roles, setRoles] = useState<Profile[]>([]);
  const [availableModules, setAvailableModules] = useState<string[]>([]);
  const [roleData, setRoleData] = useState<Profile | null>(null);
  const [rolesLoading, setRolesLoading] = useState(true);
  const [modulesLoading, setModulesLoading] = useState(true);
  const [roleLoading, setRoleLoading] = useState(false);
  const [updateLoading, setUpdateLoading] = useState(false);

  useEffect(() => {
    loadRoles();
    loadAvailableModules();
  }, []);

  useEffect(() => {
    if (selectedRole) {
      loadRoleData();
    }
  }, [selectedRole]);

  // Load permissions when role data is loaded
  useEffect(() => {
    if (roleData) {
      const viewMap: Record<string, boolean> = {};
      const createMap: Record<string, boolean> = {};
      const editMap: Record<string, boolean> = {};
      const deleteMap: Record<string, boolean> = {};
      
      availableModules.forEach((module) => {
        // Verifica se alguma permissão do backend corresponde ao módulo
        const hasViewPermission = roleData.permissions?.some((perm) => 
          permissionMatchesModule(perm, module)
        ) || false;
        
        viewMap[module] = hasViewPermission;
        
        // Verifica se o módulo está nas permissões de edição (que inclui criar)
        const hasEditPermission = moduleInEditOrDeletePermissions(
          module,
          roleData.editPermissions || []
        );
        
        createMap[module] = hasEditPermission;
        editMap[module] = hasEditPermission;
        
        // Verifica se o módulo está nas permissões de exclusão
        deleteMap[module] = moduleInEditOrDeletePermissions(
          module,
          roleData.deletePermissions || []
        );
      });
      
      setViewPermissions(viewMap);
      setCreatePermissions(createMap);
      setEditPermissions(editMap);
      setDeletePermissions(deleteMap);
    } else {
      // Initialize all permissions as false
      const viewMap: Record<string, boolean> = {};
      const createMap: Record<string, boolean> = {};
      const editMap: Record<string, boolean> = {};
      const deleteMap: Record<string, boolean> = {};
      
      availableModules.forEach((module) => {
        viewMap[module] = false;
        createMap[module] = false;
        editMap[module] = false;
        deleteMap[module] = false;
      });
      
      setViewPermissions(viewMap);
      setCreatePermissions(createMap);
      setEditPermissions(editMap);
      setDeletePermissions(deleteMap);
    }
  }, [roleData, availableModules]);

  const loadRoles = async () => {
    try {
      setRolesLoading(true);
      const response = await api.listProfiles();
      setRoles(response.profiles || []);
    } catch (error: any) {
      if (error.message !== "status: 404" && error.message?.includes("404")) {
        setRoles([]);
        return;
      }
      if (error.message && error.message.trim() !== "" && !error.message.includes("status: 404")) {
        toast.error(error.message || "Erro ao carregar perfis");
      }
    } finally {
      setRolesLoading(false);
    }
  };

  const loadAvailableModules = async () => {
    try {
      setModulesLoading(true);
      const response = await api.getAvailableModules();
      const modules = response.modules || [];
      console.log("[Profiles] Available modules from API:", modules);
      
      // Garantir que os módulos do cliente estejam sempre incluídos
      const customerModules = ["/cliente/dashboard", "/cliente/perfil", "/cliente/ordens"];
      const allModules = [...modules];
      
      // Adicionar módulos do cliente se não estiverem presentes
      customerModules.forEach((customerModule) => {
        if (!allModules.includes(customerModule)) {
          allModules.push(customerModule);
          console.log(`[Profiles] Added missing customer module: ${customerModule}`);
        }
      });
      
      setAvailableModules(allModules);
      
      // If API returns empty or incomplete, use fallback
      if (allModules.length === 0 || allModules.length < 10) {
        console.warn("[Profiles] API returned incomplete modules, using fallback");
        setAvailableModules([
          "/dashboard",
          "/service-orders",
          "/customers",
          "/departments",
          "/employees",
          "/stock",
          "/financial",
          "/reports",
          "/profiles",
          "/settings",
          "/cliente/dashboard",
          "/cliente/perfil",
          "/cliente/ordens",
        ]);
      }
    } catch (error: any) {
      console.error("[Profiles] Error loading modules:", error);
      if (error.message && error.message.trim() !== "") {
        toast.error(error.message || "Erro ao carregar módulos disponíveis");
      }
      // Fallback to default modules (includes all modules)
      setAvailableModules([
        "/dashboard",
        "/service-orders",
        "/customers",
        "/departments",
        "/employees",
        "/stock",
        "/financial",
        "/reports",
        "/profiles",
        "/settings",
        "/cliente/dashboard",
        "/cliente/perfil",
        "/cliente/ordens",
      ]);
    } finally {
      setModulesLoading(false);
    }
  };

  const loadRoleData = async () => {
    try {
      setRoleLoading(true);
      const response = await api.getProfileByName(selectedRole);
      setRoleData(response.profile);
    } catch (error: any) {
      if (error.message !== "status: 404" && error.message?.includes("404")) {
        setRoleData(null);
        return;
      }
      if (error.message && error.message.trim() !== "" && !error.message.includes("status: 404")) {
        toast.error(error.message || "Erro ao carregar perfil");
      }
    } finally {
      setRoleLoading(false);
    }
  };

  const handleToggleView = (module: string) => {
    const newViewValue = !viewPermissions[module];
    setViewPermissions((prev) => ({
      ...prev,
      [module]: newViewValue,
    }));
    // If disabling view, also disable create, edit and delete
    if (!newViewValue) {
      setCreatePermissions((prev) => ({ ...prev, [module]: false }));
      setEditPermissions((prev) => ({ ...prev, [module]: false }));
      setDeletePermissions((prev) => ({ ...prev, [module]: false }));
    }
  };

  const handleToggleCreate = (module: string) => {
    // Can only create if view is enabled
    if (!viewPermissions[module]) {
      toast.error("É necessário ter permissão de visualização para habilitar criação");
      return;
    }
    const newValue = !createPermissions[module];
    setCreatePermissions((prev) => ({
      ...prev,
      [module]: newValue,
    }));
    // Criar também habilita editar
    setEditPermissions((prev) => ({
      ...prev,
      [module]: newValue,
    }));
  };

  const handleToggleEdit = (module: string) => {
    // Can only edit if view is enabled
    if (!viewPermissions[module]) {
      toast.error("É necessário ter permissão de visualização para habilitar edição");
      return;
    }
    setEditPermissions((prev) => ({
      ...prev,
      [module]: !prev[module],
    }));
  };

  const handleToggleDelete = (module: string) => {
    // Can only delete if view is enabled
    if (!viewPermissions[module]) {
      toast.error("É necessário ter permissão de visualização para habilitar exclusão");
      return;
    }
    setDeletePermissions((prev) => ({
      ...prev,
      [module]: !prev[module],
    }));
  };

  const handleSave = async () => {
    if (!selectedRole) {
      toast.error("Por favor, selecione um perfil para gerenciar");
      return;
    }

    // Converte módulos para permissões do backend
    // O backend espera permissões no formato: "employees.read", "service_orders.*", etc.
    const enabledViewPermissions: string[] = [];
    Object.entries(viewPermissions).forEach(([module, enabled]) => {
      if (enabled) {
        const prefix = modulePathToPermissionPrefix(module);
        
        // Se tem criar ou editar, usa wildcard (ex: "service_orders.*")
        if (createPermissions[module] || editPermissions[module]) {
          enabledViewPermissions.push(`${prefix}.*`);
        } else {
          // Se só tem visualização, adiciona permissões específicas
          // Para manter compatibilidade, adiciona read
          enabledViewPermissions.push(`${prefix}.read`);
        }
      }
    });

    // Remove duplicatas mantendo wildcards quando existem
    const uniqueViewPermissions: string[] = [];
    const prefixes = new Set<string>();
    
    enabledViewPermissions.forEach((perm) => {
      if (perm.endsWith(".*")) {
        const prefix = perm.slice(0, -2);
        // Remove permissões específicas do mesmo prefixo se tem wildcard
        prefixes.add(prefix);
        // Remove permissões específicas já adicionadas
        const index = uniqueViewPermissions.findIndex((p) => p.startsWith(prefix + ".") && !p.endsWith(".*"));
        if (index > -1) {
          uniqueViewPermissions.splice(index, 1);
        }
        if (!uniqueViewPermissions.includes(perm)) {
          uniqueViewPermissions.push(perm);
        }
      } else {
        const prefix = perm.split(".")[0];
        // Só adiciona se não tem wildcard para este prefixo
        if (!prefixes.has(prefix) && !uniqueViewPermissions.some((p) => p === `${prefix}.*`)) {
          uniqueViewPermissions.push(perm);
        }
      }
    });

    const enabledEditPermissions = Object.entries(editPermissions)
      .filter(([module, enabled]) => enabled && viewPermissions[module])
      .map(([module]) => modulePathToEditDeleteFormat(module));

    const enabledDeletePermissions = Object.entries(deletePermissions)
      .filter(([module, enabled]) => enabled && viewPermissions[module])
      .map(([module]) => modulePathToEditDeleteFormat(module));

    try {
      setUpdateLoading(true);
      await api.updateProfilePermissions(
        selectedRole,
        uniqueViewPermissions,
        enabledEditPermissions,
        enabledDeletePermissions
      );
      toast.success("Permissões atualizadas com sucesso");
      // Reload role data
      await loadRoleData();
      await loadRoles();
    } catch (error: any) {
      toast.error(error.message || "Erro ao atualizar permissões");
    } finally {
      setUpdateLoading(false);
    }
  };

  if (rolesLoading || modulesLoading) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      </DashboardLayout>
    );
  }

  const renderModulePermissions = (modules: string[]) => {
    return modules.map((module) => (
      <div
        key={module}
        className="p-4 border rounded-lg hover:bg-accent/50 transition-colors"
      >
        <div className="flex items-center justify-between">
          <div className="flex-1">
            <Label
              htmlFor={`view-${module}`}
              className="text-base font-medium cursor-pointer"
            >
              {MODULE_NAMES[module] || module}
            </Label>
          </div>
          <div className="flex items-center gap-6">
            {/* Toggles de Criar, Editar e Excluir à esquerda */}
            <div className="flex items-center gap-4">
              <div className="flex flex-col items-center gap-1">
                <Label htmlFor={`create-${module}`} className="text-xs text-muted-foreground">
                  Criar
                </Label>
                <Switch
                  id={`create-${module}`}
                  checked={createPermissions[module] || false}
                  onCheckedChange={() => handleToggleCreate(module)}
                  disabled={!viewPermissions[module]}
                />
              </div>
              <div className="flex flex-col items-center gap-1">
                <Label htmlFor={`edit-${module}`} className="text-xs text-muted-foreground">
                  Editar
                </Label>
                <Switch
                  id={`edit-${module}`}
                  checked={editPermissions[module] || false}
                  onCheckedChange={() => handleToggleEdit(module)}
                  disabled={!viewPermissions[module]}
                />
              </div>
              <div className="flex flex-col items-center gap-1">
                <Label htmlFor={`delete-${module}`} className="text-xs text-muted-foreground">
                  Excluir
                </Label>
                <Switch
                  id={`delete-${module}`}
                  checked={deletePermissions[module] || false}
                  onCheckedChange={() => handleToggleDelete(module)}
                  disabled={!viewPermissions[module]}
                />
              </div>
            </div>
            {/* Toggle de Visualizar à direita */}
            <div className="flex flex-col items-center gap-1">
              <Label htmlFor={`view-${module}`} className="text-xs text-muted-foreground">
                Visualizar
              </Label>
              <Switch
                id={`view-${module}`}
                checked={viewPermissions[module] || false}
                onCheckedChange={() => handleToggleView(module)}
              />
            </div>
          </div>
        </div>
      </div>
    ));
  };

  // Verificar se o perfil selecionado é de cliente
  const isCustomerProfile = selectedRole === "User" || selectedRole === "Cliente";
  
  // Group modules by category
  // Negócio: módulos relacionados ao negócio principal
  const businessModules = availableModules.filter((m) => 
    m === "/dashboard" || m === "/service-orders" || m === "/customers" || 
    m === "/stock" || m === "/financial" || m === "/reports"
  );
  // Administração: módulos administrativos
  const adminModules = availableModules.filter((m) => 
    m === "/departments" || m === "/employees" || m === "/profiles" || m === "/settings"
  );
  // Cliente: módulos específicos para clientes (apenas para perfis de cliente)
  const customerModules = isCustomerProfile 
    ? availableModules.filter((m) => m.startsWith("/cliente/"))
    : [];

  // Debug: log available modules
  console.log("[Profiles] Available modules:", availableModules);
  console.log("[Profiles] Business modules:", businessModules);
  console.log("[Profiles] Admin modules:", adminModules);
  console.log("[Profiles] Customer modules:", customerModules);

  return (
    <DashboardLayout>
      <div className="space-y-6 w-full min-w-0">
        <div>
          <h1 className="text-3xl font-bold">Gerenciar Perfis e Permissões</h1>
          <p className="text-muted-foreground mt-1">
            Configure as permissões de acesso para cada perfil do sistema
          </p>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Selecionar Perfil</CardTitle>
            <CardDescription>
              Escolha um perfil para gerenciar suas permissões de acesso aos módulos
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="role-select">Perfil</Label>
                <Select value={selectedRole} onValueChange={setSelectedRole}>
                  <SelectTrigger id="role-select">
                    <SelectValue placeholder="Selecione um perfil" />
                  </SelectTrigger>
                  <SelectContent>
                    {roles
                      .filter((role) => role.name !== "Dono")
                      .map((role) => (
                        <SelectItem key={role.id} value={role.name}>
                          <div className="flex items-center gap-2">
                            <span>{role.name === "User" ? "Cliente" : role.name}</span>
                            {role.name === "Administrador" && (
                              <Badge variant="secondary">Departamento</Badge>
                            )}
                          </div>
                        </SelectItem>
                      ))}
                  </SelectContent>
                </Select>
              </div>
              {selectedRole === "Administrador" && (
                <div className="p-4 bg-amber-50 dark:bg-amber-950 rounded-lg border border-amber-200 dark:border-amber-800">
                  <p className="text-sm text-amber-900 dark:text-amber-100">
                    <strong>Nota:</strong> O perfil "Administrador" tem acesso completo apenas ao seu departamento correspondente.
                    Não possui acesso a configurações globais do sistema (perfis, usuários, outros departamentos).
                  </p>
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {selectedRole && (
          <Card>
            <CardHeader>
              <CardTitle>Resumo das Permissões</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="flex flex-wrap items-center gap-4">
                  <p className="text-sm text-muted-foreground">
                    Módulos com visualização:{" "}
                    <strong>
                      {Object.values(viewPermissions).filter(Boolean).length} de{" "}
                      {availableModules.length}
                    </strong>
                  </p>
                  <p className="text-sm text-muted-foreground">
                    Módulos com criação:{" "}
                    <strong>
                      {Object.values(createPermissions).filter(Boolean).length}
                    </strong>
                  </p>
                  <p className="text-sm text-muted-foreground">
                    Módulos com edição:{" "}
                    <strong>
                      {Object.values(editPermissions).filter(Boolean).length}
                    </strong>
                  </p>
                  <p className="text-sm text-muted-foreground">
                    Módulos com exclusão:{" "}
                    <strong>
                      {Object.values(deletePermissions).filter(Boolean).length}
                    </strong>
                  </p>
                </div>
                <div className="flex flex-wrap gap-2">
                  {Object.entries(viewPermissions)
                    .filter(([_, enabled]) => enabled)
                    .map(([module]) => (
                      <Badge key={module} variant="default" className="flex items-center gap-1">
                        {MODULE_NAMES[module] || module}
                        {createPermissions[module] && (
                          <span className="text-xs">➕</span>
                        )}
                        {editPermissions[module] && (
                          <span className="text-xs">✏️</span>
                        )}
                        {deletePermissions[module] && (
                          <span className="text-xs">🗑️</span>
                        )}
                      </Badge>
                    ))}
                  {Object.values(viewPermissions).filter(Boolean).length === 0 && (
                    <span className="text-sm text-muted-foreground">
                      Nenhuma permissão habilitada
                    </span>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {selectedRole && (
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>Permissões de Módulos</CardTitle>
                  <CardDescription>
                    {roleData && (
                      <span className="mt-1 block">
                        {roleData.description || "Configure quais módulos este perfil pode acessar, editar e excluir"}
                      </span>
                    )}
                  </CardDescription>
                </div>
                <Button
                  onClick={handleSave}
                  disabled={updateLoading || roleLoading}
                >
                  {updateLoading ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Salvando...
                    </>
                  ) : (
                    <>
                      <Save className="mr-2 h-4 w-4" />
                      Salvar Permissões
                    </>
                  )}
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              {roleLoading ? (
                <div className="flex items-center justify-center py-12">
                  <Loader2 className="h-6 w-6 animate-spin text-primary" />
                </div>
              ) : (
                <div className="space-y-6">
                  <div>
                    <h3 className="text-sm font-semibold mb-3 text-muted-foreground uppercase tracking-wider">
                      Negócio
                    </h3>
                    <div className="space-y-4">
                      {renderModulePermissions(businessModules)}
                    </div>
                  </div>

                  <Separator />

                  <div>
                    <h3 className="text-sm font-semibold mb-3 text-muted-foreground uppercase tracking-wider">
                      Administração
                    </h3>
                    <div className="space-y-4">
                      {renderModulePermissions(adminModules)}
                    </div>
                  </div>

                  {customerModules.length > 0 && (
                    <>
                      <Separator />
                      <div>
                        <h3 className="text-sm font-semibold mb-3 text-muted-foreground uppercase tracking-wider">
                          Cliente
                        </h3>
                        <div className="space-y-4">
                          {renderModulePermissions(customerModules)}
                        </div>
                      </div>
                    </>
                  )}
                </div>
              )}
            </CardContent>
          </Card>
        )}
      </div>
    </DashboardLayout>
  );
}
