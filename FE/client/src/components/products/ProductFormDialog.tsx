import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { FormField } from "@/components/zts/FormField";
import { qk } from "@/hooks/queries";
import { api } from "@/lib/api";
import { parseMoney } from "@/lib/format";
import type { Product } from "@/types";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { toast } from "sonner";

const EMPTY = {
  name: "", sku: "", barcode: "", category: "",
  cost: "", price: "", qty: "0", minQty: "0",
};

interface ProductFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** Produto em edição; se ausente, cria um novo. */
  product?: Product | null;
  /** Código pré-preenchido (leitura sem cadastro). */
  initialBarcode?: string;
}

export function ProductFormDialog({ open, onOpenChange, product, initialBarcode }: ProductFormDialogProps) {
  const queryClient = useQueryClient();
  const [form, setForm] = useState(EMPTY);
  const set = (patch: Partial<typeof EMPTY>) => setForm(f => ({ ...f, ...patch }));

  useEffect(() => {
    if (!open) return;
    setForm(
      product
        ? {
            name: product.name, sku: product.sku ?? "", barcode: product.barcode ?? "",
            category: product.category ?? "", cost: String(product.cost),
            price: String(product.price), qty: String(product.qty),
            minQty: String(product.minQty),
          }
        : { ...EMPTY, barcode: initialBarcode ?? "" }
    );
  }, [open, product, initialBarcode]);

  const save = useMutation({
    mutationFn: () => {
      const payload = {
        name: form.name.trim(),
        sku: form.sku.trim() || undefined,
        barcode: form.barcode.trim() || undefined,
        category: form.category.trim() || undefined,
        cost: parseMoney(form.cost),
        price: parseMoney(form.price),
        minQty: Number(form.minQty) || 0,
      };
      // Quantidade só entra na criação; depois é alterada via movimentação de estoque
      return product
        ? api.products.update(product.id, payload)
        : api.products.create({ ...payload, qty: Number(form.qty) || 0 });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: qk.products });
      toast.success(product ? "Produto atualizado" : "Produto cadastrado");
      onOpenChange(false);
    },
    onError: (e: Error) => toast.error(e.message),
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>{product ? "Editar produto" : "Novo produto"}</DialogTitle>
          <DialogDescription>Dados de inventário e precificação.</DialogDescription>
        </DialogHeader>
        <div className="grid gap-3 sm:grid-cols-2">
          <FormField label="Nome *" htmlFor="p-name" className="sm:col-span-2">
            <Input id="p-name" value={form.name} onChange={e => set({ name: e.target.value })} />
          </FormField>
          <FormField label="Código de barras" htmlFor="p-bar">
            <Input id="p-bar" className="font-mono" value={form.barcode} onChange={e => set({ barcode: e.target.value })} />
          </FormField>
          <FormField label="SKU" htmlFor="p-sku">
            <Input id="p-sku" className="font-mono" value={form.sku} onChange={e => set({ sku: e.target.value })} />
          </FormField>
          <FormField label="Categoria" htmlFor="p-cat" className="sm:col-span-2">
            <Input id="p-cat" value={form.category} placeholder="Capas, películas, cabos…"
              onChange={e => set({ category: e.target.value })} />
          </FormField>
          <FormField label="Custo (R$)" htmlFor="p-cost">
            <Input id="p-cost" inputMode="decimal" value={form.cost} onChange={e => set({ cost: e.target.value })} />
          </FormField>
          <FormField label="Preço de venda (R$)" htmlFor="p-price">
            <Input id="p-price" inputMode="decimal" value={form.price} onChange={e => set({ price: e.target.value })} />
          </FormField>
          <FormField label="Quantidade" htmlFor="p-qty"
            hint={product ? "Use “Movimentar” para alterar o estoque." : undefined}>
            <Input id="p-qty" inputMode="numeric" value={form.qty} disabled={Boolean(product)}
              onChange={e => set({ qty: e.target.value })} />
          </FormField>
          <FormField label="Estoque mínimo" htmlFor="p-min">
            <Input id="p-min" inputMode="numeric" value={form.minQty} onChange={e => set({ minQty: e.target.value })} />
          </FormField>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancelar</Button>
          <Button disabled={!form.name.trim() || save.isPending} onClick={() => save.mutate()}>
            {save.isPending ? "Salvando…" : "Salvar"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
