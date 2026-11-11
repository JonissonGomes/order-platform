import { ScrollRow } from "@/components/zts/ScrollRow";
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

/** Chips em faixa horizontal com setas inline (esquerda/direita). */
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
    <ScrollRow>
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
              "h-8 shrink-0 px-3 text-xs font-medium rounded-sm border transition-colors",
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
    </ScrollRow>
  );
}
