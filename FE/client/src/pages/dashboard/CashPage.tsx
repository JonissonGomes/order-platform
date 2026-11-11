import { CashEntryForm } from "@/components/cash/CashEntryForm";
import { CashMovementsList } from "@/components/cash/CashMovementsList";
import { CashSessionPanel } from "@/components/cash/CashSessionPanel";
import { QuickSale } from "@/components/cash/QuickSale";
import { ErrorState } from "@/components/zts/EmptyState";
import { PageHeader } from "@/components/zts/PageHeader";
import { useCashMovements, useCashSession } from "@/hooks/queries";
import { usePermissions } from "@/hooks/usePermissions";

export default function CashPage() {
  const { can } = usePermissions();
  const current = useCashSession();
  const session = current.data?.session ?? null;
  const isOpen = session?.status === "open";
  const movements = useCashMovements(session?.id);

  return (
    <div className="max-w-6xl mx-auto">
      <PageHeader title="Caixa" description="Abertura, vendas de balcão, sangrias e fechamento." />

      {current.error && (
        <div className="mb-4">
          <ErrorState message={current.error.message} onRetry={() => current.refetch()} />
        </div>
      )}

      <div className="grid gap-4 lg:grid-cols-5">
        <div className="lg:col-span-3 space-y-4">
          <QuickSale disabled={!isOpen || !can("cash.sale")} />
          <div>
            <h2 className="zts-eyebrow mb-2">Lançamentos da sessão</h2>
            <CashMovementsList
              movements={movements.data ?? []}
              loading={current.isPending || movements.isLoading}
            />
          </div>
        </div>
        <div className="lg:col-span-2 space-y-4">
          <CashSessionPanel
            session={session}
            summary={current.data?.summary}
            loading={current.isPending}
            canOpen={can("cash.open")}
            canClose={can("cash.close")}
          />
          <CashEntryForm disabled={!isOpen} />
        </div>
      </div>
    </div>
  );
}
