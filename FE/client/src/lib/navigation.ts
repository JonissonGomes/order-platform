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
  /** Destaque no topo (ex.: Nova OS). */
  pinned?: boolean;
}

export interface NavGroup {
  label: string;
  items: NavItem[];
}

function byLabel(a: NavItem, b: NavItem) {
  return a.label.localeCompare(b.label, "pt-BR");
}

/**
 * Menu do dashboard por sessão.
 * Nova OS fica destacada no topo; demais itens em ordem alfabética dentro do grupo.
 * Visibilidade: ROUTE_PERMISSIONS (lib/permissions.ts).
 */
export const NAV_GROUPS: NavGroup[] = [
  {
    label: "",
    items: [
      {
        label: "Nova OS",
        path: "/dashboard/ordens/nova",
        icon: FilePlus2,
        pinned: true,
      },
    ],
  },
  {
    label: "Operação",
    items: [
      { label: "Agenda", path: "/dashboard/agenda", icon: CalendarDays },
      { label: "Clientes", path: "/dashboard/clientes", icon: Users },
      { label: "Dashboard", path: "/dashboard", icon: LayoutDashboard },
      { label: "Ordens", path: "/dashboard/ordens", icon: ClipboardList },
    ].sort(byLabel),
  },
  {
    label: "Estoque e financeiro",
    items: [
      { label: "Caixa", path: "/dashboard/caixa", icon: Wallet },
      { label: "Faturamento", path: "/dashboard/faturamento", icon: Receipt },
      { label: "Produtos", path: "/dashboard/produtos", icon: Package },
    ].sort(byLabel),
  },
  {
    label: "Pós-venda",
    items: [
      { label: "Desempenho", path: "/dashboard/desempenho", icon: Gauge },
      { label: "Garantias", path: "/dashboard/garantias", icon: BadgeCheck },
    ].sort(byLabel),
  },
  {
    label: "Admin",
    items: [
      { label: "Colaboradores", path: "/dashboard/colaboradores", icon: UserCog },
      { label: "Perfis", path: "/dashboard/perfis", icon: ShieldCheck },
      { label: "Setores", path: "/dashboard/setores", icon: Building2 },
    ].sort(byLabel),
  },
  {
    label: "Cliente",
    items: [{ label: "Portal do cliente", path: "/portal", icon: ExternalLink, external: true }],
  },
];

export const ALL_NAV_ITEMS: NavItem[] = NAV_GROUPS.flatMap(g => g.items);
