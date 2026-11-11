import { OrderDetailSheet } from "@/components/orders/OrderDetailSheet";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { ChartCard } from "@/components/zts/ChartCard";
import { EmptyState, ErrorState } from "@/components/zts/EmptyState";
import { FiltersDialog } from "@/components/zts/FiltersDialog";
import { KpiCard } from "@/components/zts/KpiCard";
import { ListPagination } from "@/components/zts/ListPagination";
import { TableSkeleton } from "@/components/zts/TableSkeleton";
import { useClientPagination } from "@/hooks/useClientPagination";
import { useServiceOrders } from "@/hooks/queries";
import { formatDate } from "@/lib/format";
import { buildWarranties, type WarrantyInfo } from "@/lib/reports";
import type { ServiceOrder } from "@/types";
import { BadgeCheck, Search, ShieldOff, TimerReset } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";

type WarrantyFilter = "active" | "soon" | "expired";

const HEADERS = ["OS", "Cliente", "Aparelho", "IMEI", "Garantia até", "Situação"];

const POLICY = [
  { svc: "Troca de tela", days: "90 dias" },
  { svc: "Troca de bateria", days: "90 dias" },
  { svc: "Conector de carga", days: "90 dias" },
  { svc: "Reparo de placa", days: "30 dias" },
];

const BUCKETS = [
  { name: "Vencida", test: (w: WarrantyInfo) => !w.active },
  { name: "Até 7 dias", test: (w: WarrantyInfo) => w.active && w.daysLeft <= 7 },
  { name: "8 a 30 dias", test: (w: WarrantyInfo) => w.daysLeft > 7 && w.daysLeft <= 30 },
  { name: "Mais de 30", test: (w: WarrantyInfo) => w.daysLeft > 30 },
];

export default function WarrantiesPage() {
  const { data, isPending, error, refetch } = useServiceOrders({ status: "delivered" });
  const [selected, setSelected] = useState<ServiceOrder | null>(null);
  const [filter, setFilter] = useState<WarrantyFilter[]>([]);
  const [search, setSearch] = useState("");

  const warranties = useMemo(() => buildWarranties(data ?? []), [data]);
  const active = warranties.filter(w => w.active);
  const expiringSoon = active.filter(w => w.daysLeft <= 7);
  const chart = BUCKETS.map(b => ({ name: b.name, value: warranties.filter(b.test).length }));

  const filtered = useMemo(() => {
    const term = search.trim().toLowerCase();
    return warranties.filter(w => {
      const kind: WarrantyFilter = !w.active ? "expired" : w.daysLeft <= 7 ? "soon" : "active";
      if (filter.length > 0 && !filter.includes(kind)) return false;
      if (!term) return true;
      const o = w.order;
      return [o.orderNumber, o.imei, o.productBrand, o.productModel, o.customer?.name]
        .filter(Boolean)
        .some(v => String(v).toLowerCase().includes(term));
    });
  }, [warranties, filter, search]);

  const { page, pageCount, total, pageSize, pageItems, setPage, resetPage } =
    useClientPagination(filtered);

  useEffect(() => {
    resetPage();
  }, [filter, search, resetPage]);

  return (
    <div className="flex flex-col min-h-[calc(100dvh-7rem)]">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between mb-4">
        <div className="relative w-full max-w-sm">
          <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            className="pl-8"
            placeholder="Buscar IMEI, OS ou cliente"
            value={search}
            onChange={e => setSearch(e.target.value)}
          />
        </div>
        <FiltersDialog
          title="Situação da garantia"
          value={filter}
          onApply={setFilter}
          options={[
            { value: "active", label: "Ativas (> 7 dias)", count: active.length - expiringSoon.length },
            { value: "soon", label: "Vencem em 7 dias", count: expiringSoon.length },
            { value: "expired", label: "Vencidas", count: warranties.length - active.length },
          ]}
        />
      </div>

      <div className="grid gap-3 sm:grid-cols-3 mb-5">
        <KpiCard label="Garantias ativas" icon={BadgeCheck} loading={isPending} value={active.length} />
        <KpiCard
          label="Vencem em 7 dias"
          icon={TimerReset}
          loading={isPending}
          value={expiringSoon.length}
          tone={expiringSoon.length ? "warning" : "default"}
        />
        <KpiCard
          label="Vencidas"
          icon={ShieldOff}
          loading={isPending}
          value={warranties.length - active.length}
        />
      </div>

      {(isPending || warranties.length > 0) && (
        <div className="mb-4">
          <ChartCard title="Garantias por prazo restante" loading={isPending} empty={warranties.length === 0}>
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={chart}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#d3d8df" />
                <XAxis dataKey="name" tick={{ fontSize: 11 }} />
                <YAxis allowDecimals={false} width={30} tick={{ fontSize: 11 }} />
                <Tooltip cursor={{ fill: "#e2e7ed" }} />
                <Bar dataKey="value" name="Ordens" fill="#3d5a78" radius={[2, 2, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </ChartCard>
        </div>
      )}

      <div className="mb-4">
        {isPending ? (
          <TableSkeleton columns={HEADERS.length} headers={HEADERS} rows={4} />
        ) : error ? (
          <ErrorState message={error.message} onRetry={() => refetch()} />
        ) : filtered.length === 0 ? (
          <EmptyState
            icon={BadgeCheck}
            title="Nenhuma garantia registrada"
            description="Ordens entregues com garantia aparecerão aqui."
          />
        ) : (
          <>
            <div className="border rounded-md bg-card overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>{HEADERS.map(h => <TableHead key={h}>{h}</TableHead>)}</TableRow>
                </TableHeader>
                <TableBody>
                  {pageItems.map(w => (
                    <TableRow
                      key={w.order.id}
                      className="cursor-pointer"
                      onClick={() => setSelected(w.order)}
                    >
                      <TableCell className="font-mono text-xs font-medium">#{w.order.orderNumber}</TableCell>
                      <TableCell>{w.order.customer?.name ?? "—"}</TableCell>
                      <TableCell>
                        {w.order.productBrand} {w.order.productModel}
                      </TableCell>
                      <TableCell className="font-mono text-xs">{w.order.imei || "—"}</TableCell>
                      <TableCell>{formatDate(w.endsAt.toISOString())}</TableCell>
                      <TableCell>
                        <Badge
                          variant="outline"
                          className={`rounded-sm ${
                            w.active
                              ? w.daysLeft <= 7
                                ? "border-amber-300 bg-amber-50 text-amber-800"
                                : "border-emerald-200 bg-emerald-50 text-emerald-800"
                              : "bg-muted text-muted-foreground"
                          }`}
                        >
                          {w.active ? `${w.daysLeft} dia(s) restantes` : "Vencida"}
                        </Badge>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
            <ListPagination
              page={page}
              pageCount={pageCount}
              total={total}
              pageSize={pageSize}
              onPageChange={setPage}
            />
          </>
        )}
      </div>

      <footer className="mt-auto pt-4 border-t">
        <div className="border rounded-md bg-card p-4">
          <h2 className="text-sm font-semibold mb-3">Política de garantia</h2>
          <ul className="grid gap-2 sm:grid-cols-2 lg:grid-cols-4 text-sm mb-3">
            {POLICY.map(p => (
              <li key={p.svc} className="flex justify-between gap-3 sm:block sm:space-y-0.5">
                <span className="text-muted-foreground">{p.svc}</span>
                <span className="font-mono text-xs tabular-nums font-medium">{p.days}</span>
              </li>
            ))}
          </ul>
          <p className="text-xs text-muted-foreground leading-relaxed">
            Cobre peça e mão de obra. Perde validade com queda, líquido, mau uso ou violação do lacre.
          </p>
        </div>
      </footer>

      <OrderDetailSheet order={selected} onOpenChange={open => !open && setSelected(null)} />
    </div>
  );
}
