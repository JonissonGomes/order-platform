import DashboardLayout from "@/components/DashboardLayout";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { api } from "@/lib/api";
import type { CashFlowEntry, Transaction } from "@/types";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  ArrowDownCircle,
  ArrowUpCircle,
  BadgeDollarSign,
  CheckCircle,
  Clock,
  Loader2,
  Plus,
  TrendingUp,
  Trash2,
} from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from "recharts";

// ── Constantes ────────────────────────────────────────────────────────────────

const INCOME_CATEGORIES = [
  { value: "service_order", label: "Ordem de Serviço" },
  { value: "other_income", label: "Outras Receitas" },
];

const EXPENSE_CATEGORIES = [
  { value: "parts_purchase", label: "Compra de Peças" },
  { value: "salary", label: "Salários" },
  { value: "rent", label: "Aluguel" },
  { value: "utilities", label: "Água/Luz/Internet" },
  { value: "equipment", label: "Equipamentos" },
  { value: "marketing", label: "Marketing" },
  { value: "other_expense", label: "Outras Despesas" },
];

const CATEGORY_LABELS: Record<string, string> = {
  service_order: "Ordem de Serviço",
  other_income: "Outras Receitas",
  parts_purchase: "Compra de Peças",
  salary: "Salários",
  rent: "Aluguel",
  utilities: "Água/Luz/Internet",
  equipment: "Equipamentos",
  marketing: "Marketing",
  other_expense: "Outras Despesas",
};

const PAYMENT_METHODS = [
  { value: "pix", label: "PIX" },
  { value: "dinheiro", label: "Dinheiro" },
  { value: "cartao_credito", label: "Cartão de Crédito" },
  { value: "cartao_debito", label: "Cartão de Débito" },
  { value: "boleto", label: "Boleto" },
  { value: "transferencia", label: "Transferência" },
];

const PAYMENT_LABELS: Record<string, string> = {
  pix: "PIX",
  dinheiro: "Dinheiro",
  cartao_credito: "Cartão Crédito",
  cartao_debito: "Cartão Débito",
  boleto: "Boleto",
  transferencia: "Transferência",
};

// ── Helpers ───────────────────────────────────────────────────────────────────

function formatCurrency(value: number) {
  return value.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

function currentMonth() {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
}

function formatMonth(m: string) {
  const [year, month] = m.split("-");
  const months = ["Jan", "Fev", "Mar", "Abr", "Mai", "Jun", "Jul", "Ago", "Set", "Out", "Nov", "Dez"];
  return `${months[parseInt(month) - 1]}/${year}`;
}

// ── Create Transaction Form ───────────────────────────────────────────────────

interface TransactionFormProps {
  onSave: (data: object) => void;
  onCancel: () => void;
  loading?: boolean;
}

function TransactionForm({ onSave, onCancel, loading }: TransactionFormProps) {
  const today = new Date().toISOString().split("T")[0];
  const [form, setForm] = useState({
    type: "income" as "income" | "expense",
    category: "",
    description: "",
    amount: 0,
    paymentMethod: "pix",
    referenceDate: today,
    dueDate: "",
    isPaid: true,
    notes: "",
  });

  const categories = form.type === "income" ? INCOME_CATEGORIES : EXPENSE_CATEGORIES;

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-3">
        <div>
          <Label>Tipo *</Label>
          <Select value={form.type} onValueChange={(v: "income" | "expense") => setForm((f) => ({ ...f, type: v, category: "" }))}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="income">Receita</SelectItem>
              <SelectItem value="expense">Despesa</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div>
          <Label>Categoria *</Label>
          <Select value={form.category} onValueChange={(v) => setForm((f) => ({ ...f, category: v }))}>
            <SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger>
            <SelectContent>
              {categories.map((c) => <SelectItem key={c.value} value={c.value}>{c.label}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
        <div className="col-span-2">
          <Label>Descrição *</Label>
          <Input
            value={form.description}
            onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
            placeholder="Ex: OS #0001 - Conserto iPhone 12"
          />
        </div>
        <div>
          <Label>Valor (R$) *</Label>
          <Input
            type="number"
            min={0}
            step={0.01}
            value={form.amount}
            onChange={(e) => setForm((f) => ({ ...f, amount: Number(e.target.value) }))}
          />
        </div>
        <div>
          <Label>Forma de Pagamento</Label>
          <Select value={form.paymentMethod} onValueChange={(v) => setForm((f) => ({ ...f, paymentMethod: v }))}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              {PAYMENT_METHODS.map((m) => <SelectItem key={m.value} value={m.value}>{m.label}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
        <div>
          <Label>Data de Competência</Label>
          <Input type="date" value={form.referenceDate} onChange={(e) => setForm((f) => ({ ...f, referenceDate: e.target.value }))} />
        </div>
        <div>
          <Label>Vencimento</Label>
          <Input type="date" value={form.dueDate} onChange={(e) => setForm((f) => ({ ...f, dueDate: e.target.value }))} />
        </div>
        <div className="col-span-2 flex items-center gap-3">
          <Label className="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={form.isPaid}
              onChange={(e) => setForm((f) => ({ ...f, isPaid: e.target.checked }))}
              className="rounded"
            />
            <span>Já foi pago/recebido</span>
          </Label>
        </div>
        <div className="col-span-2">
          <Label>Observações</Label>
          <Input value={form.notes} onChange={(e) => setForm((f) => ({ ...f, notes: e.target.value }))} placeholder="Opcional" />
        </div>
      </div>
      <div className="flex gap-2 justify-end">
        <Button variant="outline" onClick={onCancel} disabled={loading}>Cancelar</Button>
        <Button onClick={() => onSave(form)} disabled={loading || !form.description || !form.category || form.amount <= 0}>
          {loading ? "Salvando..." : "Salvar"}
        </Button>
      </div>
    </div>
  );
}

// (TransactionCard removed — now using table rows)

// ── Main Page ─────────────────────────────────────────────────────────────────

export default function Financial() {
  const queryClient = useQueryClient();
  const [selectedMonth, setSelectedMonth] = useState(currentMonth());
  const [typeFilter, setTypeFilter] = useState("all");
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [selectedTransaction, setSelectedTransaction] = useState<Transaction | null>(null);
  const [deletingTransaction, setDeletingTransaction] = useState<Transaction | null>(null);

  const { data: summaryData } = useQuery({
    queryKey: ["financial-summary", selectedMonth],
    queryFn: () => api.getFinancialSummary(selectedMonth),
  });

  const { data: cashFlowData } = useQuery({
    queryKey: ["cash-flow"],
    queryFn: () => api.getFinancialCashFlow(6),
  });

  const { data: transactionsData, isLoading } = useQuery({
    queryKey: ["transactions", selectedMonth, typeFilter],
    queryFn: () =>
      api.listTransactions({
        month: selectedMonth,
        type: typeFilter !== "all" ? typeFilter : undefined,
        limit: 50,
      }),
  });

  const createMutation = useMutation({
    mutationFn: (data: Parameters<typeof api.createTransaction>[0]) => api.createTransaction(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["transactions"] });
      queryClient.invalidateQueries({ queryKey: ["financial-summary"] });
      queryClient.invalidateQueries({ queryKey: ["cash-flow"] });
      toast.success("Transação registrada!");
      setShowCreateDialog(false);
    },
    onError: () => toast.error("Erro ao registrar transação"),
  });

  const markPaidMutation = useMutation({
    mutationFn: (id: string) => api.markTransactionAsPaid(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["transactions"] });
      queryClient.invalidateQueries({ queryKey: ["financial-summary"] });
      toast.success("Marcado como pago!");
    },
    onError: () => toast.error("Erro ao atualizar"),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => api.deleteTransaction(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["transactions"] });
      queryClient.invalidateQueries({ queryKey: ["financial-summary"] });
      queryClient.invalidateQueries({ queryKey: ["cash-flow"] });
      toast.success("Transação excluída");
      setDeletingTransaction(null);
      setSelectedTransaction(null);
    },
    onError: () => toast.error("Erro ao excluir"),
  });

  const summary = summaryData?.summary;
  const transactions = transactionsData?.transactions ?? [];
  const cashFlow = (cashFlowData?.cashFlow ?? []).map((e: CashFlowEntry) => ({
    ...e,
    name: formatMonth(e.month),
  }));

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h1 className="text-2xl font-bold tracking-tight">Financeiro</h1>
            <p className="text-muted-foreground text-sm">Controle de receitas e despesas</p>
          </div>
          <div className="flex gap-2">
            <Input
              type="month"
              value={selectedMonth}
              onChange={(e) => setSelectedMonth(e.target.value)}
              className="w-36"
            />
            <Button onClick={() => setShowCreateDialog(true)} className="gap-2">
              <Plus className="h-4 w-4" /> Lançamento
            </Button>
          </div>
        </div>

        {/* Summary Cards */}
        {summary && (
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <Card>
              <CardContent className="p-4">
                <div className="flex items-center gap-2">
                  <ArrowUpCircle className="h-5 w-5 text-green-600" />
                  <div>
                    <p className="text-xs text-muted-foreground">Receitas</p>
                    <p className="text-xl font-bold text-green-600">{formatCurrency(summary.totalIncome)}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4">
                <div className="flex items-center gap-2">
                  <ArrowDownCircle className="h-5 w-5 text-red-500" />
                  <div>
                    <p className="text-xs text-muted-foreground">Despesas</p>
                    <p className="text-xl font-bold text-red-500">{formatCurrency(summary.totalExpense)}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4">
                <div className="flex items-center gap-2">
                  <BadgeDollarSign className={`h-5 w-5 ${summary.balance >= 0 ? "text-primary" : "text-red-500"}`} />
                  <div>
                    <p className="text-xs text-muted-foreground">Saldo</p>
                    <p className={`text-xl font-bold ${summary.balance >= 0 ? "text-primary" : "text-red-500"}`}>
                      {formatCurrency(summary.balance)}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4">
                <div className="flex items-center gap-2">
                  <Clock className="h-5 w-5 text-yellow-600" />
                  <div>
                    <p className="text-xs text-muted-foreground">A Receber</p>
                    <p className="text-xl font-bold text-yellow-600">{formatCurrency(summary.pendingIncome)}</p>
                    <p className="text-xs text-muted-foreground">A Pagar: {formatCurrency(summary.pendingExpense)}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        {/* Cash Flow Chart */}
        {cashFlow.length > 0 && (
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="flex items-center gap-2 text-base">
                <TrendingUp className="h-4 w-4" /> Fluxo de Caixa — Últimos 6 Meses
              </CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={220}>
                <BarChart data={cashFlow} margin={{ top: 4, right: 4, left: 0, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" className="opacity-30" />
                  <XAxis dataKey="name" tick={{ fontSize: 12 }} />
                  <YAxis tick={{ fontSize: 11 }} tickFormatter={(v) => `R$${(v / 1000).toFixed(0)}k`} />
                  <Tooltip
                    formatter={(value: number) => formatCurrency(value)}
                    labelStyle={{ fontWeight: "bold" }}
                  />
                  <Legend />
                  <Bar dataKey="income" name="Receita" fill="#22c55e" radius={[4, 4, 0, 0]} />
                  <Bar dataKey="expense" name="Despesa" fill="#ef4444" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        )}

        {/* Transactions Table */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">
              Lançamentos de {formatMonth(selectedMonth)}
            </h2>
            <Select value={typeFilter} onValueChange={setTypeFilter}>
              <SelectTrigger className="w-32 h-8 text-xs">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos</SelectItem>
                <SelectItem value="income">Receitas</SelectItem>
                <SelectItem value="expense">Despesas</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {isLoading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
          ) : transactions.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground border rounded-md">
              <BadgeDollarSign className="h-10 w-10 mx-auto mb-2 opacity-30" />
              <p className="text-sm">Nenhum lançamento neste período.</p>
            </div>
          ) : (
            <div className="rounded-md border overflow-hidden">
              <Table>
                <TableHeader>
                  <TableRow className="bg-muted/50">
                    <TableHead>Tipo</TableHead>
                    <TableHead>Descrição</TableHead>
                    <TableHead className="hidden sm:table-cell">Categoria</TableHead>
                    <TableHead className="hidden md:table-cell">Pagamento</TableHead>
                    <TableHead className="hidden md:table-cell">Data</TableHead>
                    <TableHead>Valor</TableHead>
                    <TableHead>Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {transactions.map((t) => {
                    const isIncome = t.type === "income";
                    return (
                      <TableRow
                        key={t.id}
                        className="cursor-pointer hover:bg-muted/50 transition-colors"
                        onClick={() => setSelectedTransaction(t)}
                      >
                        <TableCell>
                          <div className={`p-1.5 rounded-full w-fit ${isIncome ? "bg-green-100" : "bg-red-100"}`}>
                            {isIncome
                              ? <ArrowUpCircle className="h-3.5 w-3.5 text-green-600" />
                              : <ArrowDownCircle className="h-3.5 w-3.5 text-red-500" />
                            }
                          </div>
                        </TableCell>
                        <TableCell className="font-medium text-sm max-w-[180px] truncate">{t.description}</TableCell>
                        <TableCell className="hidden sm:table-cell text-sm text-muted-foreground">
                          {CATEGORY_LABELS[t.category] ?? t.category}
                        </TableCell>
                        <TableCell className="hidden md:table-cell text-sm text-muted-foreground">
                          {PAYMENT_LABELS[t.paymentMethod] ?? t.paymentMethod}
                        </TableCell>
                        <TableCell className="hidden md:table-cell text-sm text-muted-foreground">
                          {new Date(t.referenceDate).toLocaleDateString("pt-BR")}
                        </TableCell>
                        <TableCell className={`font-semibold text-sm ${isIncome ? "text-green-600" : "text-red-500"}`}>
                          {isIncome ? "+" : "-"}{formatCurrency(t.amount)}
                        </TableCell>
                        <TableCell>
                          {t.isPaid
                            ? <Badge className="text-xs bg-green-100 text-green-700 border-green-200">Pago</Badge>
                            : <Badge variant="secondary" className="text-xs">Pendente</Badge>
                          }
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
          )}
        </div>
      </div>

      {/* Transaction Detail Modal */}
      {selectedTransaction && (
        <Dialog open={!!selectedTransaction} onOpenChange={(open) => !open && setSelectedTransaction(null)}>
          <DialogContent className="max-w-md max-h-[90vh] flex flex-col">
            <DialogHeader className="px-6 pt-6 pb-4 border-b">
              <DialogTitle className="text-xl flex items-center gap-2">
                {selectedTransaction.type === "income"
                  ? <ArrowUpCircle className="h-5 w-5 text-green-600" />
                  : <ArrowDownCircle className="h-5 w-5 text-red-500" />
                }
                {selectedTransaction.description}
              </DialogTitle>
            </DialogHeader>
            <div className="flex-1 overflow-y-auto px-6 py-6">
              <div className="space-y-4 text-sm">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <p className="text-xs text-muted-foreground uppercase tracking-wide">Tipo</p>
                  <p className="mt-1 font-medium">{selectedTransaction.type === "income" ? "Receita" : "Despesa"}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground uppercase tracking-wide">Valor</p>
                  <p className={`mt-1 font-bold ${selectedTransaction.type === "income" ? "text-green-600" : "text-red-500"}`}>
                    {selectedTransaction.type === "income" ? "+" : "-"}{formatCurrency(selectedTransaction.amount)}
                  </p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground uppercase tracking-wide">Categoria</p>
                  <p className="mt-1">{CATEGORY_LABELS[selectedTransaction.category] ?? selectedTransaction.category}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground uppercase tracking-wide">Pagamento</p>
                  <p className="mt-1">{PAYMENT_LABELS[selectedTransaction.paymentMethod] ?? selectedTransaction.paymentMethod}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground uppercase tracking-wide">Competência</p>
                  <p className="mt-1">{new Date(selectedTransaction.referenceDate).toLocaleDateString("pt-BR")}</p>
                </div>
                {selectedTransaction.dueDate && (
                  <div>
                    <p className="text-xs text-muted-foreground uppercase tracking-wide">Vencimento</p>
                    <p className="mt-1">{new Date(selectedTransaction.dueDate).toLocaleDateString("pt-BR")}</p>
                  </div>
                )}
              </div>
              {selectedTransaction.notes && (
                <div>
                  <p className="text-xs text-muted-foreground uppercase tracking-wide">Observações</p>
                  <p className="mt-1 text-muted-foreground">{selectedTransaction.notes}</p>
                </div>
              )}
              <div>
                <p className="text-xs text-muted-foreground uppercase tracking-wide">Status</p>
                <div className="mt-1">
                  {selectedTransaction.isPaid
                    ? <Badge className="bg-green-100 text-green-700 border-green-200">Pago / Recebido</Badge>
                    : <Badge variant="secondary">Pendente</Badge>
                  }
                </div>
              </div>
              <Separator />
              </div>
            </div>
            <div className="px-6 py-4 border-t bg-muted/30 flex justify-between items-center">
              <Button
                variant="destructive"
                size="sm"
                  onClick={() => { setDeletingTransaction(selectedTransaction); setSelectedTransaction(null); }}
                >
                  <Trash2 className="h-4 w-4 mr-1" /> Excluir
                </Button>
                <div className="flex gap-2">
                  {!selectedTransaction.isPaid && (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => { markPaidMutation.mutate(selectedTransaction.id); setSelectedTransaction(null); }}
                    >
                      <CheckCircle className="h-4 w-4 mr-1 text-green-600" /> Marcar como Pago
                    </Button>
                  )}
                </div>
              </div>
          </DialogContent>
        </Dialog>
      )}

      {/* Delete Confirmation */}
      <AlertDialog open={!!deletingTransaction} onOpenChange={(open) => !open && setDeletingTransaction(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirmar Exclusão</AlertDialogTitle>
            <AlertDialogDescription>
              Tem certeza que deseja excluir o lançamento <strong>"{deletingTransaction?.description}"</strong>? Esta ação não pode ser desfeita.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={() => deletingTransaction && deleteMutation.mutate(deletingTransaction.id)}
            >
              {deleteMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : "Excluir"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Create Dialog */}
      <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
        <DialogContent className="max-w-lg">
          <DialogHeader><DialogTitle>Novo Lançamento</DialogTitle></DialogHeader>
          <TransactionForm
            onSave={(data) => createMutation.mutate(data as Parameters<typeof api.createTransaction>[0])}
            onCancel={() => setShowCreateDialog(false)}
            loading={createMutation.isPending}
          />
        </DialogContent>
      </Dialog>
    </DashboardLayout>
  );
}
