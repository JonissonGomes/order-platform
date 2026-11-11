import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { formatCurrency } from "@/lib/format";
import type { Product } from "@/types";
import { Copy, Printer } from "lucide-react";
import { useEffect, useId, useState } from "react";
import { toast } from "sonner";

/**
 * Etiqueta para colar no produto físico: nome, preço, código e Code128.
 * Usada no leitor/balcão e na reposição de estoque.
 */
export function ProductLabelDialog({
  product,
  onOpenChange,
}: {
  product: Product | null;
  onOpenChange: (open: boolean) => void;
}) {
  const svgId = useId().replace(/:/g, "");
  const code = product?.barcode?.trim() || product?.sku?.trim() || "";
  const [barcodeReady, setBarcodeReady] = useState(false);

  useEffect(() => {
    if (!product || !code) {
      setBarcodeReady(false);
      return;
    }

    let cancelled = false;
    setBarcodeReady(false);

    const timer = window.setTimeout(() => {
      const el = document.getElementById(`label-barcode-${svgId}`);
      if (!el || cancelled) return;

      void import("jsbarcode")
        .then(mod => {
          if (cancelled) return;
          const JsBarcode = mod.default;
          el.replaceChildren();
          JsBarcode(el, code, {
            format: "CODE128",
            displayValue: true,
            fontSize: 13,
            height: 56,
            margin: 4,
            width: 1.6,
            background: "#ffffff",
            lineColor: "#1a1f26",
          });
          setBarcodeReady(true);
        })
        .catch(() => {
          if (!cancelled) {
            setBarcodeReady(false);
            toast.error("Não foi possível desenhar o código de barras.");
          }
        });
    }, 50);

    return () => {
      cancelled = true;
      window.clearTimeout(timer);
    };
  }, [product, code, svgId]);

  const copyCode = async () => {
    if (!code) return;
    try {
      await navigator.clipboard.writeText(code);
      toast.success("Código copiado");
    } catch {
      toast.error("Não foi possível copiar");
    }
  };

  const printLabel = () => {
    if (!product || !code) return;
    const el = document.getElementById(`label-barcode-${svgId}`);
    const svg = el?.outerHTML ?? "";
    const win = window.open("", "_blank", "noopener,width=480,height=640");
    if (!win) {
      toast.error("Permita pop-ups para imprimir a etiqueta.");
      return;
    }
    win.document.write(`<!doctype html><html><head><title>Etiqueta — ${escapeHtml(product.name)}</title>
<style>
  body { font-family: system-ui, sans-serif; margin: 24px; color: #1a1f26; }
  .label { width: 300px; text-align: center; }
  h1 { font-size: 14px; margin: 0 0 4px; font-weight: 600; }
  .price { font-size: 13px; margin: 0 0 6px; color: #555; }
  .code { font-family: ui-monospace, monospace; font-size: 12px; letter-spacing: 0.04em; margin: 0 0 8px; }
  svg { max-width: 100%; height: auto; }
  @media print { body { margin: 0; } }
</style></head><body>
<div class="label">
  <h1>${escapeHtml(product.name)}</h1>
  <p class="price">${escapeHtml(formatCurrency(product.price))}</p>
  <p class="code">${escapeHtml(code)}</p>
  ${svg}
</div>
<script>window.onload=function(){window.print();}</script>
</body></html>`);
    win.document.close();
  };

  return (
    <Dialog open={Boolean(product)} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Etiqueta do produto</DialogTitle>
          <DialogDescription>
            Código para bipar no caixa ou colar no item físico. Copie ou imprima.
          </DialogDescription>
        </DialogHeader>

        {!code ? (
          <p className="text-sm text-muted-foreground">
            Este produto ainda não tem código. Edite o cadastro e gere um código da loja.
          </p>
        ) : (
          <div className="rounded-md border bg-white p-4 text-center space-y-3 text-foreground">
            <div>
              <p className="text-sm font-semibold leading-snug">{product?.name}</p>
              <p className="text-sm tabular-nums mt-1">
                {product ? formatCurrency(product.price) : null}
              </p>
            </div>
            <p className="font-mono text-sm tracking-wide select-all">{code}</p>
            <svg
              id={`label-barcode-${svgId}`}
              className={`mx-auto max-w-full ${barcodeReady ? "" : "min-h-16"}`}
              aria-label={`Código de barras ${code}`}
            />
          </div>
        )}

        <DialogFooter className="gap-2 sm:gap-2">
          <Button type="button" variant="outline" disabled={!code} onClick={copyCode}>
            <Copy className="h-4 w-4" /> Copiar código
          </Button>
          <Button type="button" disabled={!code} onClick={printLabel}>
            <Printer className="h-4 w-4" /> Imprimir
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function escapeHtml(value: string) {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}
