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
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { FormField } from "@/components/zts/FormField";
import { qk } from "@/hooks/queries";
import { api } from "@/lib/api";
import type { InventoryMovementType, Product } from "@/types";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { toast } from "sonner";

const TYPES: { value: InventoryMovementType; label: string; hint: string }[] = [
  { value: "in", label: "Entrada", hint: "Soma ao estoque" },
  { value: "out", label: "Saída", hint: "Subtrai do estoque" },
  { value: "adjust", label: "Ajuste (contagem)", hint: "Define a quantidade final" },
];

export function StockAdjustDialog({
  product,
  onOpenChange,
}: {
  product: Product | null;
  onOpenChange: (open: boolean) => void;
}) {
  const queryClient = useQueryClient();
  const [type, setType] = useState<InventoryMovementType>("in");
  const [quantity, setQuantity] = useState("1");
  const [reason, setReason] = useState("");

  useEffect(() => {
    if (product) {
      setType("in");
      setQuantity("1");
      setReason("");
    }
  }, [product]);

  const adjust = useMutation({
    mutationFn: () =>
      api.products.adjust(product!.id, {
        type,
        qty: Math.abs(Number(quantity) || 0),
        note: reason.trim() || undefined,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: qk.products });
      toast.success("Estoque atualizado");
      onOpenChange(false);
    },
    onError: (e: Error) => toast.error(e.message),
  });

  return (
    <Dialog open={Boolean(product)} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-sm">
        <DialogHeader>
          <DialogTitle>Movimentar estoque</DialogTitle>
          <DialogDescription>
            {product?.name} · atual: <strong>{product?.qty}</strong>
          </DialogDescription>
        </DialogHeader>
        <div className="grid gap-3">
          <FormField label="Tipo" hint={TYPES.find(t => t.value === type)?.hint}>
            <Select value={type} onValueChange={v => setType(v as InventoryMovementType)}>
              <SelectTrigger className="w-full"><SelectValue /></SelectTrigger>
              <SelectContent>
                {TYPES.map(t => <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>)}
              </SelectContent>
            </Select>
          </FormField>
          <FormField label="Quantidade" htmlFor="adj-qty">
            <Input id="adj-qty" inputMode="numeric" autoFocus value={quantity}
              onChange={e => setQuantity(e.target.value)} />
          </FormField>
          <FormField label="Motivo" htmlFor="adj-reason">
            <Input id="adj-reason" value={reason} onChange={e => setReason(e.target.value)} />
          </FormField>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancelar</Button>
          <Button disabled={adjust.isPending} onClick={() => adjust.mutate()}>Confirmar</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
