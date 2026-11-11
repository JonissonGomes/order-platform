import { cn } from "@/lib/utils";

export interface ChipOption<T extends string> {
  value: T;
  label: string;
  count?: number;
}

interface FilterChipsProps<T extends string> {
  options: ChipOption<T>[];
  value: T | "all";
  onChange: (value: T | "all") => void;
  allLabel?: string;
  /** Exibe o chip "Todas" (padrão: true). */
  showAll?: boolean;
}

/** Filtros em formato de chip retangular (rounded-sm, sem pill). */
export function FilterChips<T extends string>({
  options,
  value,
  onChange,
  allLabel = "Todas",
  showAll = true,
}: FilterChipsProps<T>) {
  const items: ChipOption<T | "all">[] = showAll
    ? [{ value: "all", label: allLabel }, ...options]
    : options;
  return (
    <div className="flex flex-wrap gap-1.5" role="tablist">
      {items.map(item => {
        const active = item.value === value;
        return (
          <button
            key={item.value}
            type="button"
            role="tab"
            aria-selected={active}
            onClick={() => onChange(item.value)}
            className={cn(
              "h-7 px-2.5 text-xs font-medium rounded-sm border transition-colors",
              active
                ? "bg-foreground text-background border-foreground"
                : "bg-card text-muted-foreground hover:text-foreground hover:border-foreground/40"
            )}
          >
            {item.label}
            {item.count !== undefined && (
              <span className="ml-1.5 tabular-nums opacity-70">{item.count}</span>
            )}
          </button>
        );
      })}
    </div>
  );
}
