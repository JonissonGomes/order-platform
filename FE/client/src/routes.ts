/**
 * Rotas da aplicação ZTS Cell (frontend).
 *
 * PÚBLICAS (sem autenticação):
 * - /          Home (marca ZTS Cell)
 * - /login     Login de colaboradores
 * - /portal    Portal do cliente: consulta de OS (nº da OS + 4 últimos dígitos do telefone)
 * - /404       Não encontrado
 *
 * PRIVADAS (/dashboard/*, dentro do DashboardLayout, filtradas por permissão):
 * Operação
 * - /dashboard                  Resumo                 (dashboard.read)
 * - /dashboard/ordens           Lista de OS            (service_orders.read)
 * - /dashboard/ordens/nova      Nova OS                (service_orders.create)
 * - /dashboard/clientes         Clientes               (customers.read)
 * - /dashboard/agenda           Agenda por previsão    (service_orders.read)
 * Estoque e financeiro
 * - /dashboard/produtos         Produtos + barcode     (products.read)
 * - /dashboard/caixa            Caixa / venda rápida   (cash.read)
 * - /dashboard/faturamento      Faturamento            (reports.read)
 * Pós-venda
 * - /dashboard/garantias        Garantias              (service_orders.read)
 * - /dashboard/desempenho       Desempenho             (reports.read)
 * Admin
 * - /dashboard/colaboradores    Colaboradores          (employees.read)
 * - /dashboard/setores          Setores                (departments.read)
 * - /dashboard/perfis           Perfis e permissões    (profiles.read)
 *
 * O mapa rota -> permissão fica em src/lib/permissions.ts (ROUTE_PERMISSIONS)
 * e o menu em src/lib/navigation.ts.
 */

export const ROUTES = {
  // Públicas
  HOME: "/",
  NOT_FOUND: "/404",
  LOGIN: "/login",
  PORTAL: "/portal",

  // Dashboard
  DASHBOARD: "/dashboard",
  ORDERS: "/dashboard/ordens",
  ORDER_NEW: "/dashboard/ordens/nova",
  CUSTOMERS: "/dashboard/clientes",
  AGENDA: "/dashboard/agenda",
  PRODUCTS: "/dashboard/produtos",
  CASH: "/dashboard/caixa",
  BILLING: "/dashboard/faturamento",
  WARRANTIES: "/dashboard/garantias",
  PERFORMANCE: "/dashboard/desempenho",
  EMPLOYEES: "/dashboard/colaboradores",
  DEPARTMENTS: "/dashboard/setores",
  PROFILES: "/dashboard/perfis",
} as const;

export type RoutePath = (typeof ROUTES)[keyof typeof ROUTES];
