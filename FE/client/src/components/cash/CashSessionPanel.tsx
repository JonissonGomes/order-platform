import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { FormField } from "@/components/zts/FormField";
import { qk } from "@/hooks/queries";
import { api } from "@/lib/api";
import { formatCurrency, formatDateTime, parseMoney } from "@/lib/format";
import type { CashSession, CashSummary } from "@/types";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Lock, Unlock } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

interface CashSessionPanelProps {
  session: CashSession | null | undefined;
  summary?: CashSummary;
  loading: boolean;
  canOpen: boolean;
  canClose: boolean;
}

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

  if (loading) return <Skeleton className="h-36" />;

  const isOpen = session?.status === "open";
  const expected = summary?.expectedCash ?? session?.openingFloat ?? 0;
  const canAct = isOpen ? canClose : canOpen;

  return (
    <Card className="gap-3 py-4 px-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          {isOpen ? <Unlock className="h-4 w-4 text-emerald-600" /> : <Lock className="h-4 w-4 text-muted-foreground" />}
          <h2 className="text-sm font-semibold">{isOpen ? "Caixa aberto" : "Caixa fechado"}</h2>
        </div>
        {isOpen && session && (
          <span className="text-xs text-muted-foreground">desde {formatDateTime(session.openedAt)}</span>
        )}
      </div>

      {isOpen && session && (
        <div className="grid grid-cols-3 gap-3 text-sm">
          <div><p className="zts-eyebrow">Fundo</p><p className="tabular-nums">{formatCurrency(session.openingFloat)}</p></div>
          <div><p className="zts-eyebrow">Entradas</p><p className="tabular-nums">{formatCurrency(summary?.totalIn)}</p></div>
          <div><p className="zts-eyebrow">Dinheiro esperado</p><p className="tabular-nums font-semibold">{formatCurrency(expected)}</p></div>
        </div>
      )}

      {canAct ? (
        <div className="grid gap-3 sm:grid-cols-2">
          <FormField label={isOpen ? "Dinheiro contado no fechamento (R$)" : "Fundo de troco (R$)"} htmlFor="cash-amount"
            hint={isOpen && amount ? `Diferença: ${formatCurrency(parseMoney(amount) - expected)}` : undefined}>
            <Input id="cash-amount" inputMode="decimal" placeholder="0,00" value={amount}
              onChange={e => setAmount(e.target.value)} />
          </FormField>
          <FormField label="Observações" htmlFor="cash-notes">
            <Input id="cash-notes" value={notes} onChange={e => setNotes(e.target.value)} />
          </FormField>
          <div className="sm:col-span-2">
            {isOpen ? (
              <Button variant="destructive" size="sm" disabled={!amount || close.isPending}
                onClick={() => close.mutate()}>
                Fechar caixa
              </Button>
            ) : (
              <Button size="sm" disabled={!amount || open.isPending} onClick={() => open.mutate()}>
                Abrir caixa
              </Button>
            )}
          </div>
        </div>
      ) : (
        <p className="text-xs text-muted-foreground">
          Seu perfil não pode {isOpen ? "fechar" : "abrir"} o caixa.
        </p>
      )}
    </Card>
  );
}
