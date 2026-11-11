import { OrderDetailSheet } from "@/components/orders/OrderDetailSheet";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { EmptyState, ErrorState } from "@/components/zts/EmptyState";
import { FiltersDialog } from "@/components/zts/FiltersDialog";
import { ListPagination } from "@/components/zts/ListPagination";
import { StatusBadge } from "@/components/zts/StatusBadge";
import { TableSkeleton } from "@/components/zts/TableSkeleton";
import { useClientPagination } from "@/hooks/useClientPagination";
import { useServiceOrders } from "@/hooks/queries";
import { usePermissions } from "@/hooks/usePermissions";
import { formatCurrency, formatDate } from "@/lib/format";
import { printOrderReceipt } from "@/lib/orderReceipt";
import { ORDER_STATUS, ORDER_STATUS_LIST } from "@/lib/orderStatus";
import type { ServiceOrder, ServiceOrderStatus } from "@/types";
import { ClipboardList, FilePlus2, Printer, Search } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { useLocation } from "wouter";

export default function OrdersList() {
  const [, setLocation] = useLocation();
  const { can } = usePermissions();
  const { data, isPending, error, refetch } = useServiceOrders();
  const [statusFilter, setStatusFilter] = useState<ServiceOrderStatus[]>([]);
  const [search, setSearch] = useState("");
  const [selected, setSelected] = useState<ServiceOrder | null>(null);
  const [printingId, setPrintingId] = useState<string | null>(null);

  const counts = useMemo(() => {
    const map: Partial<Record<ServiceOrderStatus, number>> = {};
    (data ?? []).forEach(o => (map[o.status] = (map[o.status] ?? 0) + 1));
    return map;
  }, [data]);

  const filtered = useMemo(() => {
    const term = search.trim().toLowerCase();
    return (data ?? [])
      .filter(o => statusFilter.length === 0 || statusFilter.includes(o.status))
      .filter(
        o =>
          !term ||
          [o.orderNumber, o.customer?.name, o.productBrand, o.productModel, o.imei]
            .filter(Boolean)
            .some(v => String(v).toLowerCase().includes(term))
      );
  }, [data, statusFilter, search]);

  const { page, pageCount, total, pageSize, pageItems, setPage, resetPage } =
    useClientPagination(filtered);

  useEffect(() => {
    resetPage();
  }, [search, statusFilter, resetPage]);

  const handlePrint = async (order: ServiceOrder, e: React.MouseEvent) => {
    e.stopPropagation();
    setPrintingId(order.id);
    try {
      await printOrderReceipt(order.id);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Falha ao imprimir");
    } finally {
      setPrintingId(null);
    }
  };

  return (
    <div>
      <div className="flex flex-wrap items-center justify-end gap-2 mb-4">
        <div className="relative w-full min-w-0 sm:w-64 sm:max-w-sm">
          <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="pl-8"
            placeholder="Buscar por OS, cliente, aparelho ou IMEI"
          />
        </div>
        <FiltersDialog
          title="Status da OS"
          description="Marque os status que deseja ver na lista."
          value={statusFilter}
          onApply={setStatusFilter}
          options={ORDER_STATUS_LIST.map(s => ({
            value: s,
            label: ORDER_STATUS[s].label,
            count: counts[s] ?? 0,
          }))}
        />
        {can("service_orders.create") && (
          <Button size="sm" onClick={() => setLocation("/dashboard/ordens/nova")}>
            <FilePlus2 className="h-4 w-4" /> Nova OS
          </Button>
        )}
      </div>

      {isPending ? (
        <TableSkeleton columns={7} headers={["OS", "Cliente", "Aparelho", "Status", "Previsão", "Orçamento", "Valor final"]} />
      ) : error ? (
        <ErrorState message={error.message} onRetry={() => refetch()} />
      ) : filtered.length === 0 ? (
        <EmptyState
          icon={ClipboardList}
          title="Nenhuma ordem encontrada"
          description="Ajuste os filtros ou crie uma nova ordem de serviço."
        />
      ) : (
        <>
          <div className="border rounded-md bg-card overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>OS</TableHead>
                  <TableHead>Cliente</TableHead>
                  <TableHead>Aparelho</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Previsão</TableHead>
                  <TableHead className="text-right">Orçamento</TableHead>
                  <TableHead className="text-right">Valor final</TableHead>
                  <TableHead className="text-right w-[4rem]">Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {pageItems.map(o => (
                  <TableRow key={o.id} className="cursor-pointer" onClick={() => setSelected(o)}>
                    <TableCell className="font-mono text-xs font-medium">#{o.orderNumber}</TableCell>
                    <TableCell>{o.customer?.name ?? "—"}</TableCell>
                    <TableCell>
                      {o.productBrand} {o.productModel}
                    </TableCell>
                    <TableCell>
                      <StatusBadge status={o.status} />
                    </TableCell>
                    <TableCell>{formatDate(o.expectedAt)}</TableCell>
                    <TableCell className="text-right tabular-nums">
                      {o.estimatedCost ? formatCurrency(o.estimatedCost) : "—"}
                    </TableCell>
                    <TableCell className="text-right tabular-nums font-medium">
                      {o.finalCost && o.finalCost > 0 ? formatCurrency(o.finalCost) : "—"}
                    </TableCell>
                    <TableCell className="text-right">
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8"
                        title="Imprimir comprovante"
                        disabled={printingId === o.id}
                        onClick={e => handlePrint(o, e)}
                      >
                        <Printer className="h-4 w-4" />
                      </Button>
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

      <OrderDetailSheet order={selected} onOpenChange={open => !open && setSelected(null)} />
    </div>
  );
}
