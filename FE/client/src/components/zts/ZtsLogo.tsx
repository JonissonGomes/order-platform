import { cn } from "@/lib/utils";

interface ZtsLogoProps {
  subtitle?: string;
  collapsed?: boolean;
  tone?: "light" | "dark";
  className?: string;
}

/** Marca ZTS: bloco quadrado com monograma + subtítulo. */
export function ZtsLogo({ subtitle, collapsed, tone = "dark", className }: ZtsLogoProps) {
  const light = tone === "light";
  return (
    <div className={cn("flex items-center gap-2.5 min-w-0", className)}>
      <div
        className={cn(
          "h-8 w-8 shrink-0 rounded-sm flex items-center justify-center font-bold text-[0.8rem] tracking-tight",
          light ? "bg-white text-[#1a1f26]" : "bg-primary text-primary-foreground"
        )}
        aria-hidden
      >
        ZTS
      </div>
      {!collapsed && (
        <div className="min-w-0 leading-tight">
          <p className={cn("text-sm font-semibold tracking-tight truncate", light && "text-white")}>
            ZTS Cell
          </p>
          {subtitle && (
            <p className={cn("text-[0.6875rem] truncate", light ? "text-slate-400" : "text-muted-foreground")}>
              {subtitle}
            </p>
          )}
        </div>
      )}
    </div>
  );
}
