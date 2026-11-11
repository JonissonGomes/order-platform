import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { FormField } from "@/components/zts/FormField";
import { qk } from "@/hooks/queries";
import { usePermissions } from "@/hooks/usePermissions";
import { api } from "@/lib/api";
import { parseMoney } from "@/lib/format";
import type { CashMovementKind, CashMovementType, PaymentMethod } from "@/types";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { toast } from "sonner";
import { PAYMENT_LABELS } from "./QuickSale";

interface EntryOption {
  kind: CashMovementKind;
  type: CashMovementType;
  label: string;
  /** Recebimentos de OS exigem cash.sale; sangria/reforço exigem cash.movement. */
  permission: "cash.sale" | "cash.movement";
}

const OPTIONS: EntryOption[] = [
  { kind: "withdraw", type: "out", label: "Sangria (retirada)", permission: "cash.movement" },
  { kind: "float", type: "in", label: "Reforço de caixa", permission: "cash.movement" },
  { kind: "os_deposit", type: "in", label: "Sinal de OS", permission: "cash.sale" },
  { kind: "os_balance", type: "in", label: "Saldo de OS", permission: "cash.sale" },
];

/** Lançamentos manuais: sangria, reforço e recebimentos de OS. */
export function CashEntryForm({ disabled }: { disabled: boolean }) {
  const queryClient = useQueryClient();
  const { can } = usePermissions();
  const available = OPTIONS.filter(o => can(o.permission));
  const [kind, setKind] = useState<CashMovementKind>(available[0]?.kind ?? "withdraw");
  const [method, setMethod] = useState<PaymentMethod>("cash");
  const [amount, setAmount] = useState("");
  const [description, setDescription] = useState("");

  const option = OPTIONS.find(o => o.kind === kind)!;

  const add = useMutation({
    mutationFn: () =>
      api.cash.addMovement({
        type: option.type,
        kind,
        method,
        amount: parseMoney(amount),
        description: description.trim() || undefined,
      }),
    onSuccess: () => {
      setAmount("");
      setDescription("");
      queryClient.invalidateQueries({ queryKey: qk.cash });
      toast.success("Lançamento registrado");
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const blocked = disabled || available.length === 0;

  return (
    <Card className="gap-3 py-4 px-4">
      <h2 className="text-sm font-semibold">Outros lançamentos</h2>
      <div className="grid gap-3 sm:grid-cols-2">
        <FormField label="Tipo">
          <Select value={kind} onValueChange={v => setKind(v as CashMovementKind)} disabled={blocked}>
            <SelectTrigger className="w-full"><SelectValue /></SelectTrigger>
            <SelectContent>
              {available.map(o => <SelectItem key={o.kind} value={o.kind}>{o.label}</SelectItem>)}
            </SelectContent>
          </Select>
        </FormField>
        <FormField label="Forma de pagamento">
          <Select value={method} onValueChange={v => setMethod(v as PaymentMethod)} disabled={blocked}>
            <SelectTrigger className="w-full"><SelectValue /></SelectTrigger>
            <SelectContent>
              {Object.entries(PAYMENT_LABELS).map(([k, l]) => <SelectItem key={k} value={k}>{l}</SelectItem>)}
            </SelectContent>
          </Select>
        </FormField>
        <FormField label="Valor (R$)" htmlFor="entry-amount">
          <Input id="entry-amount" inputMode="decimal" value={amount} disabled={blocked}
            onChange={e => setAmount(e.target.value)} />
        </FormField>
        <FormField label="Descrição" htmlFor="entry-desc">
          <Input id="entry-desc" value={description} disabled={blocked}
            onChange={e => setDescription(e.target.value)} />
        </FormField>
      </div>
      <div>
        <Button size="sm" variant="outline" disabled={blocked || parseMoney(amount) <= 0 || add.isPending}
          onClick={() => add.mutate()}>
          Lançar
        </Button>
      </div>
    </Card>
  );
}
