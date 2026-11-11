import { ProductFormDialog } from "@/components/products/ProductFormDialog";
import { ProductLabelDialog } from "@/components/products/ProductLabelDialog";
import { StockAdjustDialog } from "@/components/products/StockAdjustDialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { EmptyState, ErrorState } from "@/components/zts/EmptyState";
import { FiltersDialog } from "@/components/zts/FiltersDialog";
import { KpiCard } from "@/components/zts/KpiCard";
import { ListPagination } from "@/components/zts/ListPagination";
import { TableSkeleton } from "@/components/zts/TableSkeleton";
import { useClientPagination } from "@/hooks/useClientPagination";
import { useProducts } from "@/hooks/queries";
import { usePermissions } from "@/hooks/usePermissions";
import { formatCurrency } from "@/lib/format";
import type { Product } from "@/types";
import {
  AlertTriangle,
  ArrowLeftRight,
  Package,
  Pencil,
  Plus,
  Search,
  Tag,
  WalletCards,
} from "lucide-react";
import { useEffect, useMemo, useState } from "react";

type StockFilter = "ok" | "low" | "out";

const HEADERS = [
  "Código",
  "Produto",
  "Categoria",
  "Qtd atual",
  "Qtd mín",
  "Status",
  "Custo",
  "Venda",
  "Ações",
];

function stockKind(p: Product): StockFilter {
  if (p.qty <= 0) return "out";
  if (p.qty <= p.minQty) return "low";
  return "ok";
}

export default function ProductsPage() {
  const { can } = usePermissions();
  const canWrite = can(["products.create", "products.update"]);
  const canAdjust = can("inventory.adjust");
  const { data, isPending, error, refetch } = useProducts();
  const [search, setSearch] = useState("");
  const [stockFilter, setStockFilter] = useState<StockFilter[]>([]);
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<Product | null>(null);
  const [adjusting, setAdjusting] = useState<Product | null>(null);
  const [labeling, setLabeling] = useState<Product | null>(null);

  const stockCounts = useMemo(() => {
    const list = data ?? [];
    return {
      ok: list.filter(p => stockKind(p) === "ok").length,
      low: list.filter(p => stockKind(p) === "low").length,
      out: list.filter(p => stockKind(p) === "out").length,
      value: list.reduce((sum, p) => sum + p.qty * (p.cost || 0), 0),
      belowMin: list.filter(p => p.qty <= p.minQty).length,
    };
  }, [data]);

  const filtered = useMemo(() => {
    const term = search.trim().toLowerCase();
    return (data ?? []).filter(p => {
      if (stockFilter.length > 0 && !stockFilter.includes(stockKind(p))) return false;
      return (
        !term ||
        [p.name, p.sku, p.barcode, p.category].some(v => v?.toLowerCase().includes(term))
      );
    });
  }, [data, search, stockFilter]);

  const { page, pageCount, total, pageSize, pageItems, setPage, resetPage } =
    useClientPagination(filtered);

  useEffect(() => {
    resetPage();
  }, [search, stockFilter, resetPage]);

  return (
    <div>
      <div className="flex flex-wrap items-center justify-end gap-2 mb-4">
        <div className="relative w-full min-w-0 sm:w-64 sm:max-w-sm">
          <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            className="pl-8"
            placeholder="Buscar nome, código ou categoria"
            value={search}
            onChange={e => setSearch(e.target.value)}
          />
        </div>
        <FiltersDialog
          title="Estoque"
          description="Filtre produtos por situação de estoque."
          value={stockFilter}
          onApply={setStockFilter}
          options={[
            { value: "ok", label: "Estoque ok", count: stockCounts.ok },
            { value: "low", label: "Abaixo do mínimo", count: stockCounts.low },
            { value: "out", label: "Zerado", count: stockCounts.out },
          ]}
        />
        {canWrite && (
          <Button
            size="sm"
            onClick={() => {
              setEditing(null);
              setFormOpen(true);
            }}
          >
            <Plus className="h-4 w-4" /> Novo produto
          </Button>
        )}
      </div>

      <div className="grid gap-3 sm:grid-cols-3 mb-4">
        <KpiCard label="Itens cadastrados" icon={Package} loading={isPending} value={(data ?? []).length} />
        <KpiCard
          label="Abaixo do mínimo"
          icon={AlertTriangle}
          loading={isPending}
          value={stockCounts.belowMin}
          tone={stockCounts.belowMin ? "warning" : "default"}
          hint="Repor com o fornecedor"
        />
        <KpiCard
          label="Valor em estoque"
          icon={WalletCards}
          loading={isPending}
          value={formatCurrency(stockCounts.value)}
          hint="Ao custo"
        />
      </div>

      {isPending ? (
        <TableSkeleton columns={HEADERS.length} headers={HEADERS} />
      ) : error ? (
        <ErrorState message={error.message} onRetry={() => refetch()} />
      ) : filtered.length === 0 ? (
        <EmptyState
          icon={Package}
          title="Nenhum produto cadastrado"
          description="Cadastre um produto para começar."
        />
      ) : (
        <>
          <div className="border rounded-md bg-card overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Código</TableHead>
                  <TableHead>Produto</TableHead>
                  <TableHead>Categoria</TableHead>
                  <TableHead className="text-right">Qtd atual</TableHead>
                  <TableHead className="text-right">Qtd mín</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Custo</TableHead>
                  <TableHead className="text-right">Venda</TableHead>
                  <TableHead className="text-right w-[7.5rem]">Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {pageItems.map(p => {
                  const kind = stockKind(p);
                  const code = p.barcode || p.sku || "—";
                  const statusLabel = kind === "out" ? "Zerado" : kind === "low" ? "Baixo" : "Ok";
                  return (
                    <TableRow key={p.id}>
                      <TableCell className="font-mono text-xs tracking-wide whitespace-nowrap">
                        {code}
                      </TableCell>
                      <TableCell className="font-medium max-w-[16rem]">
                        <span className="line-clamp-2">{p.name}</span>
                      </TableCell>
                      <TableCell className="text-muted-foreground">
                        {p.category || "—"}
                      </TableCell>
                      <TableCell className="text-right tabular-nums font-medium">
                        {p.qty}
                      </TableCell>
                      <TableCell className="text-right tabular-nums text-muted-foreground">
                        {p.minQty}
                      </TableCell>
                      <TableCell>
                        <Badge
                          variant="outline"
                          className={
                            kind === "out"
                              ? "rounded-sm border-destructive/40 bg-destructive/5 text-destructive"
                              : kind === "low"
                                ? "rounded-sm border-amber-300 bg-amber-50 text-amber-800"
                                : "rounded-sm border-emerald-200 bg-emerald-50 text-emerald-800"
                          }
                        >
                          {statusLabel}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right tabular-nums whitespace-nowrap">
                        {formatCurrency(p.cost)}
                      </TableCell>
                      <TableCell className="text-right tabular-nums font-medium whitespace-nowrap">
                        {formatCurrency(p.price)}
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="inline-flex items-center justify-end gap-0.5">
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8"
                            title="Etiqueta"
                            onClick={() => setLabeling(p)}
                          >
                            <Tag className="h-4 w-4" />
                          </Button>
                          {canAdjust && (
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8"
                              title="Movimentar"
                              onClick={() => setAdjusting(p)}
                            >
                              <ArrowLeftRight className="h-4 w-4" />
                            </Button>
                          )}
                          {canWrite && (
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8"
                              title="Editar"
                              onClick={() => {
                                setEditing(p);
                                setFormOpen(true);
                              }}
                            >
                              <Pencil className="h-4 w-4" />
                            </Button>
                          )}
                        </div>
                      </TableCell>
                    </TableRow>
                  );
                })}
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

      <ProductFormDialog open={formOpen} onOpenChange={setFormOpen} product={editing} />
      <StockAdjustDialog product={adjusting} onOpenChange={open => !open && setAdjusting(null)} />
      <ProductLabelDialog product={labeling} onOpenChange={open => !open && setLabeling(null)} />
    </div>
  );
}
