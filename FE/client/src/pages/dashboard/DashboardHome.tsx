import { useAuth } from "@/_core/hooks/useAuth";
import { OrderDetailSheet } from "@/components/orders/OrderDetailSheet";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { ChartCard } from "@/components/zts/ChartCard";
import { EmptyState } from "@/components/zts/EmptyState";
import { KpiCard } from "@/components/zts/KpiCard";
import { PageHeader } from "@/components/zts/PageHeader";
import { StatusBadge } from "@/components/zts/StatusBadge";
import { useCashSession, useProducts, useServiceOrders } from "@/hooks/queries";
import { usePermissions } from "@/hooks/usePermissions";
import { buildAttentionQueue } from "@/lib/attention";
import { formatCurrency, isSameDay } from "@/lib/format";
import { OPEN_STATUSES } from "@/lib/orderStatus";
import { buildRevenue } from "@/lib/reports";
import type { ServiceOrder } from "@/types";
import {
  AlertTriangle,
  CalendarClock,
  ClipboardList,
  FilePlus2,
  PackageCheck,
  Wallet,
} from "lucide-react";
import { useMemo, useState } from "react";
import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { useLocation } from "wouter";

function ListSkeleton({ rows = 4 }: { rows?: number }) {
  return (
    <div className="space-y-3">
      {Array.from({ length: rows }).map((_, i) => (
        <Skeleton key={i} className="h-9 w-full" />
      ))}
    </div>
  );
}

export default function DashboardHome() {
  const { user } = useAuth();
  const { can } = usePermissions();
  const [, setLocation] = useLocation();
  const [selected, setSelected] = useState<ServiceOrder | null>(null);

  const orders = useServiceOrders();
  const products = useProducts();
  const session = useCashSession();

  const stats = useMemo(() => {
    const list = orders.data ?? [];
    const open = list.filter(o => OPEN_STATUSES.includes(o.status));
    const week = buildRevenue(list, 7);
    return {
      open: open.length,
      awaitingApproval: open.filter(o => o.status === "evaluating").length,
      ready: list.filter(o => o.status === "ready").length,
      dueToday: open.filter(o => isSameDay(o.expectedAt)),
      attention: buildAttentionQueue(list).slice(0, 8),
      lowStock: (products.data ?? [])
        .filter(p => p.isActive && p.qty <= p.minQty)
        .sort((a, b) => a.qty - b.qty)
        .slice(0, 5),
      week,
    };
  }, [orders.data, products.data]);

  const allFailed = orders.isError && products.isError && session.isError;

  return (
    <div>
      <PageHeader
        title="Resumo"
        description={`Olá, ${user?.name?.split(" ")[0] ?? "equipe"}. Visão rápida da operação da loja.`}
        actions={
          can("service_orders.create") && (
            <Button size="sm" onClick={() => setLocation("/dashboard/ordens/nova")}>
              <FilePlus2 className="h-4 w-4" /> Nova OS
            </Button>
          )
        }
      />

      {allFailed && (
        <div className="mb-4 border border-amber-300 bg-amber-50 text-amber-900 rounded-md p-3 text-sm">
          Não foi possível carregar os dados da API. Verifique a conexão com o backend.
        </div>
      )}

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4 mb-5">
        <KpiCard
          label="OS em aberto"
          icon={ClipboardList}
          loading={orders.isPending}
          value={stats.open}
          hint={`${stats.awaitingApproval} aguardando aprovação`}
        />
        <KpiCard
          label="Prontas p/ retirada"
          icon={PackageCheck}
          loading={orders.isPending}
          value={stats.ready}
          hint="Avise o cliente"
        />
        <KpiCard
          label="Estoque baixo"
          icon={AlertTriangle}
          loading={products.isPending}
          tone={stats.lowStock.length ? "warning" : "default"}
          value={(products.data ?? []).filter(p => p.isActive && p.qty <= p.minQty).length}
          hint="Itens para repor"
        />
        <KpiCard
          label="Caixa"
          icon={Wallet}
          loading={session.isPending}
          value={session.data?.session ? formatCurrency(session.data.summary?.totalIn) : "Fechado"}
          hint={session.data?.session ? "Entradas na sessão atual" : "Nenhuma sessão aberta"}
        />
      </div>

      <div className="grid gap-4 lg:grid-cols-2 mb-4">
        <Card className="gap-3 py-4">
          <CardHeader className="px-4 flex-row items-center justify-between gap-2">
            <CardTitle className="text-sm">Precisam de atenção</CardTitle>
            <Button
              variant="ghost"
              size="sm"
              className="shrink-0"
              onClick={() => setLocation("/dashboard/ordens")}
            >
              Ver todas
            </Button>
          </CardHeader>
          <CardContent className="px-4">
            {orders.isPending ? (
              <ListSkeleton />
            ) : stats.attention.length === 0 ? (
              <EmptyState icon={ClipboardList} title="Nenhuma pendência" />
            ) : (
              <ul className="divide-y">
                {stats.attention.map(item => (
                  <li
                    key={item.order.id}
                    className="flex items-center justify-between gap-3 py-2.5"
                  >
                    <div className="min-w-0">
                      <p className="text-sm font-medium truncate">
                        #{item.order.orderNumber} · {item.order.productBrand}{" "}
                        {item.order.productModel}
                      </p>
                      <p className="text-xs text-muted-foreground truncate">
                        {item.order.customer?.name ?? "Cliente"} · {item.reason}
                      </p>
                    </div>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="shrink-0"
                      onClick={() => setSelected(item.order)}
                    >
                      Abrir
                    </Button>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>

        <ChartCard
          title="Faturamento da semana"
          loading={orders.isPending}
          empty={stats.week.total === 0}
          emptyLabel="Sem entregas nos últimos 7 dias"
        >
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={stats.week.series}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#d3d8df" />
              <XAxis dataKey="label" tick={{ fontSize: 11 }} />
              <YAxis tick={{ fontSize: 11 }} width={50} tickFormatter={v => `R$${v}`} />
              <Tooltip formatter={(v: number) => formatCurrency(v)} cursor={{ fill: "#e2e7ed" }} />
              <Bar dataKey="value" name="Receita" fill="#3d5a78" radius={[2, 2, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </ChartCard>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card className="gap-3 py-4">
          <CardHeader className="px-4 flex-row items-center justify-between gap-2">
            <CardTitle className="text-sm">Estoque para repor</CardTitle>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setLocation("/dashboard/produtos")}
            >
              Ver estoque
            </Button>
          </CardHeader>
          <CardContent className="px-4">
            {products.isPending ? (
              <ListSkeleton rows={3} />
            ) : stats.lowStock.length === 0 ? (
              <EmptyState icon={AlertTriangle} title="Estoque em dia" />
            ) : (
              <ul className="divide-y">
                {stats.lowStock.map(p => (
                  <li key={p.id} className="flex items-center justify-between gap-3 py-2.5">
                    <div className="min-w-0">
                      <p className="text-sm font-medium truncate">{p.name}</p>
                      <p className="text-xs text-muted-foreground">Mínimo {p.minQty}</p>
                    </div>
                    <span
                      className={`text-xs font-medium tabular-nums ${
                        p.qty <= 0 ? "text-destructive" : "text-amber-700"
                      }`}
                    >
                      {p.qty <= 0 ? "Zerado" : `${p.qty} em estoque`}
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>

        <Card className="gap-3 py-4">
          <CardHeader className="px-4">
            <CardTitle className="text-sm flex items-center gap-2">
              <CalendarClock className="h-4 w-4 text-muted-foreground" /> Retiradas previstas hoje
            </CardTitle>
          </CardHeader>
          <CardContent className="px-4">
            {orders.isPending ? (
              <ListSkeleton rows={3} />
            ) : stats.dueToday.length === 0 ? (
              <EmptyState icon={CalendarClock} title="Nada previsto para hoje" />
            ) : (
              <ul className="divide-y">
                {stats.dueToday.map(o => (
                  <li key={o.id}>
                    <button
                      type="button"
                      className="w-full flex items-center justify-between gap-3 py-2.5 text-left hover:bg-muted/40"
                      onClick={() => setSelected(o)}
                    >
                      <div className="min-w-0">
                        <p className="text-sm font-medium truncate">
                          #{o.orderNumber} · {o.customer?.name ?? "Cliente"}
                        </p>
                        <p className="text-xs text-muted-foreground truncate">
                          {o.productBrand} {o.productModel}
                        </p>
                      </div>
                      <StatusBadge status={o.status} />
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>
      </div>

      <OrderDetailSheet order={selected} onOpenChange={open => !open && setSelected(null)} />
    </div>
  );
}
