import { OrderDetailSheet } from "@/components/orders/OrderDetailSheet";
import { Skeleton } from "@/components/ui/skeleton";
import { EmptyState, ErrorState } from "@/components/zts/EmptyState";
import { FiltersDialog } from "@/components/zts/FiltersDialog";
import { ListPagination } from "@/components/zts/ListPagination";
import { StatusBadge } from "@/components/zts/StatusBadge";
import { useClientPagination } from "@/hooks/useClientPagination";
import { useServiceOrders } from "@/hooks/queries";
import { dayKey, formatDate } from "@/lib/format";
import { OPEN_STATUSES } from "@/lib/orderStatus";
import { buildWarranties } from "@/lib/reports";
import { cn } from "@/lib/utils";
import type { ServiceOrder } from "@/types";
import { CalendarDays } from "lucide-react";
import { useEffect, useMemo, useState } from "react";

type AgendaBucket = "overdue" | "today" | "upcoming" | "unscheduled";

const BUCKET_LABEL: Record<AgendaBucket, string> = {
  overdue: "Atrasadas",
  today: "Hoje",
  upcoming: "Futuras",
  unscheduled: "Sem previsão",
};

const dayLabel = (key: string) =>
  new Date(`${key}T12:00:00`).toLocaleDateString("pt-BR", {
    weekday: "long",
    day: "2-digit",
    month: "long",
  });

function bucketOf(order: ServiceOrder, today: string): AgendaBucket {
  const key = dayKey(order.expectedAt);
  if (!key) return "unscheduled";
  if (key < today) return "overdue";
  if (key === today) return "today";
  return "upcoming";
}

/** Ordens em aberto agrupadas por previsão de entrega (expectedAt). */
export default function AgendaPage() {
  const { data, isPending, error, refetch } = useServiceOrders();
  const [selected, setSelected] = useState<ServiceOrder | null>(null);
  const [filter, setFilter] = useState<AgendaBucket[]>([]);
  const today = dayKey(new Date().toISOString())!;

  const openOrders = useMemo(
    () => (data ?? []).filter(o => OPEN_STATUSES.includes(o.status)),
    [data]
  );

  const counts = useMemo(() => {
    const map: Record<AgendaBucket, number> = {
      overdue: 0,
      today: 0,
      upcoming: 0,
      unscheduled: 0,
    };
    openOrders.forEach(o => {
      map[bucketOf(o, today)] += 1;
    });
    return map;
  }, [openOrders, today]);

  const filtered = useMemo(() => {
    const list =
      filter.length === 0
        ? openOrders
        : openOrders.filter(o => filter.includes(bucketOf(o, today)));
    return [...list].sort((a, b) => {
      const ka = dayKey(a.expectedAt) ?? "9999-99-99";
      const kb = dayKey(b.expectedAt) ?? "9999-99-99";
      return ka.localeCompare(kb) || a.orderNumber.localeCompare(b.orderNumber);
    });
  }, [openOrders, filter, today]);

  const { page, pageCount, total, pageSize, pageItems, setPage, resetPage } =
    useClientPagination(filtered);

  const warrantyReturns = useMemo(
    () =>
      buildWarranties(data ?? [])
        .filter(w => w.active && w.daysLeft <= 15)
        .slice(0, 8),
    [data]
  );

  useEffect(() => {
    resetPage();
  }, [filter, resetPage]);

  return (
    <div>
      <div className="flex justify-end mb-4">
        <FiltersDialog
          title="Previsão"
          description="Filtre por atraso, hoje, futuras ou sem data."
          value={filter}
          onApply={setFilter}
          options={(Object.keys(BUCKET_LABEL) as AgendaBucket[]).map(k => ({
            value: k,
            label: BUCKET_LABEL[k],
            count: counts[k],
          }))}
        />
      </div>

      {isPending ? (
        <div className="space-y-3">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-16" />
          ))}
        </div>
      ) : error ? (
        <ErrorState message={error.message} onRetry={() => refetch()} />
      ) : filtered.length === 0 ? (
        <EmptyState
          icon={CalendarDays}
          title="Nenhuma entrega prevista"
          description="Defina a previsão de entrega ao criar a OS."
        />
      ) : (
        <>
          <ul className="border rounded-md bg-card divide-y">
            {pageItems.map(o => {
              const key = dayKey(o.expectedAt);
              const bucket = bucketOf(o, today);
              const overdue = bucket === "overdue";
              return (
                <li key={o.id}>
                  <button
                    type="button"
                    onClick={() => setSelected(o)}
                    className="w-full flex items-center justify-between gap-3 px-3 py-2.5 text-left hover:bg-muted/50"
                  >
                    <div className="min-w-0">
                      <p className="text-sm font-medium truncate">
                        #{o.orderNumber} · {o.productBrand} {o.productModel}
                      </p>
                      <p className="text-xs text-muted-foreground truncate">
                        {o.customer?.name ?? "Cliente"}
                        {" · "}
                        <span className={cn(overdue && "text-destructive")}>
                          {key
                            ? `${dayLabel(key)}${key === today ? " · hoje" : ""}${overdue ? " · atrasada" : ""}`
                            : BUCKET_LABEL.unscheduled}
                        </span>
                      </p>
                    </div>
                    <StatusBadge status={o.status} />
                  </button>
                </li>
              );
            })}
          </ul>
          <ListPagination
            page={page}
            pageCount={pageCount}
            total={total}
            pageSize={pageSize}
            onPageChange={setPage}
          />
        </>
      )}

      {warrantyReturns.length > 0 && (
        <section className="mt-6">
          <h2 className="zts-eyebrow mb-2">Retornos de garantia (próximos 15 dias)</h2>
          <ul className="border rounded-md bg-card divide-y">
            {warrantyReturns.map(w => (
              <li key={w.order.id}>
                <button
                  type="button"
                  onClick={() => setSelected(w.order)}
                  className="w-full flex items-center justify-between gap-3 px-3 py-2.5 text-left hover:bg-muted/50"
                >
                  <div className="min-w-0">
                    <p className="text-sm font-medium truncate">
                      Garantia · #{w.order.orderNumber} · {w.order.productBrand}{" "}
                      {w.order.productModel}
                    </p>
                    <p className="text-xs text-muted-foreground truncate">
                      {w.order.customer?.name ?? "Cliente"} · até {formatDate(w.endsAt.toISOString())} ·{" "}
                      {w.daysLeft} dia(s)
                    </p>
                  </div>
                  <StatusBadge status={w.order.status} />
                </button>
              </li>
            ))}
          </ul>
        </section>
      )}

      <OrderDetailSheet order={selected} onOpenChange={open => !open && setSelected(null)} />
    </div>
  );
}
