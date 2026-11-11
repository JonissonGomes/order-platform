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
import { useEffect, useRef } from "react";
import { toast } from "sonner";

/** Preview de etiqueta: nome + Code128 + copiar / imprimir via navegador. */
export function ProductLabelDialog({
  product,
  onOpenChange,
}: {
  product: Product | null;
  onOpenChange: (open: boolean) => void;
}) {
  const svgRef = useRef<SVGSVGElement>(null);
  const code = product?.barcode?.trim() || product?.sku?.trim() || "";

  useEffect(() => {
    if (!product || !code || !svgRef.current) return;
    const el = svgRef.current;
    let cancelled = false;

    void import("jsbarcode")
      .then(mod => {
        if (cancelled || !el) return;
        const JsBarcode = mod.default;
        JsBarcode(el, code, {
          format: "CODE128",
          displayValue: true,
          fontSize: 14,
          height: 64,
          margin: 8,
          background: "#ffffff",
          lineColor: "#1a1f26",
        });
      })
      .catch(() => {
        if (!cancelled) toast.error("Não foi possível desenhar o código de barras.");
      });

    return () => {
      cancelled = true;
    };
  }, [product, code]);

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
    if (!product || !code || !svgRef.current) return;
    const svg = svgRef.current.outerHTML;
    const win = window.open("", "_blank", "noopener,width=480,height=640");
    if (!win) {
      toast.error("Permita pop-ups para imprimir a etiqueta.");
      return;
    }
    win.document.write(`<!doctype html><html><head><title>Etiqueta — ${product.name}</title>
<style>
  body { font-family: system-ui, sans-serif; margin: 24px; color: #1a1f26; }
  .label { width: 280px; text-align: center; }
  h1 { font-size: 14px; margin: 0 0 4px; font-weight: 600; }
  p { font-size: 12px; margin: 0 0 8px; color: #555; }
  svg { max-width: 100%; height: auto; }
  @media print { body { margin: 0; } }
</style></head><body>
<div class="label">
  <h1>${escapeHtml(product.name)}</h1>
  <p>${escapeHtml(formatCurrency(product.price))}</p>
  ${svg}
</div>
<script>window.onload=function(){window.print();}</script>
</body></html>`);
    win.document.close();
  };

  return (
    <Dialog open={Boolean(product)} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-sm">
        <DialogHeader>
          <DialogTitle>Etiqueta</DialogTitle>
          <DialogDescription>
            Imprima ou copie o código para colar no produto.
          </DialogDescription>
        </DialogHeader>

        {!code ? (
          <p className="text-sm text-muted-foreground">
            Este produto ainda não tem código. Edite e gere um código da loja.
          </p>
        ) : (
          <div className="rounded-sm border bg-white p-4 text-center space-y-2">
            <p className="text-sm font-medium">{product?.name}</p>
            <p className="text-xs text-muted-foreground tabular-nums">
              {product ? formatCurrency(product.price) : null}
            </p>
            <svg ref={svgRef} className="mx-auto max-w-full" />
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
