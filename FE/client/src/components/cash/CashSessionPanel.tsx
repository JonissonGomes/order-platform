import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { FormField } from "@/components/zts/FormField";
import { qk } from "@/hooks/queries";
import { api } from "@/lib/api";
import { PAYMENT_LABELS } from "@/components/cash/QuickSale";
import { formatCurrency, formatDateTime, formatMoneyInput, parseMoney } from "@/lib/format";
import type { CashSession, CashSummary, PaymentMethod } from "@/types";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Lock, Unlock } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

const METHOD_ORDER: PaymentMethod[] = ["cash", "pix", "debit", "credit"];

interface CashSessionPanelProps {
  session: CashSession | null | undefined;
  summary?: CashSummary;
  loading: boolean;
  canOpen: boolean;
  canClose: boolean;
}

/** Faixa de status do caixa: KPIs + abrir/fechar em formulário compacto. */
export function CashSessionPanel({ session, summary, loading, canOpen, canClose }: CashSessionPanelProps) {
  const queryClient = useQueryClient();
  const [amount, setAmount] = useState("");
  const [notes, setNotes] = useState("");

  const done = (message: string) => {
    queryClient.invalidateQueries({ queryKey: qk.cash });
    setAmount("");
    setNotes("");
    toast.success(message);
  };

  const open = useMutation({
    mutationFn: () => api.cash.open({ openingFloat: parseMoney(amount), notes: notes.trim() || undefined }),
    onSuccess: () => done("Caixa aberto"),
    onError: (e: Error) => toast.error(e.message),
  });

  const close = useMutation({
    mutationFn: () => api.cash.close({ closingCounted: parseMoney(amount), notes: notes.trim() || undefined }),
    onSuccess: () => done("Caixa fechado"),
    onError: (e: Error) => toast.error(e.message),
  });

  if (loading) return <Skeleton className="h-24" />;

  const isOpen = session?.status === "open";
  const expected = summary?.expectedCash ?? session?.openingFloat ?? 0;
  const canAct = isOpen ? canClose : canOpen;

  return (
    <Card className="gap-3 py-3 px-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2 min-w-0">
          {isOpen ? (
            <Unlock className="h-4 w-4 text-emerald-600 shrink-0" />
          ) : (
            <Lock className="h-4 w-4 text-muted-foreground shrink-0" />
          )}
          <h2 className="text-sm font-semibold">{isOpen ? "Caixa aberto" : "Caixa fechado"}</h2>
          {isOpen && session && (
            <span className="text-xs text-muted-foreground truncate">
              desde {formatDateTime(session.openedAt)}
            </span>
          )}
        </div>
      </div>

      {isOpen && session && (
        <>
          <div className="grid grid-cols-3 gap-2 sm:gap-4 text-sm max-w-xl">
            <div>
              <p className="zts-eyebrow">Fundo</p>
              <p className="tabular-nums">{formatCurrency(session.openingFloat)}</p>
            </div>
            <div>
              <p className="zts-eyebrow">Entradas</p>
              <p className="tabular-nums">{formatCurrency(summary?.totalIn)}</p>
            </div>
            <div>
              <p className="zts-eyebrow">Dinheiro esperado</p>
              <p className="tabular-nums font-semibold">{formatCurrency(expected)}</p>
            </div>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
            {METHOD_ORDER.map(method => (
              <div key={method} className="rounded-sm border bg-muted/40 px-2.5 py-2">
                <p className="zts-eyebrow">{PAYMENT_LABELS[method]}</p>
                <p className="text-sm font-medium tabular-nums mt-0.5">
                  {formatCurrency(summary?.totalsByMethod?.[method] ?? 0)}
                </p>
              </div>
            ))}
          </div>
        </>
      )}

      {canAct ? (
        <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap sm:items-end">
          <FormField
            className="sm:w-36"
            label={isOpen ? "Dinheiro contado (R$)" : "Fundo de troco (R$)"}
            htmlFor="cash-amount"
            hint={isOpen && amount ? `Diferença: ${formatCurrency(parseMoney(amount) - expected)}` : undefined}
          >
            <Input
              id="cash-amount"
              inputMode="numeric"
              placeholder="0,00"
              value={amount}
              onChange={e => setAmount(formatMoneyInput(e.target.value))}
            />
          </FormField>
          <FormField className="sm:flex-1 sm:min-w-[8rem]" label="Observações" htmlFor="cash-notes">
            <Input id="cash-notes" value={notes} onChange={e => setNotes(e.target.value)} />
          </FormField>
          {isOpen ? (
            <Button
              variant="destructive"
              size="sm"
              className="sm:mb-0.5"
              disabled={!amount || close.isPending}
              onClick={() => close.mutate()}
            >
              Fechar caixa
            </Button>
          ) : (
            <Button
              size="sm"
              className="sm:mb-0.5"
              disabled={!amount || open.isPending}
              onClick={() => open.mutate()}
            >
              Abrir caixa
            </Button>
          )}
        </div>
      ) : (
        <p className="text-xs text-muted-foreground">
          Seu perfil não pode {isOpen ? "fechar" : "abrir"} o caixa.
        </p>
      )}
    </Card>
  );
}
