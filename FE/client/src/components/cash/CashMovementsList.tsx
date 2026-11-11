import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { EmptyState } from "@/components/zts/EmptyState";
import { FiltersDialog } from "@/components/zts/FiltersDialog";
import { ListPagination } from "@/components/zts/ListPagination";
import { TableSkeleton } from "@/components/zts/TableSkeleton";
import { useClientPagination } from "@/hooks/useClientPagination";
import { formatCurrency, formatDateTime } from "@/lib/format";
import { cn } from "@/lib/utils";
import type { CashMovement, CashMovementKind } from "@/types";
import { Receipt } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { PAYMENT_LABELS } from "./QuickSale";

export const KIND_LABELS: Record<CashMovementKind, string> = {
  sale: "Venda",
  os_deposit: "Sinal de OS",
  os_balance: "Saldo de OS",
  withdraw: "Sangria",
  float: "Reforço",
  other: "Outros",
};

const HEADERS = ["Hora", "Tipo", "Descrição", "Pagamento", "Valor"];
const KIND_ORDER = Object.keys(KIND_LABELS) as CashMovementKind[];

export function CashMovementsList({ movements, loading }: { movements: CashMovement[]; loading: boolean }) {
  const [kindFilter, setKindFilter] = useState<CashMovementKind[]>([]);

  const counts = useMemo(() => {
    const map: Partial<Record<CashMovementKind, number>> = {};
    movements.forEach(m => {
      map[m.kind] = (map[m.kind] ?? 0) + 1;
    });
    return map;
  }, [movements]);

  const filtered = useMemo(
    () => (kindFilter.length === 0 ? movements : movements.filter(m => kindFilter.includes(m.kind))),
    [movements, kindFilter]
  );

  const { page, pageCount, total, pageSize, pageItems, setPage, resetPage } =
    useClientPagination(filtered);

  useEffect(() => {
    resetPage();
  }, [kindFilter, resetPage]);

  if (loading) return <TableSkeleton columns={HEADERS.length} headers={HEADERS} rows={4} />;
  if (movements.length === 0)
    return <EmptyState icon={Receipt} title="Nenhum lançamento na sessão" />;

  return (
    <>
      <div className="flex justify-end mb-2">
        <FiltersDialog
          title="Tipo de lançamento"
          description="Marque os tipos que deseja ver."
          value={kindFilter}
          onApply={setKindFilter}
          options={KIND_ORDER.filter(k => (counts[k] ?? 0) > 0).map(k => ({
            value: k,
            label: KIND_LABELS[k],
            count: counts[k] ?? 0,
          }))}
        />
      </div>
      {filtered.length === 0 ? (
        <EmptyState icon={Receipt} title="Nenhum lançamento com estes filtros" />
      ) : (
        <>
          <div className="border rounded-md bg-card overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>{HEADERS.map(h => <TableHead key={h}>{h}</TableHead>)}</TableRow>
              </TableHeader>
              <TableBody>
                {pageItems.map(m => (
                  <TableRow key={m.id}>
                    <TableCell className="text-xs whitespace-nowrap">{formatDateTime(m.createdAt)}</TableCell>
                    <TableCell>{KIND_LABELS[m.kind] ?? m.kind}</TableCell>
                    <TableCell className="text-muted-foreground max-w-[260px] truncate">
                      {m.description || "—"}
                    </TableCell>
                    <TableCell>{PAYMENT_LABELS[m.method] ?? m.method}</TableCell>
                    <TableCell
                      className={cn("tabular-nums font-medium", m.type === "out" && "text-destructive")}
                    >
                      {m.type === "out" ? "−" : ""}
                      {formatCurrency(m.amount)}
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
    </>
  );
}
