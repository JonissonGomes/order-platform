import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableRow } from "@/components/ui/table";
import { BarcodeInput } from "@/components/zts/BarcodeInput";
import { qk } from "@/hooks/queries";
import { api } from "@/lib/api";
import { formatCurrency } from "@/lib/format";
import type { PaymentMethod, Product } from "@/types";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Minus, Plus, ShoppingCart, Trash2 } from "lucide-react";
import { useCallback, useState } from "react";
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
 * Venda rápida de acessórios: bipa o código, ajusta quantidades e lança no caixa.
 * O backend registra a entrada no caixa e a baixa de estoque em chamadas separadas
 * (cash/movements + products/:id/adjust type=sale).
 */
export function QuickSale({ disabled }: { disabled: boolean }) {
  const queryClient = useQueryClient();
  const [cart, setCart] = useState<CartLine[]>([]);
  const [method, setMethod] = useState<PaymentMethod>("pix");

  const total = cart.reduce((sum, l) => sum + l.product.price * l.quantity, 0);

  const addByBarcode = useCallback(async (code: string) => {
    try {
      const product = await api.products.byBarcode(code);
      if (!product?.id) throw new Error();
      setCart(prev => {
        const existing = prev.find(l => l.product.id === product.id);
        return existing
          ? prev.map(l => (l.product.id === product.id ? { ...l, quantity: l.quantity + 1 } : l))
          : [...prev, { product, quantity: 1 }];
      });
    } catch {
      toast.error(`Produto ${code} não encontrado`);
    }
  }, []);

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
      // Baixa de estoque item a item, vinculada ao lançamento do caixa
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
    <Card className="gap-3 py-4 px-4">
      <div className="flex items-center gap-2">
        <ShoppingCart className="h-4 w-4 text-muted-foreground" />
        <h2 className="text-sm font-semibold">Venda rápida</h2>
      </div>
      <BarcodeInput onScan={addByBarcode} disabled={disabled} autoFocus={false} />

      {cart.length === 0 ? (
        <p className="text-xs text-muted-foreground py-4 text-center">
          {disabled ? "Abra o caixa (e tenha permissão de venda) para vender." : "Bipe os produtos para montar a venda."}
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

      <div className="flex flex-wrap items-center justify-between gap-3 pt-1">
        <div>
          <p className="zts-eyebrow">Total</p>
          <p className="text-xl font-semibold tabular-nums">{formatCurrency(total)}</p>
        </div>
        <div className="flex items-center gap-2">
          <Select value={method} onValueChange={v => setMethod(v as PaymentMethod)}>
            <SelectTrigger className="w-36"><SelectValue /></SelectTrigger>
            <SelectContent>
              {Object.entries(PAYMENT_LABELS).map(([k, label]) => (
                <SelectItem key={k} value={k}>{label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Button disabled={disabled || cart.length === 0 || total <= 0 || checkout.isPending}
            onClick={() => checkout.mutate()}>
            {checkout.isPending ? "Registrando…" : "Finalizar venda"}
          </Button>
        </div>
      </div>
    </Card>
  );
}
