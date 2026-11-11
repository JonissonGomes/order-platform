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
import { SuggestInput } from "@/components/zts/SuggestInput";
import { qk } from "@/hooks/queries";
import { api } from "@/lib/api";
import {
  formatIntegerInput,
  formatMoneyInput,
  moneyToInput,
  parseMoney,
} from "@/lib/format";
import { generateStoreProductCode, normalizeProductCode } from "@/lib/productCode";
import { PRODUCT_CATEGORIES } from "@/lib/productCategories";
import type { Product } from "@/types";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";

const EMPTY = {
  name: "",
  barcode: "",
  category: "",
  cost: "",
  price: "",
  qty: "1",
  minQty: "2",
};

interface ProductFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** Produto em edição; se ausente, cria um novo. */
  product?: Product | null;
  /** Código pré-preenchido (leitura sem cadastro). */
  initialBarcode?: string;
}

export function ProductFormDialog({
  open,
  onOpenChange,
  product,
  initialBarcode,
}: ProductFormDialogProps) {
  const queryClient = useQueryClient();
  const [form, setForm] = useState(EMPTY);
  const set = (patch: Partial<typeof EMPTY>) => setForm(f => ({ ...f, ...patch }));

  useEffect(() => {
    if (!open) return;
    if (product) {
      setForm({
        name: product.name,
        barcode: product.barcode || product.sku || "",
        category: product.category ?? "",
        cost: moneyToInput(product.cost),
        price: moneyToInput(product.price),
        qty: String(product.qty),
        minQty: String(product.minQty),
      });
      return;
    }
    const fromScan = initialBarcode ? normalizeProductCode(initialBarcode) : "";
    setForm({
      ...EMPTY,
      barcode: fromScan || generateStoreProductCode(),
    });
  }, [open, product, initialBarcode]);

  const qtyNum = Number(form.qty) || 0;
  const codePreview = useMemo(() => {
    const code = normalizeProductCode(form.barcode) || generateStoreProductCode();
    return code;
  }, [form.barcode]);

  const save = useMutation({
    mutationFn: () => {
      // Código sempre automático no cadastro (ou o bipado); não exige campo visível.
      const code =
        normalizeProductCode(form.barcode) ||
        (product
          ? normalizeProductCode(product.barcode || product.sku || "") || generateStoreProductCode()
          : generateStoreProductCode());
      const payload = {
        name: form.name.trim(),
        barcode: code,
        sku: code,
        category: form.category.trim() || undefined,
        cost: parseMoney(form.cost),
        price: parseMoney(form.price),
        minQty: Number(form.minQty) || 0,
      };
      return product
        ? api.products.update(product.id, payload)
        : api.products.create({ ...payload, qty: Math.max(0, qtyNum) });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: qk.products });
      toast.success(product ? "Produto atualizado" : "Produto cadastrado");
      onOpenChange(false);
    },
    onError: (e: Error) => {
      const msg = e.message || "";
      if (/já existe|conflict|409/i.test(msg)) {
        toast.error("Código interno em conflito. Tente salvar novamente.");
        set({ barcode: generateStoreProductCode() });
        return;
      }
      toast.error(msg || "Não foi possível salvar");
    },
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>{product ? "Editar produto" : "Novo produto"}</DialogTitle>
          <DialogDescription>
            Informe nome, categoria, valores e quantidade. O código interno é gerado automaticamente
            {product ? "." : " com base no cadastro de estoque."}
          </DialogDescription>
        </DialogHeader>

        <div className="grid gap-3 sm:grid-cols-2">
          <FormField label="Nome *" htmlFor="p-name" className="sm:col-span-2">
            <Input id="p-name" value={form.name} onChange={e => set({ name: e.target.value })} />
          </FormField>

          <FormField
            label="Categoria"
            htmlFor="p-cat"
            className="sm:col-span-2"
            hint="Sugestões da loja — você também pode digitar outra."
          >
            <SuggestInput
              id="p-cat"
              value={form.category}
              options={[...PRODUCT_CATEGORIES]}
              placeholder="Ex.: Capas e cases"
              onChange={v => set({ category: v })}
            />
          </FormField>

          <FormField label="Valor de compra (R$)" htmlFor="p-cost" hint="Custo interno / estoque">
            <Input
              id="p-cost"
              inputMode="numeric"
              value={form.cost}
              onChange={e => set({ cost: formatMoneyInput(e.target.value) })}
              placeholder="0,00"
            />
          </FormField>
          <FormField label="Valor final — cliente (R$)" htmlFor="p-price" hint="Lançado na OS / venda">
            <Input
              id="p-price"
              inputMode="numeric"
              value={form.price}
              onChange={e => set({ price: formatMoneyInput(e.target.value) })}
              placeholder="0,00"
            />
          </FormField>

          <FormField
            label="Quantidade em estoque"
            htmlFor="p-qty"
            hint={
              product
                ? "Use “Movimentar” para alterar o estoque."
                : qtyNum > 0
                  ? `${qtyNum} unidade${qtyNum === 1 ? "" : "s"} · código gerado automaticamente para etiquetar`
                  : "Informe a quantidade inicial do lote"
            }
          >
            <Input
              id="p-qty"
              inputMode="numeric"
              value={form.qty}
              disabled={Boolean(product)}
              onChange={e => {
                const nextQty = formatIntegerInput(e.target.value);
                // Novo cadastro: garante um código interno fresco ao definir o lote.
                if (!product) {
                  set({
                    qty: nextQty,
                    barcode: form.barcode || generateStoreProductCode(),
                  });
                  return;
                }
                set({ qty: nextQty });
              }}
            />
          </FormField>
          <FormField label="Avisar quando ficar abaixo de" htmlFor="p-min">
            <Input
              id="p-min"
              inputMode="numeric"
              value={form.minQty}
              onChange={e => set({ minQty: formatIntegerInput(e.target.value) })}
            />
          </FormField>

          <p className="sm:col-span-2 text-xs text-muted-foreground font-mono">
            Código interno: {codePreview || "—"}
            {initialBarcode ? " (lido no bip)" : " (automático)"}
          </p>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancelar
          </Button>
          <Button disabled={!form.name.trim() || save.isPending} onClick={() => save.mutate()}>
            {save.isPending ? "Salvando…" : "Salvar"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
