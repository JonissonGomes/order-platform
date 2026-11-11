import { Button } from "@/components/ui/button";
import { StatusBadge } from "@/components/zts/StatusBadge";
import { api } from "@/lib/api";
import { formatCurrency, formatDate, formatDateTime } from "@/lib/format";
import { statusLabel } from "@/lib/orderStatus";
import {
  PORTAL_STEPS,
  portalClientMessage,
  portalStepIndex,
  portalStepReachedAt,
} from "@/lib/portalSteps";
import { cn } from "@/lib/utils";
import type { PortalLookup } from "@/types";
import { useMutation } from "@tanstack/react-query";
import { CalendarClock, Check, Loader2, MessageSquare, Smartphone, Wrench } from "lucide-react";
import { useMemo } from "react";
import { toast } from "sonner";

export function PortalResult({
  data,
  phoneLast4,
  onUpdated,
}: {
  data: PortalLookup;
  phoneLast4: string;
  onUpdated?: (next: PortalLookup) => void;
}) {
  const messages = data.messages ?? [];
  const step = portalStepIndex(data.status);
  const ended = step < 0;
  const canRespond = data.status === "evaluating" && Boolean(data.estimatedCost);
  const reachedAt = useMemo(() => portalStepReachedAt(data.timeline), [data.timeline]);

  const respond = useMutation({
    mutationFn: (decision: "approved" | "cancelled") =>
      api.portalRespond({
        orderNumber: data.orderNumber,
        phoneLast4,
        decision,
      }),
    onSuccess: next => {
      onUpdated?.(next);
      toast.success(
        next.status === "approved"
          ? "Orçamento aprovado. A loja foi avisada."
          : "Orçamento recusado. A loja foi avisada."
      );
    },
    onError: (e: Error) => toast.error(e.message),
  });

  return (
    <div className="space-y-4">
      <div className="bg-card border rounded-md p-3 space-y-2">
        <div className="flex items-start justify-between gap-2">
          <div>
            <p className="zts-eyebrow">Ordem de serviço</p>
            <p className="text-2xl font-semibold font-mono tracking-tight mt-0.5">
              {data.orderNumber.replace(/^OS-/i, "")}
            </p>
          </div>
          <div className="text-right">
            <p className="zts-eyebrow">Previsão</p>
            <p className="text-sm font-medium font-mono mt-0.5">{formatDate(data.expectedAt)}</p>
          </div>
        </div>
        <div className="flex items-center gap-2 text-sm font-medium">
          <Smartphone className="h-4 w-4 text-muted-foreground" />
          {data.device}
        </div>
        {data.serviceType && (
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <Wrench className="h-3.5 w-3.5" />
            {data.serviceType}
          </div>
        )}
        <StatusBadge status={data.status} />
        <p className="text-sm font-medium pt-1">{portalClientMessage(data.status)}</p>
      </div>

      {canRespond && (
        <div className="border border-foreground/15 rounded-md p-3 space-y-2">
          <p className="zts-eyebrow">Orçamento</p>
          <p className="text-2xl font-semibold tabular-nums">
            {formatCurrency(data.estimatedCost)}
          </p>
          <p className="text-xs text-muted-foreground">Serviço: {data.serviceType || "—"}</p>
          <div className="flex flex-col gap-2 sm:flex-row">
            <Button
              className="flex-1"
              disabled={respond.isPending}
              onClick={() => respond.mutate("approved")}
            >
              {respond.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
              Aprovar orçamento
            </Button>
            <Button
              variant="outline"
              className="flex-1 text-destructive border-destructive/40"
              disabled={respond.isPending}
              onClick={() => respond.mutate("cancelled")}
            >
              Recusar
            </Button>
          </div>
        </div>
      )}

      <section>
        <h3 className="zts-eyebrow mb-3">Andamento</h3>
        <ol className="space-y-0" aria-label="Etapas do serviço">
          {PORTAL_STEPS.map((label, i) => {
            const done = !ended && (i < step || (i === step && data.status === "delivered"));
            const current = !ended && i === step && data.status !== "delivered";
            const todo = ended ? i > 0 : i > step;
            const at = reachedAt[i];
            return (
              <li
                key={label}
                className={cn(
                  "grid grid-cols-[1.25rem_1fr] gap-x-3 relative pb-3 last:pb-0",
                  todo && "opacity-50"
                )}
              >
                {i < PORTAL_STEPS.length - 1 && (
                  <span
                    className={cn(
                      "absolute left-[0.55rem] top-5 bottom-0 w-0.5",
                      done || current ? "bg-emerald-500" : "bg-border"
                    )}
                    aria-hidden
                  />
                )}
                <span
                  className={cn(
                    "relative z-[1] h-5 w-5 rounded-full border-2 flex items-center justify-center",
                    done && "bg-emerald-600 border-emerald-600 text-white",
                    current && "bg-foreground border-foreground text-background",
                    todo && "bg-background border-border"
                  )}
                >
                  {done ? <Check className="h-3 w-3" /> : null}
                </span>
                <div className="min-w-0 pt-0.5">
                  <p className={cn("text-sm", current || done ? "font-semibold" : "font-medium")}>
                    {label}
                  </p>
                  {at && (done || current) && (
                    <p className="text-xs text-muted-foreground">{formatDateTime(at)}</p>
                  )}
                  {current && !at && (
                    <p className="text-xs text-muted-foreground">
                      {data.statusLabel ?? statusLabel(data.status)}
                    </p>
                  )}
                </div>
              </li>
            );
          })}
        </ol>
        {ended && (
          <p className="text-xs text-muted-foreground mt-2">
            {data.statusLabel ?? statusLabel(data.status)}
            {data.updatedAt ? ` · ${formatDateTime(data.updatedAt)}` : ""}
          </p>
        )}
      </section>

      <div className="grid grid-cols-2 gap-2">
        <div className="bg-card border rounded-md p-3">
          <CalendarClock className="h-4 w-4 text-muted-foreground mb-1" />
          <p className="zts-eyebrow">Previsão</p>
          <p className="text-sm font-medium">{formatDate(data.expectedAt)}</p>
        </div>
        <div className="bg-card border rounded-md p-3">
          <Wrench className="h-4 w-4 text-muted-foreground mb-1" />
          <p className="zts-eyebrow">Serviço</p>
          <p className="text-sm font-medium">{data.serviceType || "—"}</p>
        </div>
      </div>

      {messages.length > 0 && (
        <section>
          <h3 className="zts-eyebrow mb-2 flex items-center gap-1.5">
            <MessageSquare className="h-3.5 w-3.5" /> Mensagens da loja
          </h3>
          <ul className="space-y-2">
            {messages.map((m, i) => (
              <li key={i} className="bg-card border rounded-md p-2.5 text-sm">
                <p>{m.content}</p>
                <p className="text-[0.6875rem] text-muted-foreground mt-1">
                  {formatDateTime(m.createdAt)}
                </p>
              </li>
            ))}
          </ul>
        </section>
      )}
    </div>
  );
}
