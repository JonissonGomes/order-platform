import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { useEffect, useRef, useState } from "react";

interface CameraScanDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onDetected: (code: string) => void;
}

/** Leitura de código de barras pela câmera (@zxing/browser carregado sob demanda). */
export function CameraScanDialog({ open, onOpenChange, onDetected }: CameraScanDialogProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [error, setError] = useState<string | null>(null);
  // refs evitam reiniciar a câmera quando o pai recria os callbacks
  const detectedRef = useRef(onDetected);
  const openChangeRef = useRef(onOpenChange);
  detectedRef.current = onDetected;
  openChangeRef.current = onOpenChange;

  useEffect(() => {
    if (!open) return;
    let stop: (() => void) | undefined;
    let cancelled = false;
    setError(null);

    (async () => {
      try {
        const { BrowserMultiFormatReader } = await import("@zxing/browser");
        if (cancelled || !videoRef.current) return;
        const reader = new BrowserMultiFormatReader();
        const controls = await reader.decodeFromVideoDevice(
          undefined,
          videoRef.current,
          result => {
            if (result && !cancelled) {
              cancelled = true;
              controls.stop();
              detectedRef.current(result.getText());
              openChangeRef.current(false);
            }
          }
        );
        stop = () => controls.stop();
        if (cancelled) controls.stop();
      } catch {
        setError("Não foi possível acessar a câmera. Use o leitor USB ou digite o código.");
      }
    })();

    return () => {
      cancelled = true;
      stop?.();
    };
  }, [open]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Ler código de barras</DialogTitle>
          <DialogDescription>Aponte a câmera para o código do produto.</DialogDescription>
        </DialogHeader>
        {error ? (
          <p className="text-sm text-destructive">{error}</p>
        ) : (
          <video
            ref={videoRef}
            className="w-full aspect-video bg-black rounded-md object-cover"
            muted
            playsInline
          />
        )}
        <Button variant="outline" onClick={() => onOpenChange(false)}>
          Cancelar
        </Button>
      </DialogContent>
    </Dialog>
  );
}
