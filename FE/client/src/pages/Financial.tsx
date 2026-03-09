import DashboardLayout from "@/components/DashboardLayout";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
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
import { api } from "@/lib/api";
import type { CashFlowEntry, Transaction } from "@/types";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  ArrowDownCircle,
  ArrowUpCircle,
  BadgeDollarSign,
  CheckCircle,
  Clock,
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

// ── Transaction Card ──────────────────────────────────────────────────────────

interface TransactionCardProps {
  transaction: Transaction;
  onMarkPaid: (id: string) => void;
  onDelete: (id: string) => void;
}

function TransactionCard({ transaction: t, onMarkPaid, onDelete }: TransactionCardProps) {
  const isIncome = t.type === "income";
  return (
    <div className="flex items-center gap-3 p-3 border rounded-lg hover:bg-muted/30 transition-colors">
      <div className={`p-2 rounded-full ${isIncome ? "bg-green-100" : "bg-red-100"}`}>
        {isIncome
          ? <ArrowUpCircle className="h-4 w-4 text-green-600" />
          : <ArrowDownCircle className="h-4 w-4 text-red-500" />
        }
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium truncate">{t.description}</p>
        <p className="text-xs text-muted-foreground">
          {CATEGORY_LABELS[t.category] ?? t.category} · {PAYMENT_LABELS[t.paymentMethod] ?? t.paymentMethod}
          {" · "}{new Date(t.referenceDate).toLocaleDateString("pt-BR")}
        </p>
      </div>
      <div className="flex items-center gap-2 shrink-0">
        <span className={`font-semibold text-sm ${isIncome ? "text-green-600" : "text-red-500"}`}>
          {isIncome ? "+" : "-"}{formatCurrency(t.amount)}
        </span>
        {t.isPaid ? (
          <Badge variant="default" className="text-xs bg-green-100 text-green-700 border-green-200">Pago</Badge>
        ) : (
          <Badge variant="secondary" className="text-xs">Pendente</Badge>
        )}
        {!t.isPaid && (
          <Button size="sm" variant="ghost" className="h-7 w-7 p-0" title="Marcar como pago" onClick={() => onMarkPaid(t.id)}>
            <CheckCircle className="h-4 w-4 text-green-600" />
          </Button>
        )}
        <Button size="sm" variant="ghost" className="h-7 w-7 p-0 text-destructive hover:text-destructive" onClick={() => onDelete(t.id)}>
          <Trash2 className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
}

// ── Main Page ─────────────────────────────────────────────────────────────────

export default function Financial() {
  const queryClient = useQueryClient();
  const [selectedMonth, setSelectedMonth] = useState(currentMonth());
  const [typeFilter, setTypeFilter] = useState("all");
  const [showCreateDialog, setShowCreateDialog] = useState(false);

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

        {/* Transactions */}
        <Card>
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-base">Lançamentos de {formatMonth(selectedMonth)}</CardTitle>
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
          </CardHeader>
          <CardContent className="space-y-2">
            {isLoading ? (
              <p className="text-sm text-muted-foreground">Carregando...</p>
            ) : transactions.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <BadgeDollarSign className="h-10 w-10 mx-auto mb-2 opacity-30" />
                <p className="text-sm">Nenhum lançamento neste período.</p>
              </div>
            ) : (
              transactions.map((t) => (
                <TransactionCard
                  key={t.id}
                  transaction={t}
                  onMarkPaid={(id) => markPaidMutation.mutate(id)}
                  onDelete={(id) => deleteMutation.mutate(id)}
                />
              ))
            )}
          </CardContent>
        </Card>
      </div>

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
