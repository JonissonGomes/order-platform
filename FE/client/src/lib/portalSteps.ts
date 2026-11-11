import type { PortalTimelineEntry, ServiceOrderStatus } from "@/types";

/** Etapas visíveis no portal do cliente (espelha o protótipo ZTS). */
export const PORTAL_STEPS = [
  "Aparelho recebido",
  "Orçamento",
  "Aprovação",
  "Reparo",
  "Testes",
  "Pronto para retirada",
  "Entregue",
] as const;

/** Índice da etapa atual; -1 = fluxo encerrado (cancelado / sem conserto). */
export function portalStepIndex(status: string): number {
  const map: Partial<Record<ServiceOrderStatus, number>> = {
    pending: 0,
    evaluating: 1,
    approved: 2,
    waiting_parts: 3,
    in_repair: 3,
    testing: 4,
    ready: 5,
    delivered: 6,
    cancelled: -1,
    unrepairable: -1,
  };
  return map[status as ServiceOrderStatus] ?? 0;
}

/** Primeiro horário em que cada etapa do andamento foi atingida (via histórico). */
export function portalStepReachedAt(
  timeline: readonly PortalTimelineEntry[] | undefined
): (string | undefined)[] {
  const reached: (string | undefined)[] = Array(PORTAL_STEPS.length).fill(undefined);
  const chronological = [...(timeline ?? [])].sort(
    (a, b) => new Date(a.at).getTime() - new Date(b.at).getTime()
  );
  for (const entry of chronological) {
    const idx = portalStepIndex(entry.status);
    if (idx < 0) continue;
    if (!reached[idx]) reached[idx] = entry.at;
  }
  return reached;
}

export function portalClientMessage(status: string): string {
  const messages: Partial<Record<ServiceOrderStatus, string>> = {
    pending: "Recebemos seu aparelho e vamos avaliar.",
    evaluating: "Orçamento pronto. Aguardando a sua resposta.",
    approved: "Orçamento aprovado. Seu reparo está na fila.",
    waiting_parts: "Peça solicitada ao fornecedor.",
    in_repair: "O técnico está trabalhando no seu aparelho.",
    testing: "Reparo concluído. Fazendo os testes finais.",
    ready: "Pronto! Você já pode retirar na loja.",
    delivered: "Serviço finalizado. Obrigado pela confiança!",
    cancelled: "Serviço cancelado. Fale com a loja se tiver dúvidas.",
    unrepairable: "Não foi possível consertar este aparelho. Fale com a loja.",
  };
  return messages[status as ServiceOrderStatus] ?? "Acompanhe o andamento abaixo.";
}
