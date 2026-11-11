import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Camera, ScanBarcode } from "lucide-react";
import { useCallback, useRef, useState } from "react";
import { CameraScanDialog } from "./CameraScanDialog";

interface BarcodeInputProps {
  onScan: (code: string) => void;
  placeholder?: string;
  disabled?: boolean;
  autoFocus?: boolean;
}

/**
 * Campo para leitor USB (wedge): o leitor "digita" o código e envia Enter,
 * que dispara onScan e limpa o campo. O botão de câmera usa @zxing/browser.
 */
export function BarcodeInput({
  onScan,
  placeholder = "Bipar ou digitar código de barras e pressionar Enter",
  disabled,
  autoFocus = true,
}: BarcodeInputProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [value, setValue] = useState("");
  const [cameraOpen, setCameraOpen] = useState(false);

  const submit = useCallback(
    (raw: string) => {
      const code = raw.trim();
      if (!code) return;
      onScan(code);
      setValue("");
      inputRef.current?.focus();
    },
    [onScan]
  );

  return (
    <>
      <form
        className="flex gap-2"
        onSubmit={e => {
          e.preventDefault();
          submit(value);
        }}
      >
        <div className="relative flex-1">
          <ScanBarcode className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            ref={inputRef}
            value={value}
            onChange={e => setValue(e.target.value)}
            placeholder={placeholder}
            disabled={disabled}
            autoFocus={autoFocus}
            inputMode="numeric"
            autoComplete="off"
            className="pl-8 font-mono"
            aria-label="Código de barras"
          />
        </div>
        <Button
          type="button"
          variant="outline"
          onClick={() => setCameraOpen(true)}
          disabled={disabled}
          aria-label="Ler com a câmera"
        >
          <Camera className="h-4 w-4" />
          <span className="hidden sm:inline">Câmera</span>
        </Button>
      </form>
      <CameraScanDialog
        open={cameraOpen}
        onOpenChange={setCameraOpen}
        onDetected={submit}
      />
    </>
  );
}
