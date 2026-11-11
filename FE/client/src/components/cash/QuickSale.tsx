import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableRow } from "@/components/ui/table";
import { CameraScanDialog } from "@/components/zts/CameraScanDialog";
import { SuggestInput } from "@/components/zts/SuggestInput";
import { qk, useProducts } from "@/hooks/queries";
import { api } from "@/lib/api";
import { formatCurrency } from "@/lib/format";
import type { PaymentMethod, Product } from "@/types";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Camera, Minus, Plus, ShoppingCart, Trash2 } from "lucide-react";
import { useCallback, useMemo, useState } from "react";
import { toast } from "sonner";

export const PAYMENT_LABELS: Record<PaymentMethod, string> = {
  pix: "Pix",
  debit: "Débito",
  credit: "Crédito",
  cash: "Dinheiro",
};

interface CartLine {
  product: Product;
  quantity: number;
}

/**
 * Venda rápida de acessórios: busca por nome/código (ou câmera), ajusta qtd e lança no caixa.
 * O backend registra a entrada no caixa e a baixa de estoque em chamadas separadas
 * (cash/movements + products/:id/adjust type=sale).
 */
export function QuickSale({ disabled }: { disabled: boolean }) {
  const queryClient = useQueryClient();
  const { data: products } = useProducts();
  const [cart, setCart] = useState<CartLine[]>([]);
  const [method, setMethod] = useState<PaymentMethod>("pix");
  const [query, setQuery] = useState("");
  const [cameraOpen, setCameraOpen] = useState(false);

  const activeProducts = useMemo(
    () => (products ?? []).filter(p => p.isActive),
    [products]
  );

  const total = cart.reduce((sum, l) => sum + l.product.price * l.quantity, 0);

  const addProduct = useCallback((product: Product) => {
    if (!product?.id) return;
    setCart(prev => {
      const existing = prev.find(l => l.product.id === product.id);
      return existing
        ? prev.map(l => (l.product.id === product.id ? { ...l, quantity: l.quantity + 1 } : l))
        : [...prev, { product, quantity: 1 }];
    });
    setQuery("");
  }, []);

  const addByCode = useCallback(
    async (code: string) => {
      const term = code.trim().toLowerCase();
      if (!term) return;
      const local = activeProducts.find(
        p =>
          p.barcode?.toLowerCase() === term ||
          p.sku?.toLowerCase() === term ||
          p.name.toLowerCase() === term
      );
      if (local) {
        addProduct(local);
        return;
      }
      try {
        const product = await api.products.byBarcode(code.trim());
        if (!product?.id) throw new Error();
        addProduct(product);
      } catch {
        toast.error(`Produto ${code} não encontrado`);
      }
    },
    [activeProducts, addProduct]
  );

  const changeQty = (id: string, delta: number) =>
    setCart(prev =>
      prev
        .map(l => (l.product.id === id ? { ...l, quantity: l.quantity + delta } : l))
        .filter(l => l.quantity > 0)
    );

  const checkout = useMutation({
    mutationFn: async () => {
      const movement = await api.cash.addMovement({
        type: "in",
        kind: "sale",
        method,
        amount: total,
        description: `Venda balcão: ${cart.map(l => `${l.quantity}x ${l.product.name}`).join(", ")}`,
      });
      const results = await Promise.allSettled(
        cart.map(l =>
          api.products.adjust(l.product.id, {
            type: "sale",
            qty: l.quantity,
            refType: "cash_movement",
            refId: movement.id,
          })
        )
      );
      return results.filter(r => r.status === "rejected").length;
    },
    onSuccess: failed => {
      setCart([]);
      queryClient.invalidateQueries({ queryKey: qk.cash });
      queryClient.invalidateQueries({ queryKey: qk.products });
      if (failed > 0) toast.warning(`Venda registrada, mas ${failed} baixa(s) de estoque falharam. Confira o estoque.`);
      else toast.success("Venda registrada");
    },
    onError: (e: Error) => toast.error(e.message),
  });

  return (
    <Card className="gap-3 py-4 px-4 overflow-visible">
      <div className="flex items-center gap-2">
        <ShoppingCart className="h-4 w-4 text-muted-foreground" />
        <h2 className="text-sm font-semibold">Venda rápida</h2>
      </div>

      <div className="flex gap-2">
        <div className="relative min-w-0 flex-1">
          <SuggestInput
            value={query}
            options={activeProducts}
            disabled={disabled}
            placeholder="Buscar produto por nome ou código"
            getLabel={p => p.name}
            getSearchText={p => [p.sku, p.barcode, p.category].filter(Boolean).join(" ")}
            onChange={setQuery}
            onSelect={addProduct}
            onSubmitValue={addByCode}
            renderOption={p => (
              <span className="flex items-baseline justify-between gap-3">
                <span className="min-w-0 truncate">
                  {p.name}
                  {(p.barcode || p.sku) && (
                    <span className="ml-2 font-mono text-xs text-muted-foreground">
                      {p.barcode || p.sku}
                    </span>
                  )}
                </span>
                <span className="shrink-0 tabular-nums text-muted-foreground">
                  {formatCurrency(p.price)}
                </span>
              </span>
            )}
          />
        </div>
        <Button
          type="button"
          variant="outline"
          onClick={() => setCameraOpen(true)}
          disabled={disabled}
          aria-label="Ler com a câmera"
        >
          <Camera className="h-4 w-4" />
          <span className="hidden sm:inline">Câmera</span>
        </Button>
      </div>

      {cart.length === 0 ? (
        <p className="text-xs text-muted-foreground py-2">
          {disabled
            ? "Abra o caixa (e tenha permissão de venda) para vender."
            : "Busque ou bipe os produtos para montar a venda."}
        </p>
      ) : (
        <div className="border rounded-sm overflow-hidden">
          <Table>
            <TableBody>
              {cart.map(l => (
                <TableRow key={l.product.id}>
                  <TableCell className="font-medium">{l.product.name}</TableCell>
                  <TableCell className="whitespace-nowrap">
                    <div className="inline-flex items-center gap-1">
                      <Button type="button" variant="outline" size="icon" className="h-6 w-6"
                        onClick={() => changeQty(l.product.id, -1)}><Minus className="h-3 w-3" /></Button>
                      <span className="w-6 text-center tabular-nums text-sm">{l.quantity}</span>
                      <Button type="button" variant="outline" size="icon" className="h-6 w-6"
                        onClick={() => changeQty(l.product.id, 1)}><Plus className="h-3 w-3" /></Button>
                    </div>
                  </TableCell>
                  <TableCell className="text-right tabular-nums">
                    {formatCurrency(l.product.price * l.quantity)}
                  </TableCell>
                  <TableCell className="w-8">
                    <Button type="button" variant="ghost" size="icon" className="h-6 w-6"
                      onClick={() => changeQty(l.product.id, -l.quantity)}>
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}

      <div className="flex flex-col gap-3 pt-1 sm:flex-row sm:flex-wrap sm:items-center sm:justify-between">
        <div>
          <p className="zts-eyebrow">Total</p>
          <p className="text-xl font-semibold tabular-nums">{formatCurrency(total)}</p>
        </div>
        <div className="grid grid-cols-[7.5rem_1fr] gap-2 w-full sm:w-auto sm:flex sm:items-center">
          <Select value={method} onValueChange={v => setMethod(v as PaymentMethod)}>
            <SelectTrigger className="w-full sm:w-36"><SelectValue /></SelectTrigger>
            <SelectContent>
              {Object.entries(PAYMENT_LABELS).map(([k, label]) => (
                <SelectItem key={k} value={k}>{label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Button
            className="w-full sm:w-auto"
            disabled={disabled || cart.length === 0 || total <= 0 || checkout.isPending}
            onClick={() => checkout.mutate()}
          >
            {checkout.isPending ? "Registrando…" : "Finalizar venda"}
          </Button>
        </div>
      </div>

      <CameraScanDialog
        open={cameraOpen}
        onOpenChange={setCameraOpen}
        onDetected={addByCode}
      />
    </Card>
  );
}
