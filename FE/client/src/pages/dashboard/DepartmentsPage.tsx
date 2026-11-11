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
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { EmptyState, ErrorState } from "@/components/zts/EmptyState";
import { FiltersDialog } from "@/components/zts/FiltersDialog";
import { FormField } from "@/components/zts/FormField";
import { ListPagination } from "@/components/zts/ListPagination";
import { PageHeader } from "@/components/zts/PageHeader";
import { TableSkeleton } from "@/components/zts/TableSkeleton";
import { useClientPagination } from "@/hooks/useClientPagination";
import { qk, useDepartments } from "@/hooks/queries";
import { usePermissions } from "@/hooks/usePermissions";
import { api } from "@/lib/api";
import type { Department } from "@/types";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Building2, Plus } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";

type StatusFilter = "active" | "inactive";

const HEADERS = ["Setor", "Descrição", "Gerente", "Situação", ""];

function DepartmentDialog({
  open,
  department,
  onOpenChange,
}: {
  open: boolean;
  department: Department | null;
  onOpenChange: (open: boolean) => void;
}) {
  const queryClient = useQueryClient();
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");

  useEffect(() => {
    if (open) {
      setName(department?.name ?? "");
      setDescription(department?.description ?? "");
    }
  }, [open, department]);

  const save = useMutation({
    mutationFn: () => {
      const payload = { name: name.trim(), description: description.trim() || undefined };
      return department
        ? api.departments.update(department.id, payload)
        : api.departments.create(payload);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: qk.departments });
      toast.success(department ? "Setor atualizado" : "Setor criado");
      onOpenChange(false);
    },
    onError: (e: Error) => toast.error(e.message),
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{department ? "Editar setor" : "Novo setor"}</DialogTitle>
          <DialogDescription>Ex.: Bancada, Atendimento, Acessórios.</DialogDescription>
        </DialogHeader>
        <div className="grid gap-3">
          <FormField label="Nome *" htmlFor="d-name">
            <Input id="d-name" value={name} onChange={e => setName(e.target.value)} />
          </FormField>
          <FormField label="Descrição" htmlFor="d-desc">
            <Input id="d-desc" value={description} onChange={e => setDescription(e.target.value)} />
          </FormField>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancelar</Button>
          <Button disabled={!name.trim() || save.isPending} onClick={() => save.mutate()}>Salvar</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export default function DepartmentsPage() {
  const { can } = usePermissions();
  const { data, isPending, error, refetch } = useDepartments();
  const [editing, setEditing] = useState<Department | null>(null);
  const [open, setOpen] = useState(false);
  const [statusFilter, setStatusFilter] = useState<StatusFilter[]>([]);
  const list = data ?? [];

  const statusCounts = useMemo(
    () => ({
      active: list.filter(d => d.isActive).length,
      inactive: list.filter(d => !d.isActive).length,
    }),
    [list]
  );

  const filtered = useMemo(() => {
    if (statusFilter.length === 0) return list;
    return list.filter(d => {
      const status: StatusFilter = d.isActive ? "active" : "inactive";
      return statusFilter.includes(status);
    });
  }, [list, statusFilter]);

  const { page, pageCount, total, pageSize, pageItems, setPage, resetPage } =
    useClientPagination(filtered);

  useEffect(() => {
    resetPage();
  }, [statusFilter, resetPage]);

  const openDialog = (dept: Department | null) => {
    setEditing(dept);
    setOpen(true);
  };

  return (
    <div>
      <PageHeader
        title="Setores"
        description="Áreas internas responsáveis pelas ordens de serviço."
        actions={
          <div className="flex flex-wrap items-center gap-2">
            <FiltersDialog
              title="Situação"
              value={statusFilter}
              onApply={setStatusFilter}
              options={[
                { value: "active", label: "Ativos", count: statusCounts.active },
                { value: "inactive", label: "Inativos", count: statusCounts.inactive },
              ]}
            />
            {can("departments.create") && (
              <Button size="sm" onClick={() => openDialog(null)}>
                <Plus className="h-4 w-4" /> Novo setor
              </Button>
            )}
          </div>
        }
      />
      {isPending ? (
        <TableSkeleton columns={HEADERS.length} headers={HEADERS} rows={4} />
      ) : error ? (
        <ErrorState message={error.message} onRetry={() => refetch()} />
      ) : filtered.length === 0 ? (
        <EmptyState icon={Building2} title="Nenhum setor cadastrado" />
      ) : (
        <>
          <div className="border rounded-md bg-card overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>{HEADERS.map(h => <TableHead key={h}>{h}</TableHead>)}</TableRow>
              </TableHeader>
              <TableBody>
                {pageItems.map(d => (
                  <TableRow key={d.id}>
                    <TableCell className="font-medium">{d.name}</TableCell>
                    <TableCell className="text-muted-foreground">{d.description || "—"}</TableCell>
                    <TableCell>{d.manager?.name ?? "—"}</TableCell>
                    <TableCell>
                      <Badge variant="outline" className={`rounded-sm ${d.isActive ? "border-emerald-200 bg-emerald-50 text-emerald-800" : "bg-muted text-muted-foreground"}`}>
                        {d.isActive ? "Ativo" : "Inativo"}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      {can("departments.update") && (
                        <Button variant="ghost" size="sm" onClick={() => openDialog(d)}>Editar</Button>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
          <ListPagination page={page} pageCount={pageCount} total={total} pageSize={pageSize} onPageChange={setPage} />
        </>
      )}
      <DepartmentDialog open={open} department={editing} onOpenChange={setOpen} />
    </div>
  );
}
