import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import { useEffect, useId, useMemo, useRef, useState, type ReactNode } from "react";

interface SuggestInputProps<T> {
  id?: string;
  value: string;
  options: T[];
  onChange: (value: string) => void;
  /** Texto exibido e, por padrão, usado no filtro. Default: String(option). */
  getLabel?: (option: T) => string;
  /** Texto extra para filtro (ex.: SKU, código). */
  getSearchText?: (option: T) => string;
  /** Conteúdo customizado de cada linha. */
  renderOption?: (option: T) => ReactNode;
  /** Disparado ao escolher na lista / Enter na sugestão. */
  onSelect?: (option: T) => void;
  /** Enter sem sugestão (ex.: leitor de código de barras). */
  onSubmitValue?: (value: string) => void;
  placeholder?: string;
  disabled?: boolean;
  className?: string;
  /** Limite de sugestões na lista. */
  limit?: number;
}

/**
 * Campo aberto com lista flutuante abaixo (sobrepõe o conteúdo seguinte).
 * Digitação livre + escolha por clique/teclado.
 */
export function SuggestInput<T>({
  id,
  value,
  options,
  onChange,
  getLabel: getLabelProp,
  getSearchText,
  renderOption,
  onSelect,
  onSubmitValue,
  placeholder,
  disabled,
  className,
  limit = 80,
}: SuggestInputProps<T>) {
  const autoId = useId();
  const inputId = id ?? autoId;
  const rootRef = useRef<HTMLDivElement>(null);
  const [open, setOpen] = useState(false);
  const [highlight, setHighlight] = useState(0);
  const getLabel = getLabelProp ?? ((o: T) => String(o));

  const filtered = useMemo(() => {
    const term = value.trim().toLowerCase();
    const base = !term
      ? options
      : options.filter(o => {
          const label = getLabel(o).toLowerCase();
          const extra = (getSearchText?.(o) ?? "").toLowerCase();
          return label.includes(term) || extra.includes(term);
        });
    return base.slice(0, limit);
  }, [options, value, limit, getLabel, getSearchText]);

  useEffect(() => {
    setHighlight(0);
  }, [value, open]);

  useEffect(() => {
    if (!open) return;
    const onDoc = (e: MouseEvent) => {
      if (!rootRef.current?.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, [open]);

  const pick = (opt: T) => {
    if (onSelect) onSelect(opt);
    else onChange(getLabel(opt));
    setOpen(false);
  };

  const optionKey = (opt: T, i: number) =>
    `${getLabel(opt)}::${getSearchText?.(opt) ?? ""}::${i}`;

  return (
    <div ref={rootRef} className="relative">
      <Input
        id={inputId}
        value={value}
        disabled={disabled}
        placeholder={placeholder}
        className={cn(className)}
        autoComplete="off"
        role="combobox"
        aria-expanded={open}
        aria-controls={`${inputId}-list`}
        aria-autocomplete="list"
        onFocus={() => setOpen(true)}
        onChange={e => {
          onChange(e.target.value);
          setOpen(true);
        }}
        onKeyDown={e => {
          if (!open && (e.key === "ArrowDown" || e.key === "ArrowUp")) {
            setOpen(true);
            return;
          }
          if (e.key === "Escape") {
            setOpen(false);
            return;
          }
          if (e.key === "Enter") {
            e.preventDefault();
            if (filtered.length > 0) {
              pick(filtered[highlight] ?? filtered[0]);
            } else if (onSubmitValue && value.trim()) {
              onSubmitValue(value.trim());
              setOpen(false);
            }
            return;
          }
          if (!open || filtered.length === 0) return;
          if (e.key === "ArrowDown") {
            e.preventDefault();
            setHighlight(h => (h + 1) % filtered.length);
          } else if (e.key === "ArrowUp") {
            e.preventDefault();
            setHighlight(h => (h - 1 + filtered.length) % filtered.length);
          }
        }}
      />

      {open && filtered.length > 0 && (
        <ul
          id={`${inputId}-list`}
          role="listbox"
          className={cn(
            "absolute left-0 right-0 top-[calc(100%+0.25rem)] z-50",
            "max-h-52 overflow-auto rounded-md border bg-popover text-popover-foreground shadow-md",
            "py-1"
          )}
        >
          {filtered.map((opt, i) => (
            <li key={optionKey(opt, i)} role="option" aria-selected={i === highlight}>
              <button
                type="button"
                className={cn(
                  "w-full px-3 py-2 text-left text-sm hover:bg-accent",
                  i === highlight && "bg-accent"
                )}
                onMouseEnter={() => setHighlight(i)}
                onMouseDown={e => e.preventDefault()}
                onClick={() => pick(opt)}
              >
                {renderOption ? renderOption(opt) : getLabel(opt)}
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
