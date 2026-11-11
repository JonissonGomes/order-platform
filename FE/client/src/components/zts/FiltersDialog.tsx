import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { cn } from "@/lib/utils";
import { Filter, ListFilter } from "lucide-react";
import { useEffect, useState } from "react";

export interface FilterOption<T extends string = string> {
  value: T;
  label: string;
  count?: number;
}

interface FiltersDialogProps<T extends string> {
  title?: string;
  description?: string;
  options: FilterOption<T>[];
  /** Valores aplicados (fonte da verdade da lista). */
  value: T[];
  onApply: (values: T[]) => void;
  /** Se true, lista vazia = “todos”. */
  emptyMeansAll?: boolean;
  className?: string;
  triggerLabel?: string;
}

/**
 * Botão "Filtros" → sheet com checkboxes + Aplicar.
 */
export function FiltersDialog<T extends string>({
  title = "Filtros",
  description = "Selecione as opções e toque em Aplicar.",
  options,
  value,
  onApply,
  emptyMeansAll = true,
  className,
  triggerLabel = "Filtros",
}: FiltersDialogProps<T>) {
  const [open, setOpen] = useState(false);
  const [draft, setDraft] = useState<T[]>(value);

  useEffect(() => {
    if (open) setDraft(value);
  }, [open, value]);

  const activeCount = value.length;
  const allSelected = draft.length === 0 || draft.length === options.length;

  const toggle = (v: T, checked: boolean) => {
    setDraft(prev => {
      if (checked) return prev.includes(v) ? prev : [...prev, v];
      return prev.filter(x => x !== v);
    });
  };

  const selectAll = () => setDraft(emptyMeansAll ? [] : options.map(o => o.value));
  const clear = () => setDraft([]);

  const apply = () => {
    // Normaliza: se marcou todos, grava [] quando emptyMeansAll
    const next =
      emptyMeansAll && (draft.length === 0 || draft.length === options.length) ? [] : draft;
    onApply(next);
    setOpen(false);
  };

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger asChild>
        <Button type="button" variant="outline" size="sm" className={cn("gap-1.5", className)}>
          <ListFilter className="h-4 w-4" />
          {triggerLabel}
          {activeCount > 0 && (
            <span className="ml-0.5 rounded-sm bg-foreground px-1.5 py-0.5 text-[10px] font-semibold text-background tabular-nums">
              {activeCount}
            </span>
          )}
        </Button>
      </SheetTrigger>
      <SheetContent side="right" className="w-full sm:max-w-sm flex flex-col">
        <SheetHeader>
          <SheetTitle className="flex items-center gap-2">
            <Filter className="h-4 w-4" />
            {title}
          </SheetTitle>
          <SheetDescription>{description}</SheetDescription>
        </SheetHeader>

        <div className="flex items-center gap-2 px-1">
          <Button type="button" variant="ghost" size="sm" onClick={selectAll}>
            {allSelected ? "Todos" : "Selecionar todos"}
          </Button>
          <Button type="button" variant="ghost" size="sm" onClick={clear} disabled={draft.length === 0}>
            Limpar
          </Button>
        </div>

        <ul className="flex-1 overflow-y-auto space-y-1 py-2">
          {options.map(opt => {
            const checked =
              draft.length === 0 && emptyMeansAll
                ? true
                : draft.includes(opt.value);
            return (
              <li key={opt.value}>
                <label className="flex items-center gap-3 rounded-sm px-2 py-2.5 hover:bg-muted/60 cursor-pointer">
                  <Checkbox
                    checked={checked}
                    onCheckedChange={v => {
                      if (draft.length === 0 && emptyMeansAll) {
                        // Partia de "todos": desmarcar um = todos menos este
                        setDraft(options.map(o => o.value).filter(x => x !== opt.value));
                        return;
                      }
                      toggle(opt.value, v === true);
                    }}
                  />
                  <span className="flex-1 text-sm">{opt.label}</span>
                  {opt.count !== undefined && (
                    <span className="text-xs text-muted-foreground tabular-nums">{opt.count}</span>
                  )}
                </label>
              </li>
            );
          })}
        </ul>

        <SheetFooter className="gap-2 sm:gap-2">
          <Button type="button" variant="outline" onClick={() => setOpen(false)}>
            Cancelar
          </Button>
          <Button type="button" onClick={apply}>
            Aplicar
          </Button>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  );
}
