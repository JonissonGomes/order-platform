import { CashEntryForm } from "@/components/cash/CashEntryForm";
import { CashMovementsList } from "@/components/cash/CashMovementsList";
import { CashSessionPanel } from "@/components/cash/CashSessionPanel";
import { QuickSale } from "@/components/cash/QuickSale";
import { ErrorState } from "@/components/zts/EmptyState";
import { PageHeader } from "@/components/zts/PageHeader";
import { useCashMovements, useCashSession } from "@/hooks/queries";
import { usePermissions } from "@/hooks/usePermissions";

/**
 * Fluxo do caixa:
 * 1) status / abrir-fechar no topo
 * 2) venda rápida (ação principal) + lançamentos auxiliares
 * 3) histórico da sessão em largura total
 */
export default function CashPage() {
  const { can } = usePermissions();
  const current = useCashSession();
  const session = current.data?.session ?? null;
  const isOpen = session?.status === "open";
  const movements = useCashMovements(session?.id);

  return (
    <div className="space-y-4">
      <PageHeader title="Caixa" description="Abertura, vendas de balcão, sangrias e fechamento." />

      {current.error && (
        <ErrorState message={current.error.message} onRetry={() => current.refetch()} />
      )}

      <CashSessionPanel
        session={session}
        summary={current.data?.summary}
        loading={current.isPending}
        canOpen={can("cash.open")}
        canClose={can("cash.close")}
      />

      <div className="grid gap-4 lg:grid-cols-[minmax(0,1.4fr)_minmax(16rem,22rem)] lg:items-start">
        <QuickSale disabled={!isOpen || !can("cash.sale")} />
        <CashEntryForm disabled={!isOpen} />
      </div>

      <section>
        <h2 className="zts-eyebrow mb-2">Lançamentos da sessão</h2>
        <CashMovementsList
          movements={movements.data ?? []}
          loading={current.isPending || movements.isLoading}
        />
      </section>
    </div>
  );
}
