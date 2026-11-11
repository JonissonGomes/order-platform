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
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { EmptyState, ErrorState } from "@/components/zts/EmptyState";
import { FormField } from "@/components/zts/FormField";
import { PageHeader } from "@/components/zts/PageHeader";
import { TableSkeleton } from "@/components/zts/TableSkeleton";
import { qk, useCustomers } from "@/hooks/queries";
import { usePermissions } from "@/hooks/usePermissions";
import { api } from "@/lib/api";
import { digitsOnly, formatDate, formatPhone } from "@/lib/format";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Plus, Search, Users } from "lucide-react";
import { useMemo, useState } from "react";
import { toast } from "sonner";

const HEADERS = ["Nome", "Telefone", "CPF", "E-mail", "Cadastro"];
const EMPTY = { name: "", phone: "", cpf: "", email: "" };

function NewCustomerDialog({ open, onOpenChange }: { open: boolean; onOpenChange: (o: boolean) => void }) {
  const queryClient = useQueryClient();
  const [form, setForm] = useState(EMPTY);
  const set = (patch: Partial<typeof EMPTY>) => setForm(f => ({ ...f, ...patch }));

  const create = useMutation({
    mutationFn: () =>
      api.customers.create({
        name: form.name.trim(),
        phone: digitsOnly(form.phone),
        cpf: digitsOnly(form.cpf),
        email: form.email.trim() || undefined,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: qk.customers });
      toast.success("Cliente cadastrado");
      setForm(EMPTY);
      onOpenChange(false);
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const valid = form.name.trim() && digitsOnly(form.phone).length >= 10;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Novo cliente</DialogTitle>
          <DialogDescription>Cadastro rápido para ordens e vendas.</DialogDescription>
        </DialogHeader>
        <div className="grid gap-3">
          <FormField label="Nome *" htmlFor="nc-name">
            <Input id="nc-name" value={form.name} onChange={e => set({ name: e.target.value })} />
          </FormField>
          <div className="grid grid-cols-2 gap-3">
            <FormField label="Telefone *" htmlFor="nc-phone">
              <Input id="nc-phone" inputMode="tel" value={form.phone}
                onChange={e => set({ phone: formatPhone(e.target.value) })} />
            </FormField>
            <FormField label="CPF" htmlFor="nc-cpf">
              <Input id="nc-cpf" value={form.cpf} onChange={e => set({ cpf: e.target.value })} />
            </FormField>
          </div>
          <FormField label="E-mail" htmlFor="nc-email">
            <Input id="nc-email" type="email" value={form.email} onChange={e => set({ email: e.target.value })} />
          </FormField>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancelar</Button>
          <Button disabled={!valid || create.isPending} onClick={() => create.mutate()}>
            {create.isPending ? "Salvando…" : "Salvar"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export default function CustomersList() {
  const { can } = usePermissions();
  const { data, isPending, error, refetch } = useCustomers();
  const [search, setSearch] = useState("");
  const [dialogOpen, setDialogOpen] = useState(false);

  const filtered = useMemo(() => {
    const term = search.trim().toLowerCase();
    return (data ?? []).filter(
      c => !term || [c.name, c.phone, c.cpf, c.email].some(v => v?.toLowerCase().includes(term))
    );
  }, [data, search]);

  return (
    <div className="max-w-6xl mx-auto">
      <PageHeader
        title="Clientes"
        description="Base de clientes da assistência e do balcão."
        actions={
          can("customers.create") && (
            <Button size="sm" onClick={() => setDialogOpen(true)}>
              <Plus className="h-4 w-4" /> Novo cliente
            </Button>
          )
        }
      />
      <div className="relative max-w-sm mb-4">
        <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
        <Input className="pl-8" placeholder="Buscar por nome, telefone, CPF ou e-mail"
          value={search} onChange={e => setSearch(e.target.value)} />
      </div>

      {isPending ? (
        <TableSkeleton columns={HEADERS.length} headers={HEADERS} />
      ) : error ? (
        <ErrorState message={error.message} onRetry={() => refetch()} />
      ) : filtered.length === 0 ? (
        <EmptyState icon={Users} title="Nenhum cliente encontrado" />
      ) : (
        <div className="border rounded-md bg-card overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>{HEADERS.map(h => <TableHead key={h}>{h}</TableHead>)}</TableRow>
            </TableHeader>
            <TableBody>
              {filtered.map(c => (
                <TableRow key={c.id}>
                  <TableCell className="font-medium">{c.name}</TableCell>
                  <TableCell>{formatPhone(c.phone)}</TableCell>
                  <TableCell className="font-mono text-xs">{c.cpf || "—"}</TableCell>
                  <TableCell>{c.email || "—"}</TableCell>
                  <TableCell>{formatDate(c.createdAt)}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}
      <NewCustomerDialog open={dialogOpen} onOpenChange={setDialogOpen} />
    </div>
  );
}
