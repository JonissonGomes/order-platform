import { CashEntryForm } from "@/components/cash/CashEntryForm";
import { CashMovementsList } from "@/components/cash/CashMovementsList";
import { CashSessionPanel } from "@/components/cash/CashSessionPanel";
import { QuickSale } from "@/components/cash/QuickSale";
import { ErrorState } from "@/components/zts/EmptyState";
import { useCashMovements, useCashSession } from "@/hooks/queries";
import { usePermissions } from "@/hooks/usePermissions";

/**
 * Layout: coluna esquerda (status + venda) | coluna direita (outros lançamentos).
 * Histórico em largura total abaixo.
 */
export default function CashPage() {
  const { can } = usePermissions();
  const current = useCashSession();
  const session = current.data?.session ?? null;
  const isOpen = session?.status === "open";
  const movements = useCashMovements(session?.id);

  return (
    <div className="space-y-4">
      {current.error && (
        <ErrorState message={current.error.message} onRetry={() => current.refetch()} />
      )}

      <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_minmax(16rem,22rem)] lg:items-stretch">
        <div className="space-y-4 min-w-0">
          <CashSessionPanel
            session={session}
            summary={current.data?.summary}
            loading={current.isPending}
            canOpen={can("cash.open")}
            canClose={can("cash.close")}
          />
          <QuickSale disabled={!isOpen || !can("cash.sale")} />
        </div>
        <div className="min-w-0 lg:h-full">
          <CashEntryForm disabled={!isOpen} />
        </div>
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
