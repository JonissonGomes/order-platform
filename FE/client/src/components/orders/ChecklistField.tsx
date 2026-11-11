import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";

interface ChecklistFieldProps {
  /** Rótulos disponíveis. */
  options: readonly string[];
  /** Rótulos marcados. */
  value: string[];
  onChange: (value: string[]) => void;
}

/** Checklist de entrada: marque o que está funcionando / presente no recebimento. */
export function ChecklistField({ options, value, onChange }: ChecklistFieldProps) {
  const toggle = (label: string, checked: boolean) =>
    onChange(checked ? [...value, label] : value.filter(v => v !== label));

  return (
    <div className="grid gap-2 sm:grid-cols-2">
      {options.map((label, i) => (
        <div key={label} className="flex items-center gap-2 border rounded-sm bg-card px-3 py-2">
          <Checkbox
            id={`chk-${i}`}
            checked={value.includes(label)}
            onCheckedChange={v => toggle(label, v === true)}
          />
          <Label htmlFor={`chk-${i}`} className="text-sm font-normal flex-1 cursor-pointer">
            {label}
          </Label>
        </div>
      ))}
    </div>
  );
}
