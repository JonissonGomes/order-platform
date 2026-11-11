import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { SuggestInput } from "@/components/zts/SuggestInput";
import { qk, useProducts } from "@/hooks/queries";
import { api } from "@/lib/api";
import { formatCurrency, formatIntegerInput, formatMoneyInput, moneyToInput, parseMoney } from "@/lib/format";
import type { Product, ServiceOrder } from "@/types";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Plus, Trash2 } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";

const CLOSED = new Set(["delivered", "cancelled", "unrepairable"]);

function partsSubtotal(order: ServiceOrder) {
  return (order.parts ?? []).reduce((s, p) => s + p.qty * p.unitPrice, 0);
}

/** Laudo técnico + peças (baixa de estoque ocorre ao ir para ready/delivered). */
export function OrderCloseoutPanel({ order }: { order: ServiceOrder }) {
  const queryClient = useQueryClient();
  const canEdit = !CLOSED.has(order.status);
  const { data: products } = useProducts();
  const [report, setReport] = useState(order.technicalReport ?? "");
  const [resolution, setResolution] = useState(order.resolution ?? "");
  const [laborOnly, setLaborOnly] = useState(Boolean(order.laborOnly));
  const [laborCost, setLaborCost] = useState(moneyToInput(order.laborCost ?? 0));
  const [productId, setProductId] = useState("");
  const [productQuery, setProductQuery] = useState("");
  const [qty, setQty] = useState("1");

  useEffect(() => {
    setReport(order.technicalReport ?? "");
    setResolution(order.resolution ?? "");
    setLaborOnly(Boolean(order.laborOnly));
    setLaborCost(moneyToInput(order.laborCost ?? 0));
  }, [order.id, order.technicalReport, order.resolution, order.laborOnly, order.laborCost]);

  const activeProducts = useMemo(
    () => (products ?? []).filter(p => p.isActive),
    [products]
  );

  const invalidate = () => {
    queryClient.invalidateQueries({ queryKey: qk.orders });
    queryClient.invalidateQueries({ queryKey: ["service-order", order.id] });
    queryClient.invalidateQueries({ queryKey: qk.products });
  };

  const saveCloseout = useMutation({
    mutationFn: () =>
      api.serviceOrders.closeout(order.id, {
        technicalReport: report.trim(),
        resolution: resolution.trim(),
        laborOnly,
        laborCost: parseMoney(laborCost),
      }),
    onSuccess: () => {
      invalidate();
      toast.success("Laudo salvo");
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const addPart = useMutation({
    mutationFn: () =>
      api.serviceOrders.addPart(order.id, {
        productId,
        qty: Math.max(1, Number(formatIntegerInput(qty)) || 1),
      }),
    onSuccess: () => {
      setProductId("");
      setProductQuery("");
      setQty("1");
      setLaborOnly(false);
      invalidate();
      toast.success("Peça adicionada");
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const removePart = useMutation({
    mutationFn: (partId: string) => api.serviceOrders.removePart(order.id, partId),
    onSuccess: () => {
      invalidate();
      toast.success("Peça removida");
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const subtotal = partsSubtotal(order);
  const labor = parseMoney(laborCost);
  const total = (order.parts?.length ? subtotal : 0) + labor;
  const hasParts = (order.parts?.length ?? 0) > 0;

  return (
    <section className="space-y-3 border rounded-md p-3 bg-muted/30">
      <div>
        <h3 className="zts-eyebrow">Laudo e peças</h3>
        <p className="text-xs text-muted-foreground mt-1">
          Obrigatório antes de marcar pronta/entregue. Estoque só baixa nessa transição.
        </p>
      </div>

      <div className="space-y-1.5">
        <Label htmlFor={`report-${order.id}`}>Parecer técnico</Label>
        <Textarea
          id={`report-${order.id}`}
          value={report}
          onChange={e => setReport(e.target.value)}
          rows={3}
          disabled={!canEdit}
          placeholder="Diagnóstico encontrado no aparelho"
          className="bg-card"
        />
      </div>

      <div className="space-y-1.5">
        <Label htmlFor={`resolution-${order.id}`}>Resolução</Label>
        <Textarea
          id={`resolution-${order.id}`}
          value={resolution}
          onChange={e => setResolution(e.target.value)}
          rows={3}
          disabled={!canEdit}
          placeholder="O que foi feito para resolver"
          className="bg-card"
        />
      </div>

      <div className="space-y-1.5">
        <Label htmlFor={`labor-${order.id}`}>Mão de obra (R$)</Label>
        <Input
          id={`labor-${order.id}`}
          inputMode="numeric"
          value={laborCost}
          onChange={e => setLaborCost(formatMoneyInput(e.target.value))}
          disabled={!canEdit}
          placeholder="0,00"
          className="bg-card"
        />
      </div>

      <label className="flex items-start gap-2 text-sm">
        <Checkbox
          checked={laborOnly}
          disabled={!canEdit || hasParts}
          onCheckedChange={v => setLaborOnly(v === true)}
        />
        <span>
          Só mão de obra (sem peças)
          {hasParts && (
            <span className="block text-xs text-muted-foreground">
              Remova as peças para marcar esta opção.
            </span>
          )}
        </span>
      </label>

      {canEdit && (
        <Button
          size="sm"
          variant="secondary"
          disabled={saveCloseout.isPending}
          onClick={() => saveCloseout.mutate()}
        >
          {saveCloseout.isPending ? "Salvando…" : "Salvar laudo"}
        </Button>
      )}

      {!laborOnly && (
        <div className="space-y-2 pt-1 border-t">
          <p className="text-xs font-medium">Peças utilizadas</p>
          {(order.parts ?? []).length === 0 ? (
            <p className="text-xs text-muted-foreground">Nenhuma peça lançada.</p>
          ) : (
            <ul className="space-y-2">
              {(order.parts ?? []).map(part => (
                <li
                  key={part.id}
                  className="flex items-start justify-between gap-2 text-sm border rounded-md bg-card px-2.5 py-2"
                >
                  <div className="min-w-0">
                    <p className="font-medium truncate">{part.name}</p>
                    <p className="text-xs text-muted-foreground tabular-nums">
                      {part.qty} × {formatCurrency(part.unitPrice)}
                      {part.consumed ? " · estoque baixado" : ""}
                    </p>
                  </div>
                  <div className="flex items-center gap-1 shrink-0">
                    <span className="text-xs tabular-nums">
                      {formatCurrency(part.qty * part.unitPrice)}
                    </span>
                    {order.status !== "cancelled" && (
                      <Button
                        type="button"
                        size="icon"
                        variant="ghost"
                        className="h-7 w-7"
                        disabled={removePart.isPending}
                        onClick={() => {
                          const msg = part.consumed
                            ? "Remover esta peça e estornar o estoque?"
                            : "Remover esta peça da OS?";
                          if (window.confirm(msg)) removePart.mutate(part.id);
                        }}
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    )}
                  </div>
                </li>
              ))}
            </ul>
          )}

          {canEdit && (
            <div className="flex flex-wrap gap-2 items-end">
              <div className="relative flex-1 min-w-[12rem] space-y-1 overflow-visible">
                <Label htmlFor="os-part-product">Produto</Label>
                <SuggestInput
                  id="os-part-product"
                  value={productQuery}
                  options={activeProducts}
                  placeholder="Buscar peça por nome ou código"
                  className="bg-card"
                  getLabel={(p: Product) => p.name}
                  getSearchText={(p: Product) =>
                    [p.sku, p.barcode, p.category].filter(Boolean).join(" ")
                  }
                  onChange={v => {
                    setProductQuery(v);
                    if (productId) setProductId("");
                  }}
                  onSelect={(p: Product) => {
                    setProductId(p.id);
                    setProductQuery(p.name);
                  }}
                  renderOption={(p: Product) => (
                    <span className="flex items-baseline justify-between gap-3">
                      <span className="min-w-0 truncate">{p.name}</span>
                      <span className="shrink-0 tabular-nums text-muted-foreground">
                        {formatCurrency(p.price)} · est. {p.qty}
                      </span>
                    </span>
                  )}
                />
              </div>
              <div className="w-20 space-y-1">
                <Label htmlFor="os-part-qty">Qtd</Label>
                <Input
                  id="os-part-qty"
                  inputMode="numeric"
                  value={qty}
                  onChange={e => setQty(formatIntegerInput(e.target.value, 4))}
                  className="bg-card"
                />
              </div>
              <Button
                size="sm"
                disabled={!productId || addPart.isPending}
                onClick={() => addPart.mutate()}
              >
                <Plus className="h-4 w-4" />
                {addPart.isPending ? "…" : "Add"}
              </Button>
            </div>
          )}
        </div>
      )}

      <div className="text-xs space-y-0.5 border-t pt-2 tabular-nums">
        <p className="flex justify-between gap-2">
          <span className="text-muted-foreground">Peças</span>
          <span>{formatCurrency(subtotal)}</span>
        </p>
        <p className="flex justify-between gap-2">
          <span className="text-muted-foreground">Mão de obra</span>
          <span>{formatCurrency(labor)}</span>
        </p>
        <p className="flex justify-between gap-2 font-medium text-sm">
          <span>Valor final</span>
          <span>{formatCurrency(order.finalCost ?? total)}</span>
        </p>
      </div>
    </section>
  );
}

/** Valida no cliente o gate de ready/delivered. */
export function closeoutReadyMessage(order: ServiceOrder): string | null {
  if (!order.technicalReport?.trim() || !order.resolution?.trim()) {
    return "Salve o parecer técnico e a resolução antes de marcar pronta/entregue.";
  }
  if (!(order.parts?.length) && !order.laborOnly) {
    return "Inclua as peças usadas ou confirme “Só mão de obra” no laudo.";
  }
  if (order.laborOnly && (order.parts?.length ?? 0) > 0) {
    return "Há peças lançadas — desmarque “só mão de obra” ou remova as peças.";
  }
  return null;
}
