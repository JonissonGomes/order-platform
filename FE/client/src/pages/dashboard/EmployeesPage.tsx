import { Badge } from "@/components/ui/badge";
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
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { EmptyState, ErrorState } from "@/components/zts/EmptyState";
import { FormField } from "@/components/zts/FormField";
import { PageHeader } from "@/components/zts/PageHeader";
import { TableSkeleton } from "@/components/zts/TableSkeleton";
import { qk, useDepartments, useEmployees, useProfiles } from "@/hooks/queries";
import { usePermissions } from "@/hooks/usePermissions";
import { api } from "@/lib/api";
import { formatPhone } from "@/lib/format";
import type { CreateEmployeeRequest, EmployeeRole } from "@/types";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Plus, UserCog } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

const ROLE_LABELS: Record<EmployeeRole, string> = {
  admin: "Administrador",
  department_manager: "Gerente de setor",
  attendant: "Atendente",
  technician: "Técnico",
};

const HEADERS = ["Nome", "E-mail", "Função", "Perfil", "Setor", "Situação"];
const EMPTY = { name: "", email: "", password: "", phone: "", role: "attendant" as EmployeeRole, profileId: "", departmentId: "" };

function NewEmployeeDialog({ open, onOpenChange }: { open: boolean; onOpenChange: (o: boolean) => void }) {
  const queryClient = useQueryClient();
  const profiles = useProfiles();
  const departments = useDepartments();
  const [form, setForm] = useState(EMPTY);
  const set = (patch: Partial<typeof EMPTY>) => setForm(f => ({ ...f, ...patch }));

  const create = useMutation({
    mutationFn: () => {
      const payload: CreateEmployeeRequest = {
        name: form.name.trim(),
        email: form.email.trim(),
        password: form.password,
        phone: form.phone || undefined,
        role: form.role,
        profileId: form.profileId || undefined,
        departmentId: form.departmentId || undefined,
      };
      return api.employees.create(payload);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: qk.employees });
      toast.success("Colaborador cadastrado");
      setForm(EMPTY);
      onOpenChange(false);
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const valid = form.name.trim() && form.email.includes("@") && form.password.length >= 6;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Novo colaborador</DialogTitle>
          <DialogDescription>O perfil define o que ele pode acessar no sistema.</DialogDescription>
        </DialogHeader>
        <div className="grid gap-3 sm:grid-cols-2">
          <FormField label="Nome *" htmlFor="e-name" className="sm:col-span-2">
            <Input id="e-name" value={form.name} onChange={e => set({ name: e.target.value })} />
          </FormField>
          <FormField label="E-mail *" htmlFor="e-email">
            <Input id="e-email" type="email" value={form.email} onChange={e => set({ email: e.target.value })} />
          </FormField>
          <FormField label="Senha inicial * (mín. 6)" htmlFor="e-pass">
            <Input id="e-pass" type="password" autoComplete="new-password" value={form.password}
              onChange={e => set({ password: e.target.value })} />
          </FormField>
          <FormField label="Telefone" htmlFor="e-phone">
            <Input id="e-phone" inputMode="tel" value={form.phone}
              onChange={e => set({ phone: formatPhone(e.target.value) })} />
          </FormField>
          <FormField label="Função">
            <Select value={form.role} onValueChange={v => set({ role: v as EmployeeRole })}>
              <SelectTrigger className="w-full"><SelectValue /></SelectTrigger>
              <SelectContent>
                {Object.entries(ROLE_LABELS).map(([k, l]) => <SelectItem key={k} value={k}>{l}</SelectItem>)}
              </SelectContent>
            </Select>
          </FormField>
          <FormField label="Perfil de acesso">
            <Select value={form.profileId} onValueChange={v => set({ profileId: v })}>
              <SelectTrigger className="w-full"><SelectValue placeholder="Selecione" /></SelectTrigger>
              <SelectContent>
                {(profiles.data ?? []).map(p => <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>)}
              </SelectContent>
            </Select>
          </FormField>
          <FormField label="Setor">
            <Select value={form.departmentId} onValueChange={v => set({ departmentId: v })}>
              <SelectTrigger className="w-full"><SelectValue placeholder="Selecione" /></SelectTrigger>
              <SelectContent>
                {(departments.data ?? []).map(d => <SelectItem key={d.id} value={d.id}>{d.name}</SelectItem>)}
              </SelectContent>
            </Select>
          </FormField>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancelar</Button>
          <Button disabled={!valid || create.isPending} onClick={() => create.mutate()}>
            {create.isPending ? "Salvando…" : "Cadastrar"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export default function EmployeesPage() {
  const { can } = usePermissions();
  const { data, isPending, error, refetch } = useEmployees();
  const [open, setOpen] = useState(false);

  return (
    <div className="max-w-6xl mx-auto">
      <PageHeader
        title="Colaboradores"
        description="Equipe, perfis de acesso e setores."
        actions={
          can("employees.create") && (
            <Button size="sm" onClick={() => setOpen(true)}>
              <Plus className="h-4 w-4" /> Novo colaborador
            </Button>
          )
        }
      />
      {isPending ? (
        <TableSkeleton columns={HEADERS.length} headers={HEADERS} />
      ) : error ? (
        <ErrorState message={error.message} onRetry={() => refetch()} />
      ) : (data ?? []).length === 0 ? (
        <EmptyState icon={UserCog} title="Nenhum colaborador cadastrado" />
      ) : (
        <div className="border rounded-md bg-card overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>{HEADERS.map(h => <TableHead key={h}>{h}</TableHead>)}</TableRow>
            </TableHeader>
            <TableBody>
              {data!.map(e => (
                <TableRow key={e.id}>
                  <TableCell className="font-medium">{e.name}</TableCell>
                  <TableCell>{e.email}</TableCell>
                  <TableCell>{ROLE_LABELS[e.role] ?? e.role}</TableCell>
                  <TableCell>{e.profile?.name ?? "—"}</TableCell>
                  <TableCell>{e.department?.name ?? "—"}</TableCell>
                  <TableCell>
                    <Badge variant="outline" className={`rounded-sm ${e.isActive ? "border-emerald-200 bg-emerald-50 text-emerald-800" : "bg-muted text-muted-foreground"}`}>
                      {e.isActive ? "Ativo" : "Inativo"}
                    </Badge>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}
      <NewEmployeeDialog open={open} onOpenChange={setOpen} />
    </div>
  );
}
