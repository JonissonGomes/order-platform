import type { ServiceOrder } from "@/types";
import { OPEN_STATUSES } from "./orderStatus";

const MS_HOUR = 3_600_000;

export interface AttentionItem {
  order: ServiceOrder;
  reason: string;
  tone: "wait" | "ok" | "bad";
}

function hoursSince(iso?: string): number {
  if (!iso) return 0;
  return (Date.now() - new Date(iso).getTime()) / MS_HOUR;
}

/** Fila operacional: aprovação, prontas e OS paradas há mais de 48h. */
export function buildAttentionQueue(orders: ServiceOrder[]): AttentionItem[] {
  const items: AttentionItem[] = [];
  const open = orders.filter(o => OPEN_STATUSES.includes(o.status));

  open
    .filter(o => o.status === "evaluating")
    .forEach(o => items.push({ order: o, reason: "Aguardando resposta do cliente", tone: "wait" }));

  open
    .filter(o => o.status === "ready")
    .forEach(o => items.push({ order: o, reason: "Pronta para retirada", tone: "ok" }));

  open
    .filter(o => o.status !== "ready" && o.status !== "evaluating")
    .filter(o => hoursSince(o.statusChangedAt ?? o.updatedAt) > 48)
    .forEach(o => {
      const days = Math.floor(hoursSince(o.statusChangedAt ?? o.updatedAt) / 24);
      items.push({ order: o, reason: `Sem atualização há ${days} dia(s)`, tone: "bad" });
    });

  return items;
}
