import { PAYMENT_LABELS } from "@/components/cash/QuickSale";
import { ChartCard } from "@/components/zts/ChartCard";
import { EmptyState } from "@/components/zts/EmptyState";
import { FilterChips } from "@/components/zts/FilterChips";
import { KpiCard } from "@/components/zts/KpiCard";
import { ColumnBarChart, DonutChart } from "@/components/zts/SimpleCharts";
import { useCashMovements, useCashSession, useServiceOrders } from "@/hooks/queries";
import { formatCurrency } from "@/lib/format";
import { buildRevenue, orderValue, peakRevenuePoint, revenueByPayment } from "@/lib/reports";
import { CalendarDays, Receipt, ShoppingBag, TrendingUp } from "lucide-react";
import { useMemo, useState } from "react";

const PERIODS = [
  { value: "7", label: "7 dias" },
  { value: "30", label: "30 dias" },
  { value: "90", label: "90 dias" },
] as const;

const MS_DAY = 86_400_000;

export default function BillingPage() {
  const [period, setPeriod] = useState<"7" | "30" | "90">("30");
  const days = Number(period);
  const orders = useServiceOrders();
  const cash = useCashSession();
  const movements = useCashMovements(cash.data?.session?.id);
  const loading = orders.isPending || cash.isPending || movements.isLoading;

  const report = useMemo(
    () => buildRevenue(orders.data ?? [], days),
    [orders.data, days]
  );
  const peak = useMemo(() => peakRevenuePoint(report.series), [report.series]);
  const grouped = days > 14;

  const payments = useMemo(
    () =>
      revenueByPayment(movements.data ?? [], days).map(p => ({
        name: PAYMENT_LABELS[p.method] ?? p.method,
        value: p.value,
      })),
    [movements.data, days]
  );

  const byService = useMemo(() => {
    const cutoff = Date.now() - days * MS_DAY;
    const delivered = (orders.data ?? []).filter(o => {
      if (o.status !== "delivered") return false;
      const at = o.statusChangedAt ?? o.updatedAt;
      return at ? +new Date(at) >= cutoff : false;
    });
    const map = new Map<string, number>();
    delivered.forEach(o => {
      const name = o.serviceType || "Outro";
      map.set(name, (map.get(name) ?? 0) + orderValue(o));
    });
    return Array.from(map.entries())
      .map(([name, value]) => ({ name, value }))
      .sort((a, b) => b.value - a.value)
      .slice(0, 6);
  }, [orders.data, days]);

  const xInterval = grouped ? 0 : days > 30 ? 6 : days > 7 ? 2 : 0;

  return (
    <div>
      <div className="flex justify-end mb-4">
        <FilterChips
          showAll={false}
          options={PERIODS.map(p => ({ ...p }))}
          value={period}
          onChange={v => v !== "all" && setPeriod(v as "7" | "30" | "90")}
        />
      </div>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4 mb-5">
        <KpiCard
          label="Faturamento"
          icon={TrendingUp}
          loading={loading}
          value={formatCurrency(report.total)}
          hint={`Últimos ${days} dias`}
        />
        <KpiCard
          label="Ordens entregues"
          icon={Receipt}
          loading={loading}
          value={report.count}
          hint={`Últimos ${days} dias`}
        />
        <KpiCard
          label="Ticket médio"
          icon={ShoppingBag}
          loading={loading}
          value={formatCurrency(report.count ? report.total / report.count : 0)}
          hint={`Últimos ${days} dias`}
        />
        <KpiCard
          label={grouped ? "Melhor semana" : "Melhor dia"}
          icon={CalendarDays}
          loading={loading}
          value={peak && peak.value > 0 ? formatCurrency(peak.value) : "—"}
          hint={peak && peak.value > 0 ? peak.label : "Sem pico no período"}
        />
      </div>

      {!loading && report.total === 0 && payments.length === 0 && byService.length === 0 ? (
        <EmptyState
          icon={TrendingUp}
          title="Sem faturamento no período"
          description="Entregue OS ou registre pagamentos no caixa para ver os gráficos."
        />
      ) : (
        <div className="grid gap-4 lg:grid-cols-2 min-w-0">
          {(loading || report.total > 0) && (
            <ChartCard
              title={grouped ? "Receita por semana" : "Receita por dia"}
              className="lg:col-span-2 min-w-0"
              loading={loading}
              empty={report.total === 0}
              chartHeightClassName="h-56"
            >
              <ColumnBarChart
                data={report.series.map(s => ({ label: s.label, value: s.value }))}
                money
                xInterval={xInterval}
              />
            </ChartCard>
          )}

          {(loading || payments.length > 0) && (
            <ChartCard
              title="Pagamentos (caixa atual)"
              loading={loading}
              empty={payments.length === 0}
              emptyLabel="Disponível com lançamentos de caixa"
              chartHeightClassName="h-56"
            >
              <DonutChart data={payments} money />
            </ChartCard>
          )}

          {(loading || byService.length > 0) && (
            <ChartCard
              title="Receita por serviço"
              loading={loading}
              empty={byService.length === 0}
              chartHeightClassName="h-56"
            >
              <DonutChart data={byService} money />
            </ChartCard>
          )}
        </div>
      )}
    </div>
  );
}
