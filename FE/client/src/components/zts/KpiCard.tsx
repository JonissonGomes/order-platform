import { Card } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";
import type { LucideIcon } from "lucide-react";

interface KpiCardProps {
  label: string;
  value?: string | number;
  hint?: string;
  icon: LucideIcon;
  loading?: boolean;
  tone?: "default" | "warning" | "danger";
}

export function KpiCard({ label, value, hint, icon: Icon, loading, tone = "default" }: KpiCardProps) {
  return (
    <Card
      className={cn(
        "gap-2 py-4 px-4 border-l-2",
        tone === "default" && "border-l-primary",
        tone === "warning" && "border-l-amber-500",
        tone === "danger" && "border-l-destructive"
      )}
    >
      <div className="flex items-center justify-between">
        <span className="zts-eyebrow">{label}</span>
        <Icon className="h-4 w-4 text-muted-foreground" />
      </div>
      {loading ? (
        <>
          <Skeleton className="h-8 w-24" />
          <Skeleton className="h-3 w-32" />
        </>
      ) : (
        <>
          <div className="text-2xl font-semibold tracking-tight tabular-nums">{value ?? "—"}</div>
          {hint && <p className="text-xs text-muted-foreground">{hint}</p>}
        </>
      )}
    </Card>
  );
}
