import type { CashMovement, PaymentMethod, ServiceOrder } from "@/types";
import { dayKey } from "./format";

const MS_DAY = 86_400_000;

/** Chaves yyyy-MM-dd dos últimos N dias (inclui hoje). */
export function lastDays(n: number): string[] {
  const today = new Date();
  return Array.from({ length: n }, (_, i) => {
    const d = new Date(today.getTime() - (n - 1 - i) * MS_DAY);
    return dayKey(d.toISOString())!;
  });
}

export const shortDay = (key: string) => key.slice(8, 10) + "/" + key.slice(5, 7);

/** Data em que a OS foi concluída (entregue). */
export const deliveredAt = (o: ServiceOrder) =>
  o.deliveredAt ?? o.statusChangedAt ?? o.updatedAt;
export const orderValue = (o: ServiceOrder) => o.finalCost ?? o.estimatedCost ?? 0;

const REVENUE_KINDS = new Set(["sale", "os_deposit", "os_balance"]);
const isRevenue = (m: CashMovement) => m.type === "in" && REVENUE_KINDS.has(m.kind);

export interface RevenuePoint {
  day: string;
  label: string;
  value: number;
}

export interface RevenueReport {
  series: RevenuePoint[];
  total: number;
  count: number;
}

/**
 * Faturamento do período a partir das OS entregues (valor final, ou orçamento se ausente).
 * Em períodos longos (>14 dias) agrega por semana para reduzir ruído no gráfico.
 */
export function buildRevenue(orders: ServiceOrder[], days: number): RevenueReport {
  const keys = lastDays(days);
  const totals = new Map(keys.map(k => [k, 0]));
  let count = 0;

  orders
    .filter(o => o.status === "delivered")
    .forEach(o => {
      const key = dayKey(deliveredAt(o));
      if (key && totals.has(key)) {
        totals.set(key, (totals.get(key) ?? 0) + orderValue(o));
        count += 1;
      }
    });

  const daily = keys.map(day => ({ day, label: shortDay(day), value: totals.get(day) ?? 0 }));
  const series = days > 14 ? groupRevenueByWeek(daily) : daily;
  return { series, total: daily.reduce((s, p) => s + p.value, 0), count };
}

/** Agrupa pontos diários em semanas (segunda → domingo) com rótulo dd/mm. */
export function groupRevenueByWeek(daily: RevenuePoint[]): RevenuePoint[] {
  if (daily.length === 0) return [];
  const weeks: RevenuePoint[] = [];
  let bucket: RevenuePoint | null = null;

  daily.forEach(point => {
    const d = new Date(`${point.day}T12:00:00`);
    const weekday = d.getDay(); // 0=dom
    const isWeekStart = weekday === 1 || bucket === null;
    if (isWeekStart) {
      bucket = { day: point.day, label: shortDay(point.day), value: point.value };
      weeks.push(bucket);
    } else if (bucket) {
      bucket.value += point.value;
    }
  });
  return weeks;
}

/** Dia (ou bucket) de maior faturamento na série. */
export function peakRevenuePoint(series: RevenuePoint[]): RevenuePoint | null {
  if (series.length === 0) return null;
  return series.reduce((best, p) => (p.value > best.value ? p : best), series[0]);
}
export function revenueByPayment(movements: CashMovement[], days: number) {
  const keys = new Set(lastDays(days));
  const map = new Map<PaymentMethod, number>();
  movements
    .filter(m => isRevenue(m) && keys.has(dayKey(m.createdAt) ?? ""))
    .forEach(m => map.set(m.method, (map.get(m.method) ?? 0) + m.amount));
  return Array.from(map.entries()).map(([method, value]) => ({ method, value }));
}

export function countBy<T>(items: T[], keyOf: (item: T) => string | undefined) {
  const map = new Map<string, number>();
  items.forEach(i => {
    const key = keyOf(i) ?? "Não atribuído";
    map.set(key, (map.get(key) ?? 0) + 1);
  });
  return Array.from(map.entries())
    .map(([name, value]) => ({ name, value }))
    .sort((a, b) => b.value - a.value);
}

/** Tempo médio (em dias) entre abertura e entrega das OS entregues. */
export function averageTurnaroundDays(orders: ServiceOrder[]): number | null {
  const done = orders.filter(o => o.status === "delivered");
  if (done.length === 0) return null;
  const total = done.reduce(
    (sum, o) => sum + (+new Date(deliveredAt(o)) - +new Date(o.createdAt)) / MS_DAY,
    0
  );
  return total / done.length;
}

export interface WarrantyInfo {
  order: ServiceOrder;
  endsAt: Date;
  daysLeft: number;
  active: boolean;
}

/** OS entregues com garantia e a situação atual do prazo. */
export function buildWarranties(orders: ServiceOrder[]): WarrantyInfo[] {
  const now = Date.now();
  return orders
    .filter(o => o.status === "delivered" && (o.warrantyDays ?? 0) > 0)
    .map(order => {
      const endsAt = new Date(+new Date(deliveredAt(order)) + (order.warrantyDays ?? 0) * MS_DAY);
      const daysLeft = Math.ceil((+endsAt - now) / MS_DAY);
      return { order, endsAt, daysLeft, active: daysLeft >= 0 };
    })
    .sort((a, b) => a.daysLeft - b.daysLeft);
}
