import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";
import type { ReactNode } from "react";

interface ChartCardProps {
  title: string;
  loading?: boolean;
  empty?: boolean;
  emptyLabel?: string;
  className?: string;
  children: ReactNode;
}

/** Cartão de gráfico com skeleton e estado vazio padronizados. */
export function ChartCard({ title, loading, empty, emptyLabel = "Sem dados no período", className, children }: ChartCardProps) {
  return (
    <Card className={cn("gap-3 py-4", className)}>
      <CardHeader className="px-4">
        <CardTitle className="text-sm">{title}</CardTitle>
      </CardHeader>
      <CardContent className="px-4 h-64">
        {loading ? (
          <Skeleton className="h-full w-full" />
        ) : empty ? (
          <div className="h-full flex items-center justify-center text-xs text-muted-foreground border border-dashed rounded-sm">
            {emptyLabel}
          </div>
        ) : (
          children
        )}
      </CardContent>
    </Card>
  );
}
