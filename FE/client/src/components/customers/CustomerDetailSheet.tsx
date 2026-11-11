import { Badge } from "@/components/ui/badge";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { StatusBadge } from "@/components/zts/StatusBadge";
import { useServiceOrders } from "@/hooks/queries";
import { formatCurrency, formatPhone } from "@/lib/format";
import { orderValue } from "@/lib/reports";
import type { Customer } from "@/types";
import { useMemo } from "react";

export function CustomerDetailSheet({
  customer,
  onOpenChange,
}: {
  customer: Customer | null;
  onOpenChange: (open: boolean) => void;
}) {
  const orders = useServiceOrders();

  const history = useMemo(() => {
    if (!customer) return [];
    return (orders.data ?? [])
      .filter(o => o.customerId === customer.id || o.customer?.id === customer.id)
      .sort((a, b) => +new Date(b.createdAt) - +new Date(a.createdAt));
  }, [orders.data, customer]);

  const spent = history
    .filter(o => o.status === "delivered")
    .reduce((sum, o) => sum + orderValue(o), 0);

  const last4 = customer?.phone ? formatPhone(customer.phone).replace(/\D/g, "").slice(-4) : "";

  return (
    <Sheet open={Boolean(customer)} onOpenChange={onOpenChange}>
      <SheetContent className="w-full sm:max-w-md overflow-y-auto p-0 gap-0">
        {customer && (
          <>
            <SheetHeader className="border-b p-4">
              <SheetTitle>{customer.name}</SheetTitle>
              <SheetDescription className="font-mono">
                {formatPhone(customer.phone)}
              </SheetDescription>
            </SheetHeader>

            <div className="p-4 space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div className="border rounded-md p-3">
                  <p className="zts-eyebrow">OS</p>
                  <p className="text-lg font-semibold tabular-nums">{history.length}</p>
                </div>
                <div className="border rounded-md p-3">
                  <p className="zts-eyebrow">Total em serviços</p>
                  <p className="text-lg font-semibold tabular-nums">{formatCurrency(spent)}</p>
                </div>
              </div>

              <div className="border rounded-md bg-muted/40 p-3 text-sm">
                Acesso ao portal: nº da OS e final{" "}
                <Badge variant="outline" className="rounded-sm font-mono">
                  {last4 || "????"}
                </Badge>
              </div>

              <section>
                <h3 className="zts-eyebrow mb-2">Histórico de serviços</h3>
                {history.length === 0 ? (
                  <p className="text-sm text-muted-foreground">Nenhuma OS ainda.</p>
                ) : (
                  <ul className="divide-y border rounded-md">
                    {history.map(o => (
                      <li key={o.id} className="flex items-center justify-between gap-3 px-3 py-2.5">
                        <div className="min-w-0">
                          <p className="text-sm font-medium truncate">
                            #{o.orderNumber} · {o.productBrand} {o.productModel}
                          </p>
                          <p className="text-xs text-muted-foreground truncate">
                            {o.serviceType || "Serviço"}
                          </p>
                        </div>
                        <StatusBadge status={o.status} />
                      </li>
                    ))}
                  </ul>
                )}
              </section>
            </div>
          </>
        )}
      </SheetContent>
    </Sheet>
  );
}
