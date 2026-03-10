/**
 * Mapeia caminhos de módulos do frontend para permissões do backend
 */

// Mapeamento de caminhos de módulos para prefixos de permissões
const MODULE_TO_PERMISSION_MAP: Record<string, string> = {
  "/dashboard": "dashboard",
  "/service-orders": "service_orders",
  "/customers": "customers",
  "/departments": "departments",
  "/employees": "employees",
  "/stock": "stock",
  "/financial": "financial",
  "/reports": "reports",
  "/profiles": "profiles",
  "/settings": "settings",
};

// Mapeamento reverso: prefixo de permissão para caminho de módulo
const PERMISSION_TO_MODULE_MAP: Record<string, string> = Object.fromEntries(
  Object.entries(MODULE_TO_PERMISSION_MAP).map(([path, perm]) => [perm, path])
);

/**
 * Converte um caminho de módulo (ex: "/service-orders") para prefixo de permissão (ex: "service_orders")
 */
export function modulePathToPermissionPrefix(modulePath: string): string {
  return MODULE_TO_PERMISSION_MAP[modulePath] || modulePath.replace(/^\//, "").replace(/-/g, "_");
}

/**
 * Converte um prefixo de permissão (ex: "service_orders") para caminho de módulo (ex: "/service-orders")
 */
export function permissionPrefixToModulePath(permissionPrefix: string): string {
  return PERMISSION_TO_MODULE_MAP[permissionPrefix] || `/${permissionPrefix.replace(/_/g, "-")}`;
}

/**
 * Verifica se uma permissão do backend corresponde a um módulo do frontend
 * Ex: "service_orders.*" ou "service_orders.read" corresponde a "/service-orders"
 */
export function permissionMatchesModule(permission: string, modulePath: string): boolean {
  const prefix = modulePathToPermissionPrefix(modulePath);
  
  // Permissão wildcard "*" permite tudo
  if (permission === "*") {
    return true;
  }
  
  // Verifica se a permissão começa com o prefixo do módulo
  if (permission.startsWith(prefix + ".") || permission === prefix || permission === `${prefix}.*`) {
    return true;
  }
  
  // Verifica wildcard (ex: "service_orders.*" corresponde a qualquer permissão de service_orders)
  if (permission.endsWith(".*")) {
    const permPrefix = permission.slice(0, -2);
    return permPrefix === prefix;
  }
  
  return false;
}

/**
 * Verifica se um módulo está nas permissões de edição/exclusão
 * O backend armazena apenas o nome do módulo com underscores (ex: "employees", "service_orders")
 */
export function moduleInEditOrDeletePermissions(
  modulePath: string,
  editOrDeletePermissions: string[]
): boolean {
  const prefix = modulePathToPermissionPrefix(modulePath);
  
  // Verifica se está na lista (pode estar como "employees", "service_orders", etc.)
  return editOrDeletePermissions.some((perm) => {
    // Compara diretamente ou normaliza removendo underscores de ambos
    return perm === prefix || perm.replace(/_/g, "") === prefix.replace(/_/g, "");
  });
}

/**
 * Converte um caminho de módulo para o formato usado em editPermissions/deletePermissions
 * (apenas o nome do módulo, sem underscores)
 */
export function modulePathToEditDeleteFormat(modulePath: string): string {
  const prefix = modulePathToPermissionPrefix(modulePath);
  // O backend espera o formato sem underscores para edit/delete
  return prefix;
}
