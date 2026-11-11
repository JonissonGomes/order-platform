import { ProductFormDialog } from "@/components/products/ProductFormDialog";
import { StockAdjustDialog } from "@/components/products/StockAdjustDialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { BarcodeInput } from "@/components/zts/BarcodeInput";
import { EmptyState, ErrorState } from "@/components/zts/EmptyState";
import { PageHeader } from "@/components/zts/PageHeader";
import { TableSkeleton } from "@/components/zts/TableSkeleton";
import { useProducts } from "@/hooks/queries";
import { usePermissions } from "@/hooks/usePermissions";
import { api } from "@/lib/api";
import { formatCurrency } from "@/lib/format";
import type { Product } from "@/types";
import { Package, Plus, Search } from "lucide-react";
import { useCallback, useMemo, useState } from "react";
import { toast } from "sonner";

const HEADERS = ["Produto", "Código de barras", "Categoria", "Custo", "Preço", "Estoque", ""];

export default function ProductsPage() {
  const { can } = usePermissions();
  const canWrite = can(["products.create", "products.update"]);
  const canAdjust = can("inventory.adjust");
  const { data, isPending, error, refetch } = useProducts();
  const [search, setSearch] = useState("");
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<Product | null>(null);
  const [newBarcode, setNewBarcode] = useState<string | undefined>();
  const [adjusting, setAdjusting] = useState<Product | null>(null);

  const filtered = useMemo(() => {
    const term = search.trim().toLowerCase();
    return (data ?? []).filter(
      p => !term || [p.name, p.sku, p.barcode, p.category].some(v => v?.toLowerCase().includes(term))
    );
  }, [data, search]);

  const openNew = (barcode?: string) => {
    setEditing(null);
    setNewBarcode(barcode);
    setFormOpen(true);
  };

  // Leitor USB envia o código + Enter: busca no estoque; se não achar, oferece cadastro.
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
          toast.info(`Código ${code} não cadastrado. Preencha os dados do produto.`);
          openNew(code);
        } else {
          toast.error(`Produto com código ${code} não encontrado.`);
        }
      }
    },
    [canWrite, canAdjust]
  );

  return (
    <div className="max-w-6xl mx-auto">
      <PageHeader
        title="Produtos e estoque"
        description="Acessórios e peças. Bipe um código para localizar ou movimentar."
        actions={
          canWrite && (
            <Button size="sm" onClick={() => openNew()}>
              <Plus className="h-4 w-4" /> Novo produto
            </Button>
          )
        }
      />

      <div className="grid gap-3 lg:grid-cols-2 mb-4">
        <BarcodeInput onScan={handleScan} />
        <div className="relative">
          <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input className="pl-8" placeholder="Filtrar por nome, SKU ou categoria"
            value={search} onChange={e => setSearch(e.target.value)} />
        </div>
      </div>

      {isPending ? (
        <TableSkeleton columns={HEADERS.length} headers={HEADERS} />
      ) : error ? (
        <ErrorState message={error.message} onRetry={() => refetch()} />
      ) : filtered.length === 0 ? (
        <EmptyState icon={Package} title="Nenhum produto cadastrado"
          description="Cadastre produtos ou bipe um código de barras para começar." />
      ) : (
        <div className="border rounded-md bg-card overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>{HEADERS.map(h => <TableHead key={h}>{h}</TableHead>)}</TableRow>
            </TableHeader>
            <TableBody>
              {filtered.map(p => {
                const low = p.qty <= p.minQty;
                return (
                  <TableRow key={p.id}>
                    <TableCell>
                      <p className="font-medium">{p.name}</p>
                      {p.sku && <p className="text-xs text-muted-foreground font-mono">{p.sku}</p>}
                    </TableCell>
                    <TableCell className="font-mono text-xs">{p.barcode || "—"}</TableCell>
                    <TableCell>{p.category || "—"}</TableCell>
                    <TableCell className="tabular-nums">{formatCurrency(p.cost)}</TableCell>
                    <TableCell className="tabular-nums">{formatCurrency(p.price)}</TableCell>
                    <TableCell>
                      <span className="tabular-nums font-medium mr-2">{p.qty}</span>
                      {low && (
                        <Badge variant="outline" className="rounded-sm border-amber-300 bg-amber-50 text-amber-800">
                          Baixo
                        </Badge>
                      )}
                    </TableCell>
                    <TableCell className="text-right whitespace-nowrap">
                      {canAdjust && <Button variant="ghost" size="sm" onClick={() => setAdjusting(p)}>Movimentar</Button>}
                      {canWrite && (
                        <Button variant="ghost" size="sm"
                          onClick={() => { setEditing(p); setFormOpen(true); }}>
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
      )}

      <ProductFormDialog open={formOpen} onOpenChange={setFormOpen} product={editing} initialBarcode={newBarcode} />
      <StockAdjustDialog product={adjusting} onOpenChange={open => !open && setAdjusting(null)} />
    </div>
  );
}
