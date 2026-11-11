import { Badge } from "@/components/ui/badge";
import { ORDER_STATUS } from "@/lib/orderStatus";
import { cn } from "@/lib/utils";
import type { ServiceOrderStatus } from "@/types";

export function StatusBadge({
  status,
  className,
}: {
  status: ServiceOrderStatus | string;
  className?: string;
}) {
  const meta = ORDER_STATUS[status as ServiceOrderStatus];
  return (
    <Badge
      variant="outline"
      className={cn("rounded-sm font-medium", meta?.className, className)}
    >
      {meta?.label ?? status}
    </Badge>
  );
}
