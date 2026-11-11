import { ChartCard } from "@/components/zts/ChartCard";
import { KpiCard } from "@/components/zts/KpiCard";
import { PageHeader } from "@/components/zts/PageHeader";
import { useServiceOrders } from "@/hooks/queries";
import { ORDER_STATUS, ORDER_STATUS_LIST } from "@/lib/orderStatus";
import { averageTurnaroundDays, countBy } from "@/lib/reports";
import { CheckCircle2, Hourglass, Wrench } from "lucide-react";
import { useMemo } from "react";
import { Bar, BarChart, CartesianGrid, Cell, Pie, PieChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";

export default function PerformancePage() {
  const { data, isPending } = useServiceOrders();

  const stats = useMemo(() => {
    const orders = data ?? [];
    const delivered = orders.filter(o => o.status === "delivered");
    const closed = orders.filter(o => ["delivered", "cancelled", "unrepairable"].includes(o.status));
    return {
      total: orders.length,
      delivered: delivered.length,
      unrepairableRate: closed.length
        ? Math.round((orders.filter(o => o.status === "unrepairable").length / closed.length) * 100)
        : 0,
      turnaround: averageTurnaroundDays(orders),
      byStatus: ORDER_STATUS_LIST
        .map(s => ({ name: ORDER_STATUS[s].label, value: orders.filter(o => o.status === s).length, color: ORDER_STATUS[s].color }))
        .filter(s => s.value > 0),
      byTechnician: countBy(delivered, o => o.assignedEmployee?.name).slice(0, 8),
      byDepartment: countBy(orders, o => o.department?.name).slice(0, 8),
    };
  }, [data]);

  return (
    <div className="max-w-6xl mx-auto">
      <PageHeader title="Desempenho" description="Produtividade da bancada e fluxo das ordens de serviço." />

      <div className="grid gap-3 sm:grid-cols-3 mb-5">
        <KpiCard label="OS entregues" icon={CheckCircle2} loading={isPending} value={stats.delivered}
          hint={`${stats.total} ordens no total`} />
        <KpiCard label="Tempo médio de reparo" icon={Hourglass} loading={isPending}
          value={stats.turnaround === null ? "—" : `${stats.turnaround.toFixed(1)} dias`} hint="Da abertura à entrega" />
        <KpiCard label="Sem conserto" icon={Wrench} loading={isPending} value={`${stats.unrepairableRate}%`}
          hint="Das ordens encerradas" tone={stats.unrepairableRate > 15 ? "warning" : "default"} />
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
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

        <ChartCard title="Entregas por técnico" loading={isPending} empty={stats.byTechnician.length === 0}>
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={stats.byTechnician} layout="vertical">
              <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#d3d8df" />
              <XAxis type="number" allowDecimals={false} tick={{ fontSize: 11 }} />
              <YAxis type="category" dataKey="name" width={100} tick={{ fontSize: 11 }} />
              <Tooltip cursor={{ fill: "#e2e7ed" }} />
              <Bar dataKey="value" name="Entregas" fill="#3d5a78" radius={[0, 2, 2, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </ChartCard>

        <ChartCard title="Ordens por setor" className="lg:col-span-2" loading={isPending} empty={stats.byDepartment.length === 0}>
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={stats.byDepartment}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#d3d8df" />
              <XAxis dataKey="name" tick={{ fontSize: 11 }} />
              <YAxis allowDecimals={false} tick={{ fontSize: 11 }} width={30} />
              <Tooltip cursor={{ fill: "#e2e7ed" }} />
              <Bar dataKey="value" name="Ordens" fill="#6f8fae" radius={[2, 2, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </ChartCard>
      </div>
    </div>
  );
}
