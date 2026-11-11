import { useAuth } from "@/_core/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { EmptyState } from "@/components/zts/EmptyState";
import { KpiCard } from "@/components/zts/KpiCard";
import { PageHeader } from "@/components/zts/PageHeader";
import { StatusBadge } from "@/components/zts/StatusBadge";
import { useCashSession, useProducts, useServiceOrders } from "@/hooks/queries";
import { usePermissions } from "@/hooks/usePermissions";
import { formatCurrency, formatDateTime, isSameDay } from "@/lib/format";
import { OPEN_STATUSES } from "@/lib/orderStatus";
import { AlertTriangle, CalendarClock, ClipboardList, FilePlus2, PackageCheck, Wallet } from "lucide-react";
import { useMemo } from "react";
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

  // Cada fonte falha isoladamente (backend pode estar atrasado): erro vira lista vazia.
  const orders = useServiceOrders();
  const products = useProducts();
  const session = useCashSession();

  const stats = useMemo(() => {
    const list = orders.data ?? [];
    const open = list.filter(o => OPEN_STATUSES.includes(o.status));
    return {
      open: open.length,
      ready: list.filter(o => o.status === "ready").length,
      dueToday: open.filter(o => isSameDay(o.expectedAt)),
      recent: [...list]
        .sort((a, b) => +new Date(b.createdAt) - +new Date(a.createdAt))
        .slice(0, 6),
      lowStock: (products.data ?? []).filter(p => p.isActive && p.qty <= p.minQty),
    };
  }, [orders.data, products.data]);

  const allFailed = orders.isError && products.isError && session.isError;

  return (
    <div>
      <PageHeader
        title="Resumo"
        description={`Olá, ${user?.name?.split(" ")[0] ?? "equipe"}. Veja como está o balcão hoje.`}
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

      {/* Mobile: 1 coluna (como no mock). ≥sm: 2. ≥lg: 4. */}
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4 mb-5">
        <KpiCard label="OS em aberto" icon={ClipboardList} loading={orders.isPending}
          value={stats.open} hint="Aguardando ação da equipe" />
        <KpiCard label="Prontas p/ retirada" icon={PackageCheck} loading={orders.isPending}
          value={stats.ready} hint="Avise o cliente" />
        <KpiCard label="Estoque baixo" icon={AlertTriangle} loading={products.isPending}
          tone={stats.lowStock.length ? "warning" : "default"}
          value={stats.lowStock.length} hint="Produtos no mínimo ou abaixo" />
        <KpiCard label="Caixa" icon={Wallet} loading={session.isPending}
          value={session.data?.session ? formatCurrency(session.data.summary?.totalIn) : "Fechado"}
          hint={session.data?.session ? "Entradas na sessão atual" : "Nenhuma sessão aberta"} />
      </div>

      <div className="grid gap-4 lg:grid-cols-5">
        <Card className="lg:col-span-3 gap-3 py-4">
          <CardHeader className="px-4 flex-row items-center justify-between gap-2">
            <CardTitle className="text-sm">Ordens recentes</CardTitle>
            <Button variant="ghost" size="sm" className="shrink-0" onClick={() => setLocation("/dashboard/ordens")}>
              Ver todas
            </Button>
          </CardHeader>
          <CardContent className="px-4">
            {orders.isPending ? (
              <ListSkeleton />
            ) : stats.recent.length === 0 ? (
              <EmptyState icon={ClipboardList} title="Nenhuma ordem de serviço ainda"
                description="As ordens criadas aparecerão aqui." />
            ) : (
              <ul className="divide-y">
                {stats.recent.map(o => (
                  <li key={o.id} className="flex items-center justify-between gap-3 py-2.5">
                    <div className="min-w-0">
                      <p className="text-sm font-medium truncate">
                        #{o.orderNumber} · {o.productBrand} {o.productModel}
                      </p>
                      <p className="text-xs text-muted-foreground truncate">
                        {o.customer?.name ?? "Cliente"} · {formatDateTime(o.createdAt)}
                      </p>
                    </div>
                    <StatusBadge status={o.status} />
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>

        <Card className="lg:col-span-2 gap-3 py-4">
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
                  <li key={o.id} className="py-2.5 text-sm">
                    <p className="font-medium">#{o.orderNumber} · {o.customer?.name ?? "Cliente"}</p>
                    <p className="text-xs text-muted-foreground">
                      {o.productBrand} {o.productModel}
                    </p>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
