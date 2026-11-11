import type { Permission, UserRole } from "@/types";

/**
 * Formato das permissões: "recurso.ação" (ex: service_orders.read).
 * Curingas: "*" (tudo) e "recurso.*" (todas as ações do recurso).
 */
export function hasPermission(
  perms: readonly Permission[] | undefined,
  required: Permission | readonly Permission[] | undefined
): boolean {
  if (!required || required.length === 0) return true;
  if (!perms || perms.length === 0) return false;
  if (perms.includes("*")) return true;

  const list = typeof required === "string" ? [required] : required;
  return list.some(req => perms.some(granted => matchPermission(granted, req)));
}

/** Espelha models.MatchPermission do backend ("a.*" cobre "a.b" e "a.b.c"). */
function matchPermission(granted: string, required: string): boolean {
  if (granted === "*" || granted === required) return true;
  if (granted.endsWith(".*")) return required.startsWith(granted.slice(0, -1));
  return false;
}

/**
 * Permissão exigida por rota. Usa o prefixo mais específico que casar.
 * Rotas sem entrada (ex.: agenda/garantias herdam service_orders.read) ficam livres
 * apenas se declaradas como `null`.
 */
export const ROUTE_PERMISSIONS: Record<string, Permission | null> = {
  "/dashboard": "dashboard.read",
  "/dashboard/ordens/nova": "service_orders.create",
  "/dashboard/ordens": "service_orders.read",
  "/dashboard/clientes": "customers.read",
  "/dashboard/agenda": "service_orders.read",
  "/dashboard/produtos": "products.read",
  "/dashboard/caixa": "cash.read",
  "/dashboard/faturamento": "reports.read",
  "/dashboard/desempenho": "reports.read",
  "/dashboard/garantias": "service_orders.read",
  "/dashboard/colaboradores": "employees.read",
  "/dashboard/setores": "departments.read",
  "/dashboard/perfis": "profiles.read",
  "/portal": null,
};

export function requiredPermissionFor(path: string): Permission | null | undefined {
  const clean = path.split("?")[0].replace(/\/+$/, "") || "/";
  const match = Object.keys(ROUTE_PERMISSIONS)
    .filter(prefix => clean === prefix || clean.startsWith(`${prefix}/`))
    .sort((a, b) => b.length - a.length)[0];
  return match ? ROUTE_PERMISSIONS[match] : undefined;
}

export function canAccessRoute(
  perms: readonly Permission[] | undefined,
  path: string
): boolean {
  const required = requiredPermissionFor(path);
  if (required === null) return true;
  if (required === undefined) return false; // rota desconhecida: nega por padrão
  return hasPermission(perms, required);
}

/**
 * Fallback para backends que ainda não retornam `permissions` em /auth/me:
 * deriva um conjunto mínimo a partir do role do usuário.
 */
export function permissionsFromRole(role: UserRole | undefined): Permission[] {
  if (role === "super_admin") return ["*"];
  if (role === "admin") {
    return [
      "dashboard.read",
      "service_orders.*",
      "customers.*",
      "products.*",
      "inventory.*",
      "cash.*",
      "reports.*",
      "employees.*",
      "departments.*",
      "profiles.*",
      "branches.*",
    ];
  }
  return [];
}

/** Catálogo de permissões conhecidas, usado para exibição em Perfis. */
export const PERMISSION_GROUPS: { resource: string; label: string }[] = [
  { resource: "dashboard", label: "Resumo" },
  { resource: "service_orders", label: "Ordens de serviço" },
  { resource: "customers", label: "Clientes" },
  { resource: "products", label: "Produtos" },
  { resource: "inventory", label: "Estoque" },
  { resource: "cash", label: "Caixa" },
  { resource: "reports", label: "Relatórios" },
  { resource: "employees", label: "Colaboradores" },
  { resource: "departments", label: "Setores" },
  { resource: "profiles", label: "Perfis" },
];
