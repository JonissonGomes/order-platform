import DashboardLayout from "@/components/DashboardLayout";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { api } from "@/lib/api";
import { useAuth } from "@/_core/hooks/useAuth";
import { usePermissions } from "@/lib/permissions";
import type { Department, PreOrder, PreOrderStatus } from "@/types";
import { CheckCircle2, Loader2, Pencil, Plus, Printer } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { useLocation } from "wouter";

const statusLabels: Record<PreOrderStatus, string> = {
  approved: "Aprovada",
  evaluating: "Em Avaliação",
  converted: "Convertida",
  cancelled: "Cancelada",
};

const statusColors: Record<PreOrderStatus, string> = {
  approved: "bg-blue-100 text-blue-800",
  evaluating: "bg-yellow-100 text-yellow-800",
  converted: "bg-green-100 text-green-800",
  cancelled: "bg-red-100 text-red-800",
};

export default function PreOrders() {
  const { user } = useAuth();
  const permissions = usePermissions("/pre-orders");
  const [, setLocation] = useLocation();

  const [preOrders, setPreOrders] = useState<PreOrder[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState<"all" | PreOrderStatus>("evaluating");
  const [searchTerm, setSearchTerm] = useState("");

  const [departments, setDepartments] = useState<Department[]>([]);
  const [approvingPreOrder, setApprovingPreOrder] = useState<PreOrder | null>(null);
  const [selectedDepartmentId, setSelectedDepartmentId] = useState<string>("");
  const [submitting, setSubmitting] = useState(false);

  const loadDepartments = async () => {
    try {
      const res = await api.listDepartments({ isActive: true });
      setDepartments(res.departments || []);
    } catch {
      // ignore
    }
  };

  const loadPreOrders = async () => {
    try {
      setLoading(true);
      const res = await api.listPreOrders({
        page: 1,
        limit: 100,
        status: statusFilter === "all" ? undefined : statusFilter,
      });
      setPreOrders(res.preOrders as PreOrder[] || []);
    } catch (err: any) {
      if (err?.message && err.message.includes("status: 404")) {
        setPreOrders([]);
        return;
      }
      toast.error(err?.message || "Erro ao carregar pré-ordens");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadDepartments();
  }, []);

  useEffect(() => {
    loadPreOrders();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [statusFilter]);

  const filtered = useMemo(() => {
    const term = searchTerm.trim().toLowerCase();
    if (!term) return preOrders;
    return preOrders.filter((po) => {
      return (
        po.preOrderNumber?.toLowerCase().includes(term) ||
        po.equipmentText?.toLowerCase().includes(term) ||
        po.problemDescription?.toLowerCase().includes(term) ||
        po.customerPhone?.toLowerCase().includes(term)
      );
    });
  }, [preOrders, searchTerm]);

  const openApprove = (po: PreOrder) => {
    setApprovingPreOrder(po);
    setSelectedDepartmentId(po.departmentId || "");
  };

  const handleApprove = async () => {
    if (!approvingPreOrder) return;
    if (!selectedDepartmentId) {
      toast.error("Selecione um departamento");
      return;
    }
    try {
      setSubmitting(true);
      await api.approvePreOrder(approvingPreOrder.id, {
        status: "approved",
        departmentId: selectedDepartmentId,
      });
      toast.success("Ordem de serviço gerada com sucesso!");
      setApprovingPreOrder(null);
      setSelectedDepartmentId("");
      await loadPreOrders();
    } catch (err: any) {
      toast.error(err?.message || "Erro ao aprovar pré-ordem");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <DashboardLayout>
      <div className="space-y-6 w-full min-w-0">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Pré-ordens</h1>
            <p className="text-muted-foreground">Gerencie pré-ordens e converta em ordens de serviço</p>
          </div>
        </div>

        <div className="flex flex-col sm:flex-row gap-2">
          <div className="relative flex-1">
            <Input
              placeholder="Buscar por pré-ordem, equipamento, defeito ou telefone..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-3"
            />
          </div>
          <Select value={statusFilter} onValueChange={(v) => setStatusFilter(v as any)}>
            <SelectTrigger className="w-full sm:w-[220px]">
              <SelectValue placeholder="Status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos</SelectItem>
              {(Object.entries(statusLabels) as [PreOrderStatus, string][]).map(([value, label]) => (
                <SelectItem key={value} value={value}>
                  {label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
          </div>
        ) : filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12 text-muted-foreground gap-3">
            <Plus className="h-12 w-12 opacity-30" />
            <p>Nenhuma pré-ordem encontrada</p>
          </div>
        ) : (
          <div className="rounded-md border overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow className="bg-muted/50">
                  <TableHead className="w-[170px]">Pré-ordem</TableHead>
                  <TableHead>Equipamento</TableHead>
                  <TableHead>Telefone</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="w-[220px]">Ação</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.map((po) => (
                  <TableRow key={po.id}>
                    <TableCell className="font-medium">{po.preOrderNumber}</TableCell>
                    <TableCell>
                      <div className="max-w-[420px] truncate" title={po.equipmentText}>
                        {po.equipmentText}
                      </div>
                    </TableCell>
                    <TableCell>{po.customerPhone}</TableCell>
                    <TableCell>
                      <Badge className={statusColors[po.status] || ""} variant="secondary">
                        {statusLabels[po.status] || po.status}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      {po.status === "converted" && po.convertedToOSId ? (
                        <Button
                          variant="secondary"
                          size="sm"
                          onClick={() => setLocation(`/print/order/${po.convertedToOSId}`)}
                        >
                          <Printer className="mr-2 h-4 w-4" />
                          Imprimir
                        </Button>
                      ) : (
                        <Button
                          size="sm"
                          disabled={!permissions.canEdit}
                          onClick={() => openApprove(po)}
                        >
                          <Pencil className="mr-2 h-4 w-4" />
                          Aprovar
                        </Button>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}

        <Dialog open={!!approvingPreOrder} onOpenChange={(o) => !o && setApprovingPreOrder(null)}>
          <DialogContent className="max-w-2xl">
            {approvingPreOrder ? (
              <>
                <DialogHeader>
                  <DialogTitle className="text-xl">Aprovar e gerar ordem</DialogTitle>
                  <DialogDescription>
                    Confirme o departamento para converter a pré-ordem.
                  </DialogDescription>
                </DialogHeader>

                <div className="space-y-4">
                  <div className="rounded-md border p-3 bg-muted/30">
                    <p className="text-sm font-semibold">{approvingPreOrder.equipmentText}</p>
                    <p className="text-xs text-muted-foreground mt-1">
                      Defeito: {approvingPreOrder.problemDescription}
                    </p>
                  </div>

                  <div className="space-y-2">
                    <Label>Departamento</Label>
                    <Select value={selectedDepartmentId} onValueChange={setSelectedDepartmentId}>
                      <SelectTrigger>
                        <SelectValue placeholder="Selecione um departamento" />
                      </SelectTrigger>
                      <SelectContent>
                        {departments.map((d) => (
                          <SelectItem key={d.id} value={d.id}>
                            {d.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="flex items-center gap-3 justify-end pt-2">
                    <Button
                      variant="secondary"
                      type="button"
                      onClick={() => setApprovingPreOrder(null)}
                      disabled={submitting}
                    >
                      Cancelar
                    </Button>
                    <Button type="button" onClick={handleApprove} disabled={submitting || !permissions.canEdit}>
                      {submitting ? (
                        <>
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                          Gerando...
                        </>
                      ) : (
                        <>
                          <CheckCircle2 className="mr-2 h-4 w-4" />
                          Aprovar e Gerar Ordem
                        </>
                      )}
                    </Button>
                  </div>
                </div>
              </>
            ) : null}
          </DialogContent>
        </Dialog>
      </div>
    </DashboardLayout>
  );
}

