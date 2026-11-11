import { PAYMENT_LABELS } from "@/components/cash/QuickSale";
import { ChartCard } from "@/components/zts/ChartCard";
import { FilterChips } from "@/components/zts/FilterChips";
import { KpiCard } from "@/components/zts/KpiCard";
import { PageHeader } from "@/components/zts/PageHeader";
import { useCashMovements, useCashSession, useServiceOrders } from "@/hooks/queries";
import { formatCurrency } from "@/lib/format";
import { buildRevenue, revenueByPayment } from "@/lib/reports";
import { Receipt, ShoppingBag, TrendingUp } from "lucide-react";
import { useMemo, useState } from "react";
import { Bar, BarChart, CartesianGrid, Cell, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";

const PERIODS = [
  { value: "7", label: "7 dias" },
  { value: "30", label: "30 dias" },
  { value: "90", label: "90 dias" },
] as const;

const COLORS = ["#3d5a78", "#6f8fae", "#1a1f26", "#94a3b8"];

export default function BillingPage() {
  const [period, setPeriod] = useState<"7" | "30" | "90">("30");
  const days = Number(period);
  const orders = useServiceOrders();
  // O backend lista lançamentos por sessão: o detalhamento por pagamento usa a sessão atual.
  const cash = useCashSession();
  const movements = useCashMovements(cash.data?.session?.id);
  const loading = orders.isPending || cash.isPending || movements.isLoading;

  const report = useMemo(
    () => buildRevenue(orders.data ?? [], days),
    [orders.data, days]
  );
  const payments = useMemo(
    () =>
      revenueByPayment(movements.data ?? [], days).map(p => ({
        name: PAYMENT_LABELS[p.method] ?? p.method,
        value: p.value,
      })),
    [movements.data, days]
  );

  return (
    <div>
      <PageHeader
        title="Faturamento"
        description="Receita das ordens entregues no período; formas de pagamento vêm da sessão de caixa atual."
        actions={<FilterChips showAll={false} options={PERIODS.map(p => ({ ...p }))} value={period}
          onChange={v => v !== "all" && setPeriod(v as "7" | "30" | "90")} />}
      />

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-3 mb-5">
        <KpiCard label="Faturamento" icon={TrendingUp} loading={loading} value={formatCurrency(report.total)} hint={`Últimos ${days} dias`} />
        <KpiCard label="Ordens entregues" icon={Receipt} loading={loading} value={report.count} hint={`Últimos ${days} dias`} />
        <KpiCard label="Ticket médio" icon={ShoppingBag} loading={loading}
          value={formatCurrency(report.count ? report.total / report.count : 0)} hint={`Últimos ${days} dias`} />
      </div>

      <div className="grid gap-4 lg:grid-cols-3 min-w-0">
        <ChartCard title="Receita por dia" className="lg:col-span-2 min-w-0" loading={loading} empty={report.total === 0}>
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={report.series}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#d3d8df" />
              <XAxis dataKey="label" tick={{ fontSize: 11 }} interval={days > 30 ? 6 : days > 7 ? 2 : 0} />
              <YAxis tick={{ fontSize: 11 }} width={60} tickFormatter={v => `R$${v}`} />
              <Tooltip formatter={(v: number) => formatCurrency(v)} cursor={{ fill: "#e2e7ed" }} />
              <Bar dataKey="value" name="Receita" fill="#3d5a78" radius={[2, 2, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </ChartCard>

        <ChartCard title="Pagamentos (sessão de caixa atual)" loading={loading} empty={payments.length === 0}
          emptyLabel="Disponível com lançamentos de caixa">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={payments} layout="vertical">
              <XAxis type="number" hide />
              <YAxis type="category" dataKey="name" tick={{ fontSize: 11 }} width={70} />
              <Tooltip formatter={(v: number) => formatCurrency(v)} cursor={{ fill: "#e2e7ed" }} />
              <Bar dataKey="value" radius={[0, 2, 2, 0]}>
                {payments.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </ChartCard>
      </div>
    </div>
  );
}
