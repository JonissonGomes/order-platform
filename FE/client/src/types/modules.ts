// Module definitions for role-based access control
// Similar to CCD-Connect system

export interface Module {
  id: string;
  name: string;
  label: string;
  icon: string;
  path: string;
  permissions: string[]; // Permissions required to access this module
}

// Module names mapping for display
export const MODULE_NAMES: Record<string, string> = {
  "/dashboard": "Dashboard",
  "/service-orders": "Ordens de Serviço",
  "/customers": "Clientes",
  "/departments": "Departamentos",
  "/employees": "Colaboradores",
  "/stock": "Estoque",
  "/financial": "Financeiro",
  "/reports": "Relatórios",
  "/profiles": "Perfis e Módulos",
  "/settings": "Configurações",
  // Módulos do cliente
  "/cliente/dashboard": "Área do Cliente",
  "/cliente/perfil": "Meu Perfil",
  "/cliente/ordens": "Histórico de Ordens",
};

export const MODULES: Module[] = [
  {
    id: "dashboard",
    name: "dashboard",
    label: "Dashboard",
    icon: "LayoutDashboard",
    path: "/dashboard",
    permissions: ["dashboard.read"],
  },
  {
    id: "service_orders",
    name: "service_orders",
    label: "Ordens de Serviço",
    icon: "FileText",
    path: "/service-orders",
    permissions: ["service_orders.read", "service_orders.*"],
  },
  {
    id: "customers",
    name: "customers",
    label: "Clientes",
    icon: "UserCircle",
    path: "/customers",
    permissions: ["customers.read", "customers.*"],
  },
  {
    id: "stock",
    name: "stock",
    label: "Estoque",
    icon: "Package",
    path: "/stock",
    permissions: ["stock.read", "stock.*"],
  },
  {
    id: "financial",
    name: "financial",
    label: "Financeiro",
    icon: "DollarSign",
    path: "/financial",
    permissions: ["financial.read", "financial.*"],
  },
  {
    id: "reports",
    name: "reports",
    label: "Relatórios",
    icon: "BarChart",
    path: "/reports",
    permissions: ["reports.*", "reports.read", "reports.department"],
  },
  {
    id: "departments",
    name: "departments",
    label: "Departamentos",
    icon: "Building2",
    path: "/departments",
    permissions: ["departments.read", "departments.*"],
  },
  {
    id: "employees",
    name: "employees",
    label: "Colaboradores",
    icon: "Users",
    path: "/employees",
    permissions: ["employees.read", "employees.*"],
  },
  {
    id: "profiles",
    name: "profiles",
    label: "Perfis e Módulos",
    icon: "Shield",
    path: "/profiles",
    permissions: ["profiles.read", "profiles.*", "*"],
  },
  {
    id: "settings",
    name: "settings",
    label: "Configurações",
    icon: "Settings",
    path: "/settings",
    permissions: ["settings.read", "settings.*", "*"],
  },
  // Módulos do cliente (não usam sistema de permissões de perfis)
  {
    id: "customer_dashboard",
    name: "customer_dashboard",
    label: "Área do Cliente",
    icon: "User",
    path: "/cliente/dashboard",
    permissions: ["customer.*", "*"], // Apenas para referência, clientes têm acesso direto
  },
  {
    id: "customer_profile",
    name: "customer_profile",
    label: "Meu Perfil",
    icon: "UserCircle",
    path: "/cliente/perfil",
    permissions: ["customer.*", "*"], // Apenas para referência, clientes têm acesso direto
  },
  {
    id: "customer_orders",
    name: "customer_orders",
    label: "Histórico de Ordens",
    icon: "FileText",
    path: "/cliente/ordens",
    permissions: ["customer.*", "*"], // Apenas para referência, clientes têm acesso direto
  },
];

// Role to permissions mapping
// "dono" = novo valor; "super_admin" mantido por retrocompatibilidade
export const ROLE_PERMISSIONS: Record<string, string[]> = {
  dono: ["*"],        // Novo valor do perfil Dono
  super_admin: ["*"], // Retrocompatibilidade com registros antigos
  admin: [
    "dashboard.read",
    "users.*",
    "employees.*",
    "departments.*",
    "customers.*",
    "service_orders.*",
    "stock.*",
    "financial.*",
    "reports.*",
    "profiles.read",
  ],
  department_manager: [
    "dashboard.read",
    "employees.read",
    "employees.update",
    "departments.read",
    "service_orders.*",
    "stock.read",
    "financial.read",
    "reports.department",
  ],
  attendant: [
    "dashboard.read",
    "customers.*",
    "service_orders.create",
    "service_orders.read",
    "service_orders.update",
    "service_orders.status.pending",
    "service_orders.status.evaluating",
    "service_orders.status.approved",
    "stock.read",
  ],
  technician: [
    "dashboard.read",
    "service_orders.read",
    "service_orders.update",
    "service_orders.status.in_repair",
    "service_orders.status.waiting_parts",
    "service_orders.status.testing",
    "service_orders.status.ready",
    "service_orders.notes.create",
    "stock.read",
  ],
};

/**
 * Check if a user has permission to access a module
 */
export function hasModulePermission(
  userPermissions: string[],
  modulePermissions: string[]
): boolean {
  // If user has "*" permission, they have access to everything
  if (userPermissions.includes("*")) {
    return true;
  }

  // Check if user has any of the required permissions
  return modulePermissions.some((perm) => {
    // Check exact match
    if (userPermissions.includes(perm)) {
      return true;
    }

    // Check wildcard permissions (e.g., "service_orders.*" matches "service_orders.read")
    return userPermissions.some((userPerm) => {
      if (userPerm.endsWith(".*")) {
        const base = userPerm.slice(0, -2);
        return perm.startsWith(base + ".");
      }
      return false;
    });
  });
}

/**
 * Get modules visible to a user based on their role
 */
export function getVisibleModules(userRole: string, userPermissions?: string[]): Module[] {
  // Get permissions for the role
  const rolePerms = userPermissions || ROLE_PERMISSIONS[userRole] || [];

  // Filter modules based on permissions
  return MODULES.filter((module) => hasModulePermission(rolePerms, module.permissions));
}
