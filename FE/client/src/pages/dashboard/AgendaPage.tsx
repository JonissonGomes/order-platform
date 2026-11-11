import { OrderDetailSheet } from "@/components/orders/OrderDetailSheet";
import { Skeleton } from "@/components/ui/skeleton";
import { EmptyState, ErrorState } from "@/components/zts/EmptyState";
import { PageHeader } from "@/components/zts/PageHeader";
import { StatusBadge } from "@/components/zts/StatusBadge";
import { useServiceOrders } from "@/hooks/queries";
import { dayKey } from "@/lib/format";
import { OPEN_STATUSES } from "@/lib/orderStatus";
import { cn } from "@/lib/utils";
import type { ServiceOrder } from "@/types";
import { CalendarDays } from "lucide-react";
import { useMemo, useState } from "react";

const dayLabel = (key: string) =>
  new Date(`${key}T12:00:00`).toLocaleDateString("pt-BR", {
    weekday: "long", day: "2-digit", month: "long",
  });

/** Ordens em aberto agrupadas por previsão de entrega (expectedAt). */
export default function AgendaPage() {
  const { data, isPending, error, refetch } = useServiceOrders();
  const [selected, setSelected] = useState<ServiceOrder | null>(null);
  const today = dayKey(new Date().toISOString())!;

  const { groups, unscheduled } = useMemo(() => {
    const open = (data ?? []).filter(o => OPEN_STATUSES.includes(o.status));
    const map = new Map<string, ServiceOrder[]>();
    const none: ServiceOrder[] = [];
    open.forEach(o => {
      const key = dayKey(o.expectedAt);
      if (!key) return none.push(o);
      map.set(key, [...(map.get(key) ?? []), o]);
    });
    const sorted = Array.from(map.entries()).sort(([a], [b]) => a.localeCompare(b));
    return { groups: sorted, unscheduled: none };
  }, [data]);

  return (
    <div className="max-w-4xl mx-auto">
      <PageHeader title="Agenda" description="Previsão de entrega das ordens em aberto." />

      {isPending ? (
        <div className="space-y-3">{Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-16" />)}</div>
      ) : error ? (
        <ErrorState message={error.message} onRetry={() => refetch()} />
      ) : groups.length === 0 && unscheduled.length === 0 ? (
        <EmptyState icon={CalendarDays} title="Nenhuma entrega prevista"
          description="Defina a previsão de entrega ao criar a OS." />
      ) : (
        <div className="space-y-6">
          {groups.map(([key, orders]) => {
            const overdue = key < today;
            return (
              <section key={key}>
                <h2 className={cn("zts-eyebrow mb-2 capitalize", overdue && "text-destructive")}>
                  {dayLabel(key)}{key === today && " · hoje"}{overdue && " · atrasadas"}
                </h2>
                <OrderRows orders={orders} onSelect={setSelected} />
              </section>
            );
          })}
          {unscheduled.length > 0 && (
            <section>
              <h2 className="zts-eyebrow mb-2">Sem previsão definida</h2>
              <OrderRows orders={unscheduled} onSelect={setSelected} />
            </section>
          )}
        </div>
      )}

      <OrderDetailSheet order={selected} onOpenChange={open => !open && setSelected(null)} />
    </div>
  );
}

function OrderRows({ orders, onSelect }: { orders: ServiceOrder[]; onSelect: (o: ServiceOrder) => void }) {
  return (
    <ul className="border rounded-md bg-card divide-y">
      {orders.map(o => (
        <li key={o.id}>
          <button type="button" onClick={() => onSelect(o)}
            className="w-full flex items-center justify-between gap-3 px-3 py-2.5 text-left hover:bg-muted/50">
            <div className="min-w-0">
              <p className="text-sm font-medium truncate">
                #{o.orderNumber} · {o.productBrand} {o.productModel}
              </p>
              <p className="text-xs text-muted-foreground truncate">{o.customer?.name ?? "Cliente"}</p>
            </div>
            <StatusBadge status={o.status} />
          </button>
        </li>
      ))}
    </ul>
  );
}
