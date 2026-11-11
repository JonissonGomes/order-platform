import { OrderDetailSheet } from "@/components/orders/OrderDetailSheet";
import { Button } from "@/components/ui/button";
import { ChartCard } from "@/components/zts/ChartCard";
import { EmptyState } from "@/components/zts/EmptyState";
import { KpiCard } from "@/components/zts/KpiCard";
import { useServiceOrders } from "@/hooks/queries";
import { buildAttentionQueue } from "@/lib/attention";
import { formatCurrency } from "@/lib/format";
import { ORDER_STATUS, ORDER_STATUS_LIST } from "@/lib/orderStatus";
import { averageTurnaroundDays, countBy, orderValue } from "@/lib/reports";
import type { ServiceOrder } from "@/types";
import { ClipboardList, Hourglass, Percent, ShoppingBag, Wrench } from "lucide-react";
import { useMemo, useState } from "react";
import { Bar, BarChart, CartesianGrid, Cell, Pie, PieChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";

export default function PerformancePage() {
  const { data, isPending } = useServiceOrders();
  const [selected, setSelected] = useState<ServiceOrder | null>(null);

  const stats = useMemo(() => {
    const orders = data ?? [];
    const delivered = orders.filter(o => o.status === "delivered");
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
    return {
      total: orders.length,
      delivered: delivered.length,
      ticket,
      approvalRate: decided.length ? Math.round((approvedLike.length / decided.length) * 100) : 0,
      unrepairableRate: closed.length
        ? Math.round((orders.filter(o => o.status === "unrepairable").length / closed.length) * 100)
        : 0,
      turnaround: averageTurnaroundDays(orders),
      byStatus: ORDER_STATUS_LIST
        .map(s => ({ name: ORDER_STATUS[s].label, value: orders.filter(o => o.status === s).length, color: ORDER_STATUS[s].color }))
        .filter(s => s.value > 0),
      byTechnician: countBy(delivered, o => o.assignedEmployee?.name).slice(0, 8),
      byService: countBy(delivered, o => o.serviceType).slice(0, 6),
      byDepartment: countBy(orders, o => o.department?.name).slice(0, 8),
      stuck,
    };
  }, [data]);

  return (
    <div>
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4 mb-5">
        <KpiCard label="Ticket médio" icon={ShoppingBag} loading={isPending}
          value={formatCurrency(stats.ticket)} hint="Por OS entregue" />
        <KpiCard label="Tempo médio de reparo" icon={Hourglass} loading={isPending}
          value={stats.turnaround === null ? "—" : `${stats.turnaround.toFixed(1)} dias`} hint="Da abertura à entrega" />
        <KpiCard label="Orçamentos aprovados" icon={Percent} loading={isPending}
          value={`${stats.approvalRate}%`} hint="Das OS com decisão" />
        <KpiCard label="Sem conserto" icon={Wrench} loading={isPending} value={`${stats.unrepairableRate}%`}
          hint="Das ordens encerradas" tone={stats.unrepairableRate > 15 ? "warning" : "default"} />
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
            <ChartCard title="Ordens por status" loading={isPending} empty={stats.byStatus.length === 0}>
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie data={stats.byStatus} dataKey="value" nameKey="name" innerRadius={50} outerRadius={85} paddingAngle={1}>
                    {stats.byStatus.map(s => <Cell key={s.name} fill={s.color} />)}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
            </ChartCard>
          )}

          {(isPending || stats.byService.length > 0) && (
            <ChartCard title="Reparos mais frequentes" loading={isPending} empty={stats.byService.length === 0}>
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={stats.byService} layout="vertical">
                  <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#d3d8df" />
                  <XAxis type="number" allowDecimals={false} tick={{ fontSize: 11 }} />
                  <YAxis type="category" dataKey="name" width={120} tick={{ fontSize: 11 }} />
                  <Tooltip cursor={{ fill: "#e2e7ed" }} />
                  <Bar dataKey="value" name="OS" fill="#3d5a78" radius={[0, 2, 2, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </ChartCard>
          )}

          {(isPending || stats.byTechnician.length > 0) && (
            <ChartCard title="Entregas por técnico" loading={isPending} empty={stats.byTechnician.length === 0}>
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={stats.byTechnician} layout="vertical">
                  <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#d3d8df" />
                  <XAxis type="number" allowDecimals={false} tick={{ fontSize: 11 }} />
                  <YAxis type="category" dataKey="name" width={100} tick={{ fontSize: 11 }} />
                  <Tooltip cursor={{ fill: "#e2e7ed" }} />
                  <Bar dataKey="value" name="Entregas" fill="#6f8fae" radius={[0, 2, 2, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </ChartCard>
          )}

          {(isPending || stats.byDepartment.length > 0) && (
            <ChartCard title="Ordens por setor" className="lg:col-span-2" loading={isPending} empty={stats.byDepartment.length === 0}>
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={stats.byDepartment}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#d3d8df" />
                  <XAxis dataKey="name" tick={{ fontSize: 11 }} />
                  <YAxis allowDecimals={false} tick={{ fontSize: 11 }} width={30} />
                  <Tooltip cursor={{ fill: "#e2e7ed" }} />
                  <Bar dataKey="value" name="Ordens" fill="#94a3b8" radius={[2, 2, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
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
