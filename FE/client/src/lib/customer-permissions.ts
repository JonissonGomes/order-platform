/**
 * Permissões específicas para blocos da área do cliente
 */

export const CUSTOMER_DASHBOARD_BLOCKS = {
  SEARCH_ORDERS: "customer.search_orders",
  OPEN_ORDENS: "customer.open_orders",
  SUMMARY: "customer.summary",
  HELP: "customer.help",
} as const;

export const CUSTOMER_BLOCK_LABELS: Record<string, string> = {
  [CUSTOMER_DASHBOARD_BLOCKS.SEARCH_ORDERS]: "Busca de Ordens",
  [CUSTOMER_DASHBOARD_BLOCKS.OPEN_ORDENS]: "Ordens em Aberto",
  [CUSTOMER_DASHBOARD_BLOCKS.SUMMARY]: "Resumo",
  [CUSTOMER_DASHBOARD_BLOCKS.HELP]: "Precisa de Ajuda",
};

/**
 * Verifica se o cliente tem permissão para visualizar um bloco específico
 */
export function hasCustomerBlockPermission(
  permissions: string[],
  block: string
): boolean {
  // Permissão wildcard "*" permite tudo
  if (permissions.includes("*")) {
    return true;
  }

  // Verifica se tem permissão específica para o bloco
  if (permissions.includes(block)) {
    return true;
  }

  // Verifica wildcard (ex: "customer.*" permite todos os blocos do cliente)
  if (permissions.some((perm) => perm === "customer.*" || perm.startsWith("customer."))) {
    return true;
  }

  return false;
}

/**
 * Retorna todas as permissões de blocos do cliente
 */
export function getCustomerBlockPermissions(): string[] {
  return Object.values(CUSTOMER_DASHBOARD_BLOCKS);
}
