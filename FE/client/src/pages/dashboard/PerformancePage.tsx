import { OrderDetailSheet } from "@/components/orders/OrderDetailSheet";
import { Button } from "@/components/ui/button";
import { ChartCard } from "@/components/zts/ChartCard";
import { EmptyState } from "@/components/zts/EmptyState";
import { KpiCard } from "@/components/zts/KpiCard";
import { CHART_BLUE, ColumnBarChart, DonutChart } from "@/components/zts/SimpleCharts";
import { useServiceOrders } from "@/hooks/queries";
import { buildAttentionQueue } from "@/lib/attention";
import { formatCurrency } from "@/lib/format";
import { OPEN_STATUSES, ORDER_STATUS, ORDER_STATUS_LIST } from "@/lib/orderStatus";
import { averageTurnaroundDays, countBy, orderValue } from "@/lib/reports";
import type { ServiceOrder } from "@/types";
import { ClipboardList, Hourglass, PackageCheck, Percent, ShoppingBag, Wrench } from "lucide-react";
import { useMemo, useState } from "react";

export default function PerformancePage() {
  const { data, isPending } = useServiceOrders();
  const [selected, setSelected] = useState<ServiceOrder | null>(null);

  const stats = useMemo(() => {
    const orders = data ?? [];
    const delivered = orders.filter(o => o.status === "delivered");
    const open = orders.filter(o => OPEN_STATUSES.includes(o.status));
    const closed = orders.filter(o => ["delivered", "cancelled", "unrepairable"].includes(o.status));
    const decided = orders.filter(o =>
      ["approved", "waiting_parts", "in_repair", "testing", "ready", "delivered", "cancelled"].includes(o.status)
    );
    const approvedLike = decided.filter(o => o.status !== "cancelled");
    const ticket =
      delivered.length > 0
        ? delivered.reduce((s, o) => s + orderValue(o), 0) / delivered.length
        : 0;
    const stuck = buildAttentionQueue(orders).filter(i => i.tone === "bad");
    const byTechnician = countBy(delivered, o => o.assignedEmployee?.name).slice(0, 8);
    return {
      total: orders.length,
      open: open.length,
      ready: orders.filter(o => o.status === "ready").length,
      delivered: delivered.length,
      ticket,
      approvalRate: decided.length ? Math.round((approvedLike.length / decided.length) * 100) : 0,
      unrepairableRate: closed.length
        ? Math.round((orders.filter(o => o.status === "unrepairable").length / closed.length) * 100)
        : 0,
      turnaround: averageTurnaroundDays(orders),
      byStatus: ORDER_STATUS_LIST
        .map(s => ({
          name: ORDER_STATUS[s].label,
          value: orders.filter(o => o.status === s).length,
          color: ORDER_STATUS[s].color,
        }))
        .filter(s => s.value > 0),
      byTechnicianBars: byTechnician.map(t => ({
        label: t.name.length > 10 ? `${t.name.slice(0, 9)}…` : t.name,
        value: t.value,
      })),
      byService: countBy(delivered, o => o.serviceType).slice(0, 6),
      byDepartment: countBy(orders, o => o.department?.name).slice(0, 8).map(d => ({
        label: d.name.length > 12 ? `${d.name.slice(0, 11)}…` : d.name,
        value: d.value,
      })),
      stuck,
    };
  }, [data]);

  return (
    <div>
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 mb-5">
        <KpiCard label="Ticket médio" icon={ShoppingBag} loading={isPending}
          value={formatCurrency(stats.ticket)} hint="Por OS entregue" />
        <KpiCard label="Tempo médio" icon={Hourglass} loading={isPending}
          value={stats.turnaround === null ? "—" : `${stats.turnaround.toFixed(1)} d`}
          hint="Abertura → entrega" />
        <KpiCard label="Aprovação" icon={Percent} loading={isPending}
          value={`${stats.approvalRate}%`} hint="Orçamentos aprovados" />
        <KpiCard label="Sem conserto" icon={Wrench} loading={isPending}
          value={`${stats.unrepairableRate}%`} hint="Das encerradas"
          tone={stats.unrepairableRate > 15 ? "warning" : "default"} />
        <KpiCard label="Em aberto" icon={ClipboardList} loading={isPending}
          value={stats.open} hint="Fila atual" />
        <KpiCard label="Prontas" icon={PackageCheck} loading={isPending}
          value={stats.ready} hint="Aguardando retirada" />
      </div>

      {!isPending && stats.total === 0 ? (
        <EmptyState
          icon={ClipboardList}
          title="Ainda sem ordens para medir"
          description="Os gráficos aparecem assim que houver OS no período."
        />
      ) : (
        <div className="grid gap-4 lg:grid-cols-2">
          {(isPending || stats.byStatus.length > 0) && (
            <ChartCard
              title="Ordens por status"
              loading={isPending}
              empty={stats.byStatus.length === 0}
              chartHeightClassName="h-56"
            >
              <DonutChart data={stats.byStatus} />
            </ChartCard>
          )}

          {(isPending || stats.byService.length > 0) && (
            <ChartCard
              title="Reparos mais frequentes"
              loading={isPending}
              empty={stats.byService.length === 0}
              chartHeightClassName="h-56"
            >
              <DonutChart data={stats.byService} />
            </ChartCard>
          )}

          {(isPending || stats.byTechnicianBars.length > 0) && (
            <ChartCard
              title="Entregas por técnico"
              loading={isPending}
              empty={stats.byTechnicianBars.length === 0}
              chartHeightClassName="h-56"
            >
              <ColumnBarChart data={stats.byTechnicianBars} fill={CHART_BLUE} />
            </ChartCard>
          )}

          {(isPending || stats.byDepartment.length > 0) && (
            <ChartCard
              title="Ordens por setor"
              loading={isPending}
              empty={stats.byDepartment.length === 0}
              chartHeightClassName="h-56"
            >
              <ColumnBarChart data={stats.byDepartment} fill="#6f8fae" />
            </ChartCard>
          )}
        </div>
      )}

      <section className="mt-4 border rounded-md bg-card p-4">
        <div className="flex items-center justify-between gap-2 mb-3">
          <h2 className="text-sm font-semibold">Aparelhos parados há mais de 48 h</h2>
          <span className="text-xs text-muted-foreground">Sem atualização de status</span>
        </div>
        {isPending ? null : stats.stuck.length === 0 ? (
          <p className="text-sm text-muted-foreground">Nenhum aparelho parado.</p>
        ) : (
          <ul className="divide-y">
            {stats.stuck.map(item => (
              <li key={item.order.id} className="flex items-center justify-between gap-3 py-2.5">
                <div className="min-w-0">
                  <p className="text-sm font-medium truncate">
                    #{item.order.orderNumber} · {item.order.productBrand} {item.order.productModel}
                  </p>
                  <p className="text-xs text-muted-foreground">{item.reason}</p>
                </div>
                <Button variant="ghost" size="sm" onClick={() => setSelected(item.order)}>
                  Abrir
                </Button>
              </li>
            ))}
          </ul>
        )}
      </section>

      <OrderDetailSheet order={selected} onOpenChange={open => !open && setSelected(null)} />
    </div>
  );
}
