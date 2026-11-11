import { ProductFormDialog } from "@/components/products/ProductFormDialog";
import { ProductLabelDialog } from "@/components/products/ProductLabelDialog";
import { StockAdjustDialog } from "@/components/products/StockAdjustDialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { BarcodeInput } from "@/components/zts/BarcodeInput";
import { EmptyState, ErrorState } from "@/components/zts/EmptyState";
import { FiltersDialog } from "@/components/zts/FiltersDialog";
import { ListPagination } from "@/components/zts/ListPagination";
import { PageHeader } from "@/components/zts/PageHeader";
import { TableSkeleton } from "@/components/zts/TableSkeleton";
import { useClientPagination } from "@/hooks/useClientPagination";
import { useProducts } from "@/hooks/queries";
import { usePermissions } from "@/hooks/usePermissions";
import { api } from "@/lib/api";
import { formatCurrency } from "@/lib/format";
import type { Product } from "@/types";
import { Package, Plus, Search, Tag } from "lucide-react";
import { useCallback, useEffect, useMemo, useState } from "react";
import { toast } from "sonner";

type StockFilter = "ok" | "low" | "out";

const HEADERS = ["Produto", "Código", "Categoria", "Custo", "Venda", "Estoque", ""];

export default function ProductsPage() {
  const { can } = usePermissions();
  const canWrite = can(["products.create", "products.update"]);
  const canAdjust = can("inventory.adjust");
  const { data, isPending, error, refetch } = useProducts();
  const [search, setSearch] = useState("");
  const [stockFilter, setStockFilter] = useState<StockFilter[]>([]);
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<Product | null>(null);
  const [newBarcode, setNewBarcode] = useState<string | undefined>();
  const [adjusting, setAdjusting] = useState<Product | null>(null);
  const [labeling, setLabeling] = useState<Product | null>(null);

  const stockCounts = useMemo(() => {
    const list = data ?? [];
    return {
      ok: list.filter(p => p.qty > p.minQty).length,
      low: list.filter(p => p.qty > 0 && p.qty <= p.minQty).length,
      out: list.filter(p => p.qty <= 0).length,
    };
  }, [data]);

  const filtered = useMemo(() => {
    const term = search.trim().toLowerCase();
    return (data ?? []).filter(p => {
      const stock: StockFilter = p.qty <= 0 ? "out" : p.qty <= p.minQty ? "low" : "ok";
      if (stockFilter.length > 0 && !stockFilter.includes(stock)) return false;
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

  const openNew = (barcode?: string) => {
    setEditing(null);
    setNewBarcode(barcode);
    setFormOpen(true);
  };

  // Leitor USB: busca no estoque; se não achar, oferece cadastro com o código lido.
  const handleScan = useCallback(
    async (code: string) => {
      try {
        const product = await api.products.byBarcode(code);
        if (product?.id) {
          if (canAdjust) setAdjusting(product);
          else toast.info(`${product.name}: ${product.qty} em estoque`);
          return;
        }
        throw new Error("not-found");
      } catch {
        if (canWrite) {
          toast.info(`Código ${code} não cadastrado. Complete o cadastro.`);
          openNew(code);
        } else {
          toast.error(`Produto com código ${code} não encontrado.`);
        }
      }
    },
    [canWrite, canAdjust]
  );

  return (
    <div>
      <PageHeader
        title="Produtos e estoque"
        description="Acessórios e peças. Bipe um código para localizar, vender ou cadastrar."
        actions={
          canWrite && (
            <Button size="sm" onClick={() => openNew()}>
              <Plus className="h-4 w-4" /> Novo produto
            </Button>
          )
        }
      />

      <div className="grid gap-3 lg:grid-cols-[1fr_auto] mb-4">
        <BarcodeInput onScan={handleScan} />
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
          <div className="relative flex-1">
            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              className="pl-8"
              placeholder="Buscar por nome, código ou categoria"
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
        </div>
      </div>

      {isPending ? (
        <TableSkeleton columns={HEADERS.length} headers={HEADERS} />
      ) : error ? (
        <ErrorState message={error.message} onRetry={() => refetch()} />
      ) : filtered.length === 0 ? (
        <EmptyState
          icon={Package}
          title="Nenhum produto cadastrado"
          description="Cadastre um produto ou bipe um código para começar."
        />
      ) : (
        <>
          <div className="border rounded-md bg-card overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  {HEADERS.map(h => (
                    <TableHead key={h}>{h}</TableHead>
                  ))}
                </TableRow>
              </TableHeader>
              <TableBody>
                {pageItems.map(p => {
                  const low = p.qty <= p.minQty;
                  const code = p.barcode || p.sku || "—";
                  return (
                    <TableRow key={p.id}>
                      <TableCell>
                        <p className="font-medium">{p.name}</p>
                      </TableCell>
                      <TableCell className="font-mono text-xs">{code}</TableCell>
                      <TableCell>{p.category || "—"}</TableCell>
                      <TableCell className="tabular-nums">{formatCurrency(p.cost)}</TableCell>
                      <TableCell className="tabular-nums">{formatCurrency(p.price)}</TableCell>
                      <TableCell>
                        <span className="tabular-nums font-medium mr-2">{p.qty}</span>
                        {low && (
                          <Badge
                            variant="outline"
                            className="rounded-sm border-amber-300 bg-amber-50 text-amber-800"
                          >
                            Baixo
                          </Badge>
                        )}
                      </TableCell>
                      <TableCell className="text-right whitespace-nowrap">
                        <Button variant="ghost" size="sm" onClick={() => setLabeling(p)}>
                          <Tag className="h-3.5 w-3.5" /> Etiqueta
                        </Button>
                        {canAdjust && (
                          <Button variant="ghost" size="sm" onClick={() => setAdjusting(p)}>
                            Movimentar
                          </Button>
                        )}
                        {canWrite && (
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => {
                              setEditing(p);
                              setNewBarcode(undefined);
                              setFormOpen(true);
                            }}
                          >
                            Editar
                          </Button>
                        )}
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

      <ProductFormDialog
        open={formOpen}
        onOpenChange={open => {
          setFormOpen(open);
          if (!open) setNewBarcode(undefined);
        }}
        product={editing}
        initialBarcode={newBarcode}
      />
      <StockAdjustDialog product={adjusting} onOpenChange={open => !open && setAdjusting(null)} />
      <ProductLabelDialog product={labeling} onOpenChange={open => !open && setLabeling(null)} />
    </div>
  );
}
