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

export type PermissionActionKey = string;

export interface PermissionAction {
  key: PermissionActionKey;
  label: string;
}

export interface PermissionModule {
  resource: string;
  label: string;
  actions: PermissionAction[];
}

const CRUD: PermissionAction[] = [
  { key: "read", label: "Ver" },
  { key: "create", label: "Criar" },
  { key: "update", label: "Editar" },
];

/** Catálogo módulo × ações para editor de perfis (espelha o que a API exige). */
export const PERMISSION_CATALOG: PermissionModule[] = [
  { resource: "dashboard", label: "Dashboard", actions: [{ key: "read", label: "Ver" }] },
  { resource: "service_orders", label: "Ordens de serviço", actions: CRUD },
  { resource: "customers", label: "Clientes", actions: CRUD },
  { resource: "products", label: "Produtos", actions: CRUD },
  { resource: "inventory", label: "Estoque", actions: CRUD },
  {
    resource: "cash",
    label: "Caixa",
    actions: [
      { key: "read", label: "Ver" },
      { key: "open", label: "Abrir" },
      { key: "close", label: "Fechar" },
      { key: "sale", label: "Vender" },
      { key: "movement", label: "Sangria/reforço" },
    ],
  },
  { resource: "reports", label: "Relatórios", actions: [{ key: "read", label: "Ver" }] },
  { resource: "employees", label: "Colaboradores", actions: CRUD },
  { resource: "departments", label: "Setores", actions: CRUD },
  { resource: "profiles", label: "Perfis", actions: CRUD },
  { resource: "branches", label: "Filiais", actions: CRUD },
];

/** Compatível com telas que só listam recursos. */
export const PERMISSION_GROUPS = PERMISSION_CATALOG.map(({ resource, label }) => ({
  resource,
  label,
}));

export function permissionKey(resource: string, action: string): Permission {
  return `${resource}.${action}`;
}

/** Converte lista persistida → mapa recurso.ação ligado/desligado. */
export function permissionsToToggleState(
  perms: readonly Permission[] | undefined
): Record<string, boolean> {
  const state: Record<string, boolean> = {};
  for (const mod of PERMISSION_CATALOG) {
    for (const action of mod.actions) {
      const key = permissionKey(mod.resource, action.key);
      state[key] = hasPermission(perms, key);
    }
  }
  return state;
}

/**
 * Converte toggles → lista normalizada para salvar.
 * Se todas as ações de um módulo estiverem ligadas, grava `recurso.*`.
 * Ignora permissões fora do catálogo (ex.: status legados).
 */
export function toggleStateToPermissions(state: Record<string, boolean>): Permission[] {
  const out: Permission[] = [];
  for (const mod of PERMISSION_CATALOG) {
    const keys = mod.actions.map(a => permissionKey(mod.resource, a.key));
    const enabled = keys.filter(k => state[k]);
    if (enabled.length === 0) continue;
    if (enabled.length === keys.length) {
      out.push(`${mod.resource}.*`);
    } else {
      out.push(...enabled);
    }
  }
  return out;
}

export function summarizePermissions(perms: readonly Permission[] | undefined): [string, string[]][] {
  if (!perms || perms.length === 0) return [];
  if (perms.includes("*")) return [["Acesso total", ["*"]]];

  const labelByResource = Object.fromEntries(
    PERMISSION_CATALOG.map(m => [m.resource, m.label])
  );
  const actionLabel = (resource: string, action: string) => {
    const mod = PERMISSION_CATALOG.find(m => m.resource === resource);
    return mod?.actions.find(a => a.key === action)?.label ?? action;
  };

  const state = permissionsToToggleState(perms);
  const rows: [string, string[]][] = [];
  for (const mod of PERMISSION_CATALOG) {
    const labels = mod.actions
      .filter(a => state[permissionKey(mod.resource, a.key)])
      .map(a => actionLabel(mod.resource, a.key));
    if (labels.length > 0) {
      rows.push([labelByResource[mod.resource] ?? mod.resource, labels]);
    }
  }
  return rows;
}
