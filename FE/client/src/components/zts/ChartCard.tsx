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
  /** Altura da área do gráfico quando há dados (padrão 16rem). */
  chartHeightClassName?: string;
  children: ReactNode;
}

/** Cartão de gráfico com skeleton e estado vazio compacto. */
export function ChartCard({
  title,
  loading,
  empty,
  emptyLabel = "Sem dados no período",
  className,
  chartHeightClassName = "h-64",
  children,
}: ChartCardProps) {
  const showChart = !loading && !empty;

  return (
    <Card className={cn("gap-3 py-4", className)}>
      <CardHeader className="px-4">
        <CardTitle className="text-sm">{title}</CardTitle>
      </CardHeader>
      <CardContent
        className={cn(
          "px-4",
          loading || showChart ? chartHeightClassName : "py-1"
        )}
      >
        {loading ? (
          <Skeleton className="h-full w-full" />
        ) : empty ? (
          <div className="h-full min-h-16 flex items-center justify-center">
            <p className="text-xs text-muted-foreground text-center px-2">{emptyLabel}</p>
          </div>
        ) : (
          children
        )}
      </CardContent>
    </Card>
  );
}
