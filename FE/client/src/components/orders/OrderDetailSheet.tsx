import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Skeleton } from "@/components/ui/skeleton";
import { Textarea } from "@/components/ui/textarea";
import { StatusBadge } from "@/components/zts/StatusBadge";
import { qk } from "@/hooks/queries";
import { usePermissions } from "@/hooks/usePermissions";
import { api } from "@/lib/api";
import { formatCurrency, formatDate, formatDateTime } from "@/lib/format";
import { PAYMENT_LABELS } from "@/components/cash/QuickSale";
import { printOrderReceipt } from "@/lib/orderReceipt";
import { NEXT_STATUSES, ORDER_STATUS } from "@/lib/orderStatus";
import type { PaymentMethod, ServiceOrder, ServiceOrderStatus } from "@/types";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Check, Printer } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { closeoutReadyMessage, OrderCloseoutPanel } from "./OrderCloseoutPanel";
import { OrderNotes } from "./OrderNotes";

function Info({ label, value }: { label: string; value?: string | number | null }) {
  return (
    <div>
      <p className="zts-eyebrow">{label}</p>
      <p className="text-sm mt-0.5 break-words">{value || "—"}</p>
    </div>
  );
}

/** Valor estimado a lançar; o backend desconta o que já entrou no caixa (ex.: sinal). */
function amountDueOnDelivery(order: ServiceOrder): number {
  const realized = order.finalCost && order.finalCost > 0
    ? order.finalCost
    : (order.estimatedCost ?? 0);
  return Math.max(0, Math.round(realized * 100) / 100);
}

function StatusChanger({ order }: { order: ServiceOrder }) {
  const queryClient = useQueryClient();
  const { can } = usePermissions();
  const [status, setStatus] = useState<ServiceOrderStatus>(order.status);
  const [notes, setNotes] = useState("");
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>("pix");

  const due = amountDueOnDelivery(order);
  const needsPayment = status === "delivered" && due > 0;

  const mutation = useMutation({
    mutationFn: () =>
      api.serviceOrders.updateStatus(order.id, {
        status,
        notes: notes.trim() || undefined,
        paymentMethod: needsPayment ? paymentMethod : undefined,
      }),
    onSuccess: () => {
      setNotes("");
      queryClient.invalidateQueries({ queryKey: qk.orders });
      queryClient.invalidateQueries({ queryKey: ["service-order", order.id] });
      queryClient.invalidateQueries({ queryKey: qk.products });
      queryClient.invalidateQueries({ queryKey: qk.cash });
      toast.success(
        needsPayment
          ? `Entregue · ${formatCurrency(due)} lançado no caixa`
          : `Status alterado para ${ORDER_STATUS[status].label}`,
      );
    },
    onError: (e: Error) => toast.error(e.message),
  });

  // Só transições válidas e com permissão fina por status (service_orders.status.<status>)
  const options = [
    order.status,
    ...NEXT_STATUSES[order.status].filter(s => can(`service_orders.status.${s}`)),
  ];

  const gateMessage =
    status === "ready" || status === "delivered" ? closeoutReadyMessage(order) : null;

  return (
    <section className="space-y-2 border rounded-md p-3 bg-muted/30">
      <h3 className="zts-eyebrow">Alterar status</h3>
      <Select value={status} onValueChange={v => setStatus(v as ServiceOrderStatus)}>
        <SelectTrigger className="w-full bg-card"><SelectValue /></SelectTrigger>
        <SelectContent>
          {options.map(s => (
            <SelectItem key={s} value={s}>{ORDER_STATUS[s].label}</SelectItem>
          ))}
        </SelectContent>
      </Select>
      {needsPayment && (
        <div className="space-y-1.5 rounded-md border border-emerald-200 bg-emerald-50/80 px-2.5 py-2">
          <p className="text-xs text-emerald-900">
            Recebimento no caixa: <span className="font-medium">{formatCurrency(due)}</span>
            {(order.depositAmount ?? 0) > 0
              ? ` · sinal informado ${formatCurrency(order.depositAmount!)} (descontado se já lançado)`
              : ""}
          </p>
          <Select value={paymentMethod} onValueChange={v => setPaymentMethod(v as PaymentMethod)}>
            <SelectTrigger className="w-full bg-card h-8 text-sm">
              <SelectValue placeholder="Forma de pagamento" />
            </SelectTrigger>
            <SelectContent>
              {(Object.keys(PAYMENT_LABELS) as PaymentMethod[]).map(m => (
                <SelectItem key={m} value={m}>{PAYMENT_LABELS[m]}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      )}
      <Textarea value={notes} onChange={e => setNotes(e.target.value)} rows={2}
        placeholder="Observação da mudança (opcional)" className="bg-card" />
      {gateMessage && (
        <p className="text-xs text-amber-800 bg-amber-50 border border-amber-200 rounded-md px-2 py-1.5">
          {gateMessage}
        </p>
      )}
      <Button
        size="sm"
        disabled={status === order.status || mutation.isPending || Boolean(gateMessage)}
        onClick={() => mutation.mutate()}
      >
        {mutation.isPending ? "Salvando…" : needsPayment ? "Entregar e receber" : "Atualizar status"}
      </Button>
    </section>
  );
}

function Timeline({ order }: { order: ServiceOrder }) {
  const history = order.statusHistory ?? [];
  if (history.length === 0) return null;
  return (
    <section className="space-y-2">
      <h3 className="zts-eyebrow">Linha do tempo</h3>
      <ol className="border-l pl-4 space-y-3 ml-1">
        {history.map(h => (
          <li key={h.id} className="relative">
            <span className="absolute -left-[21px] top-1.5 h-2 w-2 rounded-[1px] bg-primary" />
            <p className="text-sm font-medium">{ORDER_STATUS[h.newStatus]?.label ?? h.newStatus}</p>
            <p className="text-xs text-muted-foreground">
              {formatDateTime(h.changedAt)}
              {h.changedByEmployee?.name ? ` · ${h.changedByEmployee.name}` : ""}
            </p>
            {h.notes && <p className="text-xs mt-0.5">{h.notes}</p>}
          </li>
        ))}
      </ol>
    </section>
  );
}

interface OrderDetailSheetProps {
  order: ServiceOrder | null;
  onOpenChange: (open: boolean) => void;
}

export function OrderDetailSheet({ order: summary, onOpenChange }: OrderDetailSheetProps) {
  // Detalhe completo (histórico/notas); usa o resumo da lista enquanto carrega.
  const { data, isFetching } = useQuery({
    queryKey: ["service-order", summary?.id],
    queryFn: () => api.serviceOrders.get(summary!.id),
    enabled: Boolean(summary),
    initialData: summary ?? undefined,
    staleTime: 0,
  });
  const order = summary && data ? { ...summary, ...data } : (data ?? summary);
  const [printing, setPrinting] = useState(false);

  const handlePrint = async () => {
    if (!order) return;
    setPrinting(true);
    try {
      await printOrderReceipt(order.id);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Falha ao imprimir");
    } finally {
      setPrinting(false);
    }
  };

  return (
    <Sheet open={Boolean(summary)} onOpenChange={onOpenChange}>
      <SheetContent className="w-full sm:max-w-2xl overflow-y-auto p-0 gap-0">
        {order && (
          <>
            <SheetHeader className="border-b p-4">
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0 space-y-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <SheetTitle>OS #{order.orderNumber}</SheetTitle>
                    <StatusBadge status={order.status} />
                  </div>
                  <SheetDescription>
                    {order.productBrand} {order.productModel} · {order.customer?.name ?? "Cliente"}
                  </SheetDescription>
                </div>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="shrink-0"
                  disabled={printing}
                  onClick={handlePrint}
                >
                  <Printer className="h-4 w-4" />
                  {printing ? "Abrindo…" : "Recibo"}
                </Button>
              </div>
            </SheetHeader>

            <div className="p-4 space-y-5">
              <StatusChanger key={order.status} order={order} />

              <div className="grid grid-cols-2 gap-3">
                <Info label="Aparelho" value={`${order.productType} · ${order.productBrand} ${order.productModel}`} />
                <Info label="IMEI / Série" value={order.imei} />
                <Info label="Serviço" value={order.serviceType} />
                <Info label="Técnico" value={order.assignedEmployee?.name} />
                <Info label="Previsão" value={formatDate(order.expectedAt)} />
                <Info label="Orçamento" value={formatCurrency(order.estimatedCost)} />
                <Info label="Sinal" value={formatCurrency(order.depositAmount)} />
                <Info
                  label="Saldo estimado"
                  value={
                    order.estimatedCost
                      ? formatCurrency(Math.max(0, (order.estimatedCost ?? 0) - (order.depositAmount ?? 0)))
                      : undefined
                  }
                />
                <Info label="Valor final" value={order.finalCost ? formatCurrency(order.finalCost) : undefined} />
                <Info label="Garantia" value={order.warrantyDays ? `${order.warrantyDays} dias` : undefined} />
                <Info label="Telefone" value={order.customer?.phone} />
              </div>

              {(order.estimatedCost ?? 0) > 0 && (
                <div className="border rounded-md bg-muted/40 p-3 text-sm">
                  Resultado estimado: orçamento{" "}
                  <strong className="tabular-nums">{formatCurrency(order.estimatedCost)}</strong>
                  {order.depositAmount
                    ? <> · sinal <strong className="tabular-nums">{formatCurrency(order.depositAmount)}</strong></>
                    : null}
                  . Saldo a receber{" "}
                  <strong className="tabular-nums">
                    {formatCurrency(Math.max(0, (order.estimatedCost ?? 0) - (order.depositAmount ?? 0)))}
                  </strong>
                  .
                </div>
              )}

              <Info label="Defeito relatado" value={order.problemDescription} />

              <OrderCloseoutPanel key={`${order.id}-${order.updatedAt}`} order={order} />

              {order.checklist && order.checklist.length > 0 && (
                <section className="space-y-2">
                  <h3 className="zts-eyebrow">Checklist de entrada</h3>
                  <ul className="grid grid-cols-2 gap-1.5">
                    {order.checklist.map(label => (
                      <li key={label} className="flex items-center gap-1.5 text-xs">
                        <Check className="h-3.5 w-3.5 text-emerald-600" />
                        {label}
                      </li>
                    ))}
                  </ul>
                </section>
              )}

              {isFetching && !order.statusHistory ? <Skeleton className="h-24" /> : <Timeline order={order} />}
              <OrderNotes orderId={order.id} notes={order.notes ?? []} />
            </div>
          </>
        )}
      </SheetContent>
    </Sheet>
  );
}
