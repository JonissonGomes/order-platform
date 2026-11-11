import {
  BadgeCheck,
  Building2,
  CalendarDays,
  ClipboardList,
  ExternalLink,
  FilePlus2,
  Gauge,
  LayoutDashboard,
  Package,
  ShieldCheck,
  Users,
  UserCog,
  Wallet,
  Receipt,
  type LucideIcon,
} from "lucide-react";

export interface NavItem {
  label: string;
  path: string;
  icon: LucideIcon;
  /** Link público/externo (abre em nova aba, sem filtro de permissão). */
  external?: boolean;
}

export interface NavGroup {
  label: string;
  items: NavItem[];
}

/**
 * Menu do dashboard. A visibilidade de cada item vem de ROUTE_PERMISSIONS
 * (lib/permissions.ts), mantendo menu e guarda de rota na mesma fonte.
 */
export const NAV_GROUPS: NavGroup[] = [
  {
    label: "Operação",
    items: [
      { label: "Resumo", path: "/dashboard", icon: LayoutDashboard },
      { label: "Ordens", path: "/dashboard/ordens", icon: ClipboardList },
      { label: "Nova OS", path: "/dashboard/ordens/nova", icon: FilePlus2 },
      { label: "Clientes", path: "/dashboard/clientes", icon: Users },
      { label: "Agenda", path: "/dashboard/agenda", icon: CalendarDays },
    ],
  },
  {
    label: "Estoque e financeiro",
    items: [
      { label: "Produtos", path: "/dashboard/produtos", icon: Package },
      { label: "Caixa", path: "/dashboard/caixa", icon: Wallet },
      { label: "Faturamento", path: "/dashboard/faturamento", icon: Receipt },
    ],
  },
  {
    label: "Pós-venda",
    items: [
      { label: "Garantias", path: "/dashboard/garantias", icon: BadgeCheck },
      { label: "Desempenho", path: "/dashboard/desempenho", icon: Gauge },
    ],
  },
  {
    label: "Admin",
    items: [
      { label: "Colaboradores", path: "/dashboard/colaboradores", icon: UserCog },
      { label: "Setores", path: "/dashboard/setores", icon: Building2 },
      { label: "Perfis", path: "/dashboard/perfis", icon: ShieldCheck },
    ],
  },
  {
    label: "Cliente",
    items: [{ label: "Portal do cliente", path: "/portal", icon: ExternalLink, external: true }],
  },
];

export const ALL_NAV_ITEMS: NavItem[] = NAV_GROUPS.flatMap(g => g.items);
