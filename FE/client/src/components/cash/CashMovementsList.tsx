import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { EmptyState } from "@/components/zts/EmptyState";
import { TableSkeleton } from "@/components/zts/TableSkeleton";
import { formatCurrency, formatDateTime } from "@/lib/format";
import { cn } from "@/lib/utils";
import type { CashMovement, CashMovementKind } from "@/types";
import { Receipt } from "lucide-react";
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

export function CashMovementsList({ movements, loading }: { movements: CashMovement[]; loading: boolean }) {
  if (loading) return <TableSkeleton columns={HEADERS.length} headers={HEADERS} rows={4} />;
  if (movements.length === 0)
    return <EmptyState icon={Receipt} title="Nenhum lançamento na sessão" />;

  return (
    <div className="border rounded-md bg-card overflow-x-auto">
      <Table>
        <TableHeader>
          <TableRow>{HEADERS.map(h => <TableHead key={h}>{h}</TableHead>)}</TableRow>
        </TableHeader>
        <TableBody>
          {movements.map(m => (
            <TableRow key={m.id}>
              <TableCell className="text-xs whitespace-nowrap">{formatDateTime(m.createdAt)}</TableCell>
              <TableCell>{KIND_LABELS[m.kind] ?? m.kind}</TableCell>
              <TableCell className="text-muted-foreground max-w-[260px] truncate">{m.description || "—"}</TableCell>
              <TableCell>{PAYMENT_LABELS[m.method] ?? m.method}</TableCell>
              <TableCell className={cn("tabular-nums font-medium", m.type === "out" && "text-destructive")}>
                {m.type === "out" ? "−" : ""}{formatCurrency(m.amount)}
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
