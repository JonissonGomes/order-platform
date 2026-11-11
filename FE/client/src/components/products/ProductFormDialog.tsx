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
import { generateStoreProductCode, normalizeProductCode } from "@/lib/productCode";
import type { Product } from "@/types";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { RefreshCw } from "lucide-react";
import { useEffect, useState } from "react";
import { toast } from "sonner";

const EMPTY = {
  name: "",
  barcode: "",
  category: "",
  cost: "",
  price: "",
  qty: "0",
  minQty: "0",
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
  const [codeLocked, setCodeLocked] = useState(false);
  const set = (patch: Partial<typeof EMPTY>) => setForm(f => ({ ...f, ...patch }));

  const originalCode = product?.barcode?.trim() || product?.sku?.trim() || "";

  useEffect(() => {
    if (!open) return;
    if (product) {
      setForm({
        name: product.name,
        barcode: product.barcode || product.sku || "",
        category: product.category ?? "",
        cost: String(product.cost),
        price: String(product.price),
        qty: String(product.qty),
        minQty: String(product.minQty),
      });
      setCodeLocked(false);
      return;
    }
    const fromScan = initialBarcode ? normalizeProductCode(initialBarcode) : "";
    setForm({
      ...EMPTY,
      barcode: fromScan || generateStoreProductCode(),
    });
    setCodeLocked(Boolean(fromScan));
  }, [open, product, initialBarcode]);

  const codeChanged =
    Boolean(product) &&
    normalizeProductCode(form.barcode) !== "" &&
    normalizeProductCode(form.barcode) !== normalizeProductCode(originalCode);

  const save = useMutation({
    mutationFn: () => {
      const code = normalizeProductCode(form.barcode) || generateStoreProductCode();
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
        : api.products.create({ ...payload, qty: Number(form.qty) || 0 });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: qk.products });
      toast.success(product ? "Produto atualizado" : "Produto cadastrado");
      onOpenChange(false);
    },
    onError: (e: Error) => {
      const msg = e.message || "";
      if (/já existe|conflict|409/i.test(msg)) {
        toast.error("Este código já está em uso. Gere outro ou informe um diferente.");
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
            Bipe o código da embalagem ou use o código gerado pela loja para etiquetar.
          </DialogDescription>
        </DialogHeader>

        <div className="grid gap-3 sm:grid-cols-2">
          <FormField label="Nome *" htmlFor="p-name" className="sm:col-span-2">
            <Input id="p-name" value={form.name} onChange={e => set({ name: e.target.value })} />
          </FormField>

          <FormField
            label="Código do produto *"
            htmlFor="p-bar"
            className="sm:col-span-2"
            hint={
              codeChanged
                ? "Você alterou o código. Reimprima a etiqueta — códigos antigos deixam de funcionar na venda."
                : codeLocked
                  ? "Código lido do leitor. Toque em Trocar para editar ou gerar outro."
                  : "Pode bipar, digitar ou gerar um código da loja."
            }
          >
            <div className="flex gap-2">
              <Input
                id="p-bar"
                className="font-mono"
                value={form.barcode}
                disabled={codeLocked}
                onChange={e => set({ barcode: e.target.value })}
              />
              {codeLocked ? (
                <Button type="button" variant="outline" size="sm" onClick={() => setCodeLocked(false)}>
                  Trocar
                </Button>
              ) : (
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="shrink-0 gap-1.5"
                  onClick={() => set({ barcode: generateStoreProductCode() })}
                >
                  <RefreshCw className="h-3.5 w-3.5" />
                  Gerar
                </Button>
              )}
            </div>
          </FormField>

          <FormField label="Categoria" htmlFor="p-cat" className="sm:col-span-2">
            <Input
              id="p-cat"
              value={form.category}
              placeholder="Capas, películas, cabos…"
              onChange={e => set({ category: e.target.value })}
            />
          </FormField>

          <FormField label="Valor de compra (R$)" htmlFor="p-cost">
            <Input
              id="p-cost"
              inputMode="decimal"
              value={form.cost}
              onChange={e => set({ cost: e.target.value })}
              placeholder="Custo interno / estoque"
            />
          </FormField>
          <FormField label="Valor final — cliente (R$)" htmlFor="p-price">
            <Input
              id="p-price"
              inputMode="decimal"
              value={form.price}
              onChange={e => set({ price: e.target.value })}
              placeholder="Lançado na OS / venda"
            />
          </FormField>

          <FormField
            label="Quantidade"
            htmlFor="p-qty"
            hint={product ? "Use “Movimentar” para alterar o estoque." : undefined}
          >
            <Input
              id="p-qty"
              inputMode="numeric"
              value={form.qty}
              disabled={Boolean(product)}
              onChange={e => set({ qty: e.target.value })}
            />
          </FormField>
          <FormField label="Avisar quando ficar abaixo de" htmlFor="p-min">
            <Input
              id="p-min"
              inputMode="numeric"
              value={form.minQty}
              onChange={e => set({ minQty: e.target.value })}
            />
          </FormField>
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
