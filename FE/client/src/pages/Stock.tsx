import DashboardLayout from "@/components/DashboardLayout";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { api } from "@/lib/api";
import type { StockItem, StockMovement } from "@/types";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  AlertTriangle,
  ArrowDown,
  ArrowUp,
  Package,
  Plus,
  RefreshCw,
  Search,
  SlidersHorizontal,
  TrendingDown,
  Trash2,
  Loader2,
} from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

// ── Constantes ────────────────────────────────────────────────────────────────

const CATEGORIES = [
  "Tela",
  "Bateria",
  "Cabo",
  "Conector",
  "Placa",
  "CI/IC",
  "Carcaça",
  "Botão",
  "Câmera",
  "Alto-falante",
  "Microfone",
  "Ventilador",
  "Fonte",
  "Outro",
];

const MOVEMENT_REASONS: Record<string, string> = {
  purchase: "Compra",
  used_in_order: "Usado em OS",
  returned: "Devolvido",
  damaged: "Danificado",
  adjustment: "Ajuste",
  initial: "Estoque inicial",
};

// ── Helpers ───────────────────────────────────────────────────────────────────

function formatCurrency(value: number) {
  return value.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

function stockStatus(item: StockItem): "ok" | "low" | "out" {
  if (item.quantity <= 0) return "out";
  if (item.minQuantity > 0 && item.quantity <= item.minQuantity) return "low";
  return "ok";
}

// ── Create / Edit Item Form ───────────────────────────────────────────────────

interface ItemFormProps {
  initial?: Partial<StockItem>;
  onSave: (data: Partial<StockItem>) => void;
  onCancel: () => void;
  loading?: boolean;
}

function ItemForm({ initial, onSave, onCancel, loading }: ItemFormProps) {
  const [form, setForm] = useState({
    name: initial?.name ?? "",
    sku: initial?.sku ?? "",
    category: initial?.category ?? "",
    description: initial?.description ?? "",
    quantity: initial?.quantity ?? 0,
    minQuantity: initial?.minQuantity ?? 0,
    costPrice: initial?.costPrice ?? 0,
    sellingPrice: initial?.sellingPrice ?? 0,
    supplier: initial?.supplier ?? "",
    location: initial?.location ?? "",
  });

  const set = (field: string, value: string | number) =>
    setForm((prev) => ({ ...prev, [field]: value }));

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-3">
        <div className="col-span-2">
          <Label>Nome *</Label>
          <Input value={form.name} onChange={(e) => set("name", e.target.value)} placeholder="Ex: Tela iPhone 12" />
        </div>
        <div>
          <Label>SKU / Código</Label>
          <Input value={form.sku} onChange={(e) => set("sku", e.target.value)} placeholder="Ex: TLA-IPH12" />
        </div>
        <div>
          <Label>Categoria *</Label>
          <Select value={form.category} onValueChange={(v) => set("category", v)}>
            <SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger>
            <SelectContent>
              {CATEGORIES.map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
        <div>
          <Label>Qtd. Inicial</Label>
          <Input type="number" min={0} value={form.quantity} onChange={(e) => set("quantity", Number(e.target.value))} />
        </div>
        <div>
          <Label>Qtd. Mínima (alerta)</Label>
          <Input type="number" min={0} value={form.minQuantity} onChange={(e) => set("minQuantity", Number(e.target.value))} />
        </div>
        <div>
          <Label>Preço de Custo (R$)</Label>
          <Input type="number" min={0} step={0.01} value={form.costPrice} onChange={(e) => set("costPrice", Number(e.target.value))} />
        </div>
        <div>
          <Label>Preço de Venda (R$)</Label>
          <Input type="number" min={0} step={0.01} value={form.sellingPrice} onChange={(e) => set("sellingPrice", Number(e.target.value))} />
        </div>
        <div>
          <Label>Fornecedor</Label>
          <Input value={form.supplier} onChange={(e) => set("supplier", e.target.value)} placeholder="Nome do fornecedor" />
        </div>
        <div>
          <Label>Localização</Label>
          <Input value={form.location} onChange={(e) => set("location", e.target.value)} placeholder="Ex: Gaveta A3" />
        </div>
        <div className="col-span-2">
          <Label>Descrição</Label>
          <Input value={form.description} onChange={(e) => set("description", e.target.value)} placeholder="Observações adicionais" />
        </div>
      </div>
      <div className="flex gap-2 justify-end">
        {!initial && <Button variant="outline" onClick={onCancel} disabled={loading}>Cancelar</Button>}
        <Button onClick={() => onSave(form)} disabled={loading || !form.name || !form.category}>
          {loading ? "Salvando..." : initial ? "Atualizar" : "Salvar"}
        </Button>
      </div>
    </div>
  );
}

// ── Movement Form ─────────────────────────────────────────────────────────────

interface MovementFormProps {
  item: StockItem;
  onSave: (data: object) => void;
  onCancel: () => void;
  loading?: boolean;
}

function MovementForm({ item, onSave, onCancel, loading }: MovementFormProps) {
  const [form, setForm] = useState({
    type: "in" as string,
    reason: "purchase" as string,
    quantity: 1,
    unitCost: 0,
    notes: "",
    newQuantity: item.quantity,
  });

  const isAdjustment = form.type === "adjustment";

  const reasonsForType: Record<string, { value: string; label: string }[]> = {
    in: [{ value: "purchase", label: "Compra" }, { value: "returned", label: "Devolução de cliente" }],
    out: [{ value: "used_in_order", label: "Usado em OS" }, { value: "damaged", label: "Danificado" }],
    adjustment: [{ value: "adjustment", label: "Ajuste de inventário" }],
    return: [{ value: "returned", label: "Devolvido ao fornecedor" }],
  };

  return (
    <div className="space-y-4">
      <div className="p-3 bg-muted rounded-lg text-sm">
        <span className="font-medium">{item.name}</span>
        <span className="text-muted-foreground ml-2">Estoque atual: <strong>{item.quantity}</strong></span>
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div>
          <Label>Tipo</Label>
          <Select value={form.type} onValueChange={(v) => setForm((f) => ({ ...f, type: v, reason: reasonsForType[v]?.[0]?.value ?? "" }))}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="in">Entrada</SelectItem>
              <SelectItem value="out">Saída</SelectItem>
              <SelectItem value="adjustment">Ajuste</SelectItem>
              <SelectItem value="return">Devolução</SelectItem>
              <SelectItem value="damaged">Avaria</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div>
          <Label>Motivo</Label>
          <Select value={form.reason} onValueChange={(v) => setForm((f) => ({ ...f, reason: v }))}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              {(reasonsForType[form.type] ?? []).map((r) => (
                <SelectItem key={r.value} value={r.value}>{r.label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        {isAdjustment ? (
          <div className="col-span-2">
            <Label>Nova Quantidade</Label>
            <Input type="number" min={0} value={form.newQuantity} onChange={(e) => setForm((f) => ({ ...f, newQuantity: Number(e.target.value) }))} />
          </div>
        ) : (
          <>
            <div>
              <Label>Quantidade</Label>
              <Input type="number" min={1} value={form.quantity} onChange={(e) => setForm((f) => ({ ...f, quantity: Number(e.target.value) }))} />
            </div>
            <div>
              <Label>Custo unitário (R$)</Label>
              <Input type="number" min={0} step={0.01} value={form.unitCost} onChange={(e) => setForm((f) => ({ ...f, unitCost: Number(e.target.value) }))} />
            </div>
          </>
        )}
        <div className="col-span-2">
          <Label>Observações</Label>
          <Input value={form.notes} onChange={(e) => setForm((f) => ({ ...f, notes: e.target.value }))} placeholder="Opcional" />
        </div>
      </div>
      <div className="flex gap-2 justify-end">
        <Button variant="outline" onClick={onCancel} disabled={loading}>Cancelar</Button>
        <Button onClick={() => onSave(form)} disabled={loading}>
          {loading ? "Registrando..." : "Registrar Movimentação"}
        </Button>
      </div>
    </div>
  );
}

// ── Movements History ─────────────────────────────────────────────────────────

function MovementsHistory({ itemId }: { itemId: string }) {
  const { data, isLoading } = useQuery({
    queryKey: ["stock-movements", itemId],
    queryFn: () => api.listStockMovements({ itemId, limit: 30 }),
  });

  if (isLoading) return <p className="text-sm text-muted-foreground">Carregando...</p>;
  if (!data?.movements?.length) return <p className="text-sm text-muted-foreground">Nenhuma movimentação registrada.</p>;

  return (
    <div className="space-y-2 max-h-64 overflow-y-auto">
      {data.movements.map((m: StockMovement) => (
        <div key={m.id} className="flex items-center justify-between p-2 border rounded text-sm">
          <div className="flex items-center gap-2">
            {m.type === "in" || m.type === "return" ? (
              <ArrowUp className="h-4 w-4 text-green-600" />
            ) : m.type === "out" || m.type === "damaged" ? (
              <ArrowDown className="h-4 w-4 text-red-500" />
            ) : (
              <SlidersHorizontal className="h-4 w-4 text-blue-500" />
            )}
            <span>{MOVEMENT_REASONS[m.reason] ?? m.reason}</span>
            {m.notes && <span className="text-muted-foreground">· {m.notes}</span>}
          </div>
          <div className="flex items-center gap-3 text-right">
            <span className={m.type === "in" || m.type === "return" ? "text-green-600" : "text-red-500"}>
              {m.type === "in" || m.type === "return" ? "+" : "-"}{m.quantity}
            </span>
            <span className="text-muted-foreground">{m.quantityBefore} → {m.quantityAfter}</span>
            <span className="text-muted-foreground text-xs">{new Date(m.createdAt).toLocaleDateString("pt-BR")}</span>
          </div>
        </div>
      ))}
    </div>
  );
}

// ── Main Page ─────────────────────────────────────────────────────────────────

export default function Stock() {
  const queryClient = useQueryClient();
  const [search, setSearch] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("all");
  const [lowStockOnly, setLowStockOnly] = useState(false);
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [selectedItem, setSelectedItem] = useState<StockItem | null>(null);
  const [showDetailDialog, setShowDetailDialog] = useState(false);
  const [showMovementDialog, setShowMovementDialog] = useState(false);
  const [showHistoryDialog, setShowHistoryDialog] = useState(false);
  const [showEditDialog, setShowEditDialog] = useState(false);
  const [deletingItem, setDeletingItem] = useState<StockItem | null>(null);

  const { data: summaryData } = useQuery({
    queryKey: ["stock-summary"],
    queryFn: () => api.getStockSummary(),
  });

  const { data: itemsData, isLoading } = useQuery({
    queryKey: ["stock-items", search, categoryFilter, lowStockOnly],
    queryFn: () =>
      api.listStockItems({
        name: search || undefined,
        category: categoryFilter !== "all" ? categoryFilter : undefined,
        lowStock: lowStockOnly || undefined,
        limit: 50,
      }),
  });

  const createMutation = useMutation({
    mutationFn: (data: Parameters<typeof api.createStockItem>[0]) => api.createStockItem(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["stock-items"] });
      queryClient.invalidateQueries({ queryKey: ["stock-summary"] });
      toast.success("Item criado com sucesso!");
      setShowCreateDialog(false);
    },
    onError: () => toast.error("Erro ao criar item"),
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: Partial<StockItem> }) =>
      api.updateStockItem(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["stock-items"] });
      toast.success("Item atualizado!");
      setShowEditDialog(false);
      setSelectedItem(null);
    },
    onError: () => toast.error("Erro ao atualizar item"),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => api.deleteStockItem(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["stock-items"] });
      queryClient.invalidateQueries({ queryKey: ["stock-summary"] });
      toast.success("Item excluído!");
      setDeletingItem(null);
      setShowDetailDialog(false);
      setSelectedItem(null);
    },
    onError: () => toast.error("Erro ao excluir item"),
  });

  const movementMutation = useMutation({
    mutationFn: ({ itemId, data }: { itemId: string; data: object }) =>
      api.createStockMovement(itemId, data as Parameters<typeof api.createStockMovement>[1]),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["stock-items"] });
      queryClient.invalidateQueries({ queryKey: ["stock-summary"] });
      queryClient.invalidateQueries({ queryKey: ["stock-movements"] });
      toast.success("Movimentação registrada!");
      setShowMovementDialog(false);
      setSelectedItem(null);
    },
    onError: (e: Error) => toast.error(e.message || "Erro ao registrar movimentação"),
  });

  const summary = summaryData?.summary;
  const items = itemsData?.items ?? [];

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col gap-1">
          <h1 className="text-2xl font-bold tracking-tight">Estoque</h1>
          <p className="text-muted-foreground text-sm">Controle de peças e componentes</p>
        </div>

        {/* Summary Cards */}
        {summary && (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <Card>
              <CardContent className="p-4">
                <div className="flex items-center gap-2">
                  <Package className="h-5 w-5 text-primary" />
                  <div>
                    <p className="text-xs text-muted-foreground">Total de Itens</p>
                    <p className="text-2xl font-bold">{summary.activeItems}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4">
                <div className="flex items-center gap-2">
                  <AlertTriangle className="h-5 w-5 text-yellow-500" />
                  <div>
                    <p className="text-xs text-muted-foreground">Estoque Baixo</p>
                    <p className="text-2xl font-bold text-yellow-600">{summary.lowStockItems}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4">
                <div className="flex items-center gap-2">
                  <TrendingDown className="h-5 w-5 text-red-500" />
                  <div>
                    <p className="text-xs text-muted-foreground">Sem Estoque</p>
                    <p className="text-2xl font-bold text-red-600">{summary.outOfStock}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4">
                <div>
                  <p className="text-xs text-muted-foreground">Valor em Estoque</p>
                  <p className="text-xl font-bold text-green-600">{formatCurrency(summary.totalValue)}</p>
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        {/* Filters + Create */}
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              className="pl-9"
              placeholder="Buscar por nome..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
          <Select value={categoryFilter} onValueChange={setCategoryFilter}>
            <SelectTrigger className="w-40"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todas categorias</SelectItem>
              {CATEGORIES.map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}
            </SelectContent>
          </Select>
          <Button
            variant={lowStockOnly ? "default" : "outline"}
            onClick={() => setLowStockOnly((v) => !v)}
            className="gap-2"
          >
            <AlertTriangle className="h-4 w-4" />
            Estoque baixo
          </Button>
          <Button onClick={() => setShowCreateDialog(true)} className="gap-2">
            <Plus className="h-4 w-4" /> Novo Item
          </Button>
        </div>

        {/* Items Table */}
        {isLoading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
          </div>
        ) : items.length === 0 ? (
          <div className="text-center py-12 text-muted-foreground">
            <Package className="h-12 w-12 mx-auto mb-3 opacity-30" />
            <p>Nenhum item encontrado.</p>
          </div>
        ) : (
          <div className="rounded-md border overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow className="bg-muted/50">
                  <TableHead>Nome</TableHead>
                  <TableHead className="hidden sm:table-cell">Categoria</TableHead>
                  <TableHead>Qtd</TableHead>
                  <TableHead className="hidden md:table-cell">Custo</TableHead>
                  <TableHead className="hidden lg:table-cell">Fornecedor</TableHead>
                  <TableHead className="hidden lg:table-cell">Local</TableHead>
                  <TableHead>Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {items.map((item) => {
                  const status = stockStatus(item);
                  return (
                    <TableRow
                      key={item.id}
                      className="cursor-pointer hover:bg-muted/50 transition-colors"
                      onClick={() => { setSelectedItem(item); setShowDetailDialog(true); }}
                    >
                      <TableCell>
                        <div>
                          <p className="font-medium text-sm">{item.name}</p>
                          {item.sku && <p className="text-xs text-muted-foreground">{item.sku}</p>}
                        </div>
                      </TableCell>
                      <TableCell className="hidden sm:table-cell text-sm text-muted-foreground">{item.category}</TableCell>
                      <TableCell>
                        <span className={`font-bold text-sm ${status === "out" ? "text-red-600" : status === "low" ? "text-yellow-600" : ""}`}>
                          {item.quantity}
                          {item.minQuantity > 0 && <span className="text-muted-foreground font-normal text-xs"> /min {item.minQuantity}</span>}
                        </span>
                      </TableCell>
                      <TableCell className="hidden md:table-cell text-sm">{formatCurrency(item.costPrice)}</TableCell>
                      <TableCell className="hidden lg:table-cell text-sm text-muted-foreground">{item.supplier || "—"}</TableCell>
                      <TableCell className="hidden lg:table-cell text-sm text-muted-foreground">{item.location || "—"}</TableCell>
                      <TableCell>
                        <Badge variant={status === "ok" ? "default" : status === "low" ? "secondary" : "destructive"} className="text-xs">
                          {status === "ok" ? "OK" : status === "low" ? "Baixo" : "Zerado"}
                        </Badge>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </div>
        )}
      </div>

      {/* Detail Modal */}
      <Dialog open={showDetailDialog} onOpenChange={(open) => { if (!open) { setShowDetailDialog(false); setSelectedItem(null); } }}>
        <DialogContent className="max-w-md max-h-[90vh] flex flex-col">
          <DialogHeader className="px-6 pt-6 pb-4 border-b">
            <DialogTitle className="text-xl">{selectedItem?.name}</DialogTitle>
            {selectedItem?.category && (
              <p className="text-sm text-muted-foreground mt-1.5">{selectedItem.category}{selectedItem.sku ? ` • SKU: ${selectedItem.sku}` : ""}</p>
            )}
          </DialogHeader>
          {selectedItem && (
            <>
              <div className="flex-1 overflow-y-auto px-6 py-6">
                <div className="space-y-4 text-sm">
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <p className="text-xs text-muted-foreground uppercase tracking-wide">Categoria</p>
                    <p className="mt-1 font-medium">{selectedItem.category}</p>
                  </div>
                  {selectedItem.sku && (
                    <div>
                      <p className="text-xs text-muted-foreground uppercase tracking-wide">SKU</p>
                      <p className="mt-1 font-medium">{selectedItem.sku}</p>
                    </div>
                  )}
                  <div>
                    <p className="text-xs text-muted-foreground uppercase tracking-wide">Quantidade</p>
                    <p className={`mt-1 font-bold ${stockStatus(selectedItem) === "out" ? "text-red-600" : stockStatus(selectedItem) === "low" ? "text-yellow-600" : ""}`}>
                      {selectedItem.quantity}
                      {selectedItem.minQuantity > 0 && <span className="text-muted-foreground font-normal text-xs"> / mín. {selectedItem.minQuantity}</span>}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground uppercase tracking-wide">Preço de Custo</p>
                    <p className="mt-1">{formatCurrency(selectedItem.costPrice)}</p>
                  </div>
                  {selectedItem.sellingPrice > 0 && (
                    <div>
                      <p className="text-xs text-muted-foreground uppercase tracking-wide">Preço de Venda</p>
                      <p className="mt-1">{formatCurrency(selectedItem.sellingPrice)}</p>
                    </div>
                  )}
                  {selectedItem.supplier && (
                    <div>
                      <p className="text-xs text-muted-foreground uppercase tracking-wide">Fornecedor</p>
                      <p className="mt-1">{selectedItem.supplier}</p>
                    </div>
                  )}
                  {selectedItem.location && (
                    <div>
                      <p className="text-xs text-muted-foreground uppercase tracking-wide">Localização</p>
                      <p className="mt-1">{selectedItem.location}</p>
                    </div>
                  )}
                </div>
                {selectedItem.description && (
                  <div>
                    <p className="text-xs text-muted-foreground uppercase tracking-wide">Descrição</p>
                    <p className="mt-1 text-muted-foreground">{selectedItem.description}</p>
                  </div>
                )}
                <Separator />
                </div>
              </div>
              <div className="px-6 py-4 border-t bg-muted/30 flex justify-between items-center">
                <div className="flex gap-2">
                  <Button variant="destructive" size="sm" onClick={() => { setDeletingItem(selectedItem); setShowDetailDialog(false); }}>
                    <Trash2 className="h-4 w-4 mr-1" /> Excluir
                  </Button>
                </div>
                <div className="flex gap-2">
                  <Button variant="outline" size="sm" onClick={() => { setShowDetailDialog(false); setShowHistoryDialog(true); }}>
                      Histórico
                    </Button>
                    <Button variant="outline" size="sm" onClick={() => { setShowDetailDialog(false); setShowMovementDialog(true); }}>
                      <RefreshCw className="h-3 w-3 mr-1" /> Movimentar
                    </Button>
                    <Button size="sm" onClick={() => { setShowDetailDialog(false); setShowEditDialog(true); }}>
                      Editar
                    </Button>
                  </div>
                </div>
            </>
          )}
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation */}
      <AlertDialog open={!!deletingItem} onOpenChange={(open) => !open && setDeletingItem(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirmar Exclusão</AlertDialogTitle>
            <AlertDialogDescription>
              Tem certeza que deseja excluir o item <strong>{deletingItem?.name}</strong>? Esta ação não pode ser desfeita.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={() => deletingItem && deleteMutation.mutate(deletingItem.id)}
            >
              {deleteMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : "Excluir"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Dialogs */}
      <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
        <DialogContent className="max-w-lg">
          <DialogHeader><DialogTitle>Novo Item de Estoque</DialogTitle></DialogHeader>
          <ItemForm
            onSave={(data) => createMutation.mutate(data as Parameters<typeof api.createStockItem>[0])}
            onCancel={() => setShowCreateDialog(false)}
            loading={createMutation.isPending}
          />
        </DialogContent>
      </Dialog>

      <Dialog open={showEditDialog} onOpenChange={(open) => { setShowEditDialog(open); if (!open) setSelectedItem(null); }}>
        <DialogContent className="max-w-lg">
          <DialogHeader><DialogTitle>Editar Item</DialogTitle></DialogHeader>
          {selectedItem && (
            <ItemForm
              initial={selectedItem}
              onSave={(data) => updateMutation.mutate({ id: selectedItem.id, data })}
              onCancel={() => { setShowEditDialog(false); setSelectedItem(null); }}
              loading={updateMutation.isPending}
            />
          )}
        </DialogContent>
      </Dialog>

      <Dialog open={showMovementDialog} onOpenChange={(open) => { setShowMovementDialog(open); if (!open) setSelectedItem(null); }}>
        <DialogContent className="max-w-lg">
          <DialogHeader><DialogTitle>Registrar Movimentação</DialogTitle></DialogHeader>
          {selectedItem && (
            <MovementForm
              item={selectedItem}
              onSave={(data) => movementMutation.mutate({ itemId: selectedItem.id, data })}
              onCancel={() => { setShowMovementDialog(false); setSelectedItem(null); }}
              loading={movementMutation.isPending}
            />
          )}
        </DialogContent>
      </Dialog>

      <Dialog open={showHistoryDialog} onOpenChange={(open) => { setShowHistoryDialog(open); if (!open) setSelectedItem(null); }}>
        <DialogContent className="max-w-lg">
          <DialogHeader><DialogTitle>Histórico de Movimentações — {selectedItem?.name}</DialogTitle></DialogHeader>
          {selectedItem && <MovementsHistory itemId={selectedItem.id} />}
        </DialogContent>
      </Dialog>
    </DashboardLayout>
  );
}
