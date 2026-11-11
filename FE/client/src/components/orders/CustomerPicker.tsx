import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { FormField } from "@/components/zts/FormField";
import { useCustomers } from "@/hooks/queries";
import { formatCpf, formatPhone } from "@/lib/format";
import { cn } from "@/lib/utils";
import { useMemo, useState } from "react";

export interface NewCustomerData {
  name: string;
  cpf: string;
  phone: string;
  email: string;
}

export type CustomerValue =
  | { mode: "existing"; id: string }
  | { mode: "new"; data: NewCustomerData };

export const EMPTY_NEW_CUSTOMER: NewCustomerData = { name: "", cpf: "", phone: "", email: "" };

interface CustomerPickerProps {
  value: CustomerValue;
  onChange: (value: CustomerValue) => void;
}

const MODES = [
  { key: "existing", label: "Cliente existente" },
  { key: "new", label: "Novo cliente" },
] as const;

export function CustomerPicker({ value, onChange }: CustomerPickerProps) {
  const { data, isPending } = useCustomers();
  const [search, setSearch] = useState("");

  const matches = useMemo(() => {
    const term = search.trim().toLowerCase();
    return (data ?? [])
      .filter(c => !term || c.name.toLowerCase().includes(term) || c.phone.includes(term) || c.cpf.includes(term))
      .slice(0, 6);
  }, [data, search]);

  const setNew = (patch: Partial<NewCustomerData>) =>
    value.mode === "new" && onChange({ mode: "new", data: { ...value.data, ...patch } });

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap gap-2">
        {MODES.map(m => (
          <button
            key={m.key}
            type="button"
            onClick={() =>
              onChange(m.key === "new"
                ? { mode: "new", data: EMPTY_NEW_CUSTOMER }
                : { mode: "existing", id: "" })
            }
            className={cn(
              "px-3.5 h-9 text-xs font-medium rounded-sm border transition-colors",
              value.mode === m.key
                ? "bg-foreground text-background border-foreground"
                : "bg-card text-muted-foreground border-border hover:bg-muted/60"
            )}
          >
            {m.label}
          </button>
        ))}
      </div>

      {value.mode === "existing" ? (
        <div className="space-y-2">
          <Input placeholder="Buscar por nome, telefone ou CPF" value={search}
            onChange={e => setSearch(e.target.value)} />
          {isPending ? (
            <Skeleton className="h-24" />
          ) : matches.length === 0 ? (
            <p className="text-xs text-muted-foreground">Nenhum cliente encontrado.</p>
          ) : (
            <ul className="border rounded-sm divide-y bg-card">
              {matches.map(c => (
                <li key={c.id}>
                  <button
                    type="button"
                    onClick={() => onChange({ mode: "existing", id: c.id })}
                    className={cn(
                      "w-full text-left px-3 py-2 text-sm hover:bg-muted/60",
                      value.id === c.id && "bg-accent"
                    )}
                  >
                    <span className="font-medium">{c.name}</span>
                    <span className="text-xs text-muted-foreground ml-2">{c.phone}</span>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2">
          <FormField label="Nome *" htmlFor="c-name" className="sm:col-span-2">
            <Input id="c-name" value={value.data.name} onChange={e => setNew({ name: e.target.value })} />
          </FormField>
          <FormField label="Telefone *" htmlFor="c-phone">
            <Input id="c-phone" value={value.data.phone} inputMode="tel"
              onChange={e => setNew({ phone: formatPhone(e.target.value) })} />
          </FormField>
          <FormField label="CPF (opcional)" htmlFor="c-cpf">
            <Input
              id="c-cpf"
              inputMode="numeric"
              value={value.data.cpf}
              onChange={e => setNew({ cpf: formatCpf(e.target.value) })}
            />
          </FormField>
          <FormField label="E-mail (opcional)" htmlFor="c-email" className="sm:col-span-2">
            <Input id="c-email" type="email" value={value.data.email}
              onChange={e => setNew({ email: e.target.value })} />
          </FormField>
        </div>
      )}
    </div>
  );
}
