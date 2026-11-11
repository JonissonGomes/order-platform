import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import { useEffect, useId, useMemo, useRef, useState } from "react";

interface SuggestInputProps {
  id?: string;
  value: string;
  options: string[];
  onChange: (value: string) => void;
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
export function SuggestInput({
  id,
  value,
  options,
  onChange,
  placeholder,
  disabled,
  className,
  limit = 40,
}: SuggestInputProps) {
  const autoId = useId();
  const inputId = id ?? autoId;
  const rootRef = useRef<HTMLDivElement>(null);
  const [open, setOpen] = useState(false);
  const [highlight, setHighlight] = useState(0);

  const filtered = useMemo(() => {
    const term = value.trim().toLowerCase();
    const base = !term
      ? options
      : options.filter(o => o.toLowerCase().includes(term));
    return base.slice(0, limit);
  }, [options, value, limit]);

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

  const pick = (opt: string) => {
    onChange(opt);
    setOpen(false);
  };

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
          if (!open || filtered.length === 0) {
            if (e.key === "Escape") setOpen(false);
            return;
          }
          if (e.key === "ArrowDown") {
            e.preventDefault();
            setHighlight(h => (h + 1) % filtered.length);
          } else if (e.key === "ArrowUp") {
            e.preventDefault();
            setHighlight(h => (h - 1 + filtered.length) % filtered.length);
          } else if (e.key === "Enter") {
            e.preventDefault();
            pick(filtered[highlight] ?? value);
          } else if (e.key === "Escape") {
            setOpen(false);
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
            <li key={opt} role="option" aria-selected={i === highlight}>
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
                {opt}
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
