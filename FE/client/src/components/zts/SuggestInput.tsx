import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import { useId, useMemo } from "react";

interface SuggestInputProps {
  id?: string;
  value: string;
  options: string[];
  onChange: (value: string) => void;
  placeholder?: string;
  disabled?: boolean;
  className?: string;
  /** Limite de sugestões exibidas no datalist. */
  limit?: number;
}

/**
 * Campo aberto com sugestões (datalist): permite digitar livremente
 * e escolher da lista filtrada.
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
  const listId = `${id ?? autoId}-suggestions`;

  const filtered = useMemo(() => {
    const term = value.trim().toLowerCase();
    const base = !term
      ? options
      : options.filter(o => o.toLowerCase().includes(term));
    return base.slice(0, limit);
  }, [options, value, limit]);

  return (
    <>
      <Input
        id={id}
        list={listId}
        value={value}
        disabled={disabled}
        placeholder={placeholder}
        className={cn(className)}
        autoComplete="off"
        onChange={e => onChange(e.target.value)}
      />
      <datalist id={listId}>
        {filtered.map(opt => (
          <option key={opt} value={opt} />
        ))}
      </datalist>
    </>
  );
}
