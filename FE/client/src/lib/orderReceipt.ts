import { api } from "@/lib/api";
import { formatCurrency, formatDate, formatDateTime } from "@/lib/format";
import { statusLabel } from "@/lib/orderStatus";
import { deliveredAt as orderDeliveredAt } from "@/lib/reports";
import type { ServiceOrder } from "@/types";

function escapeHtml(value: string) {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

/** Monta HTML do comprovante de serviço (recibo da OS — não é NF-e). */
export function buildOrderReceiptHtml(order: ServiceOrder): string {
  const parts = order.parts ?? [];
  const partsRows = parts.length
    ? parts
        .map(
          p => `<tr>
            <td>${escapeHtml(p.name)}</td>
            <td class="num">${p.qty}</td>
            <td class="num">${escapeHtml(formatCurrency(p.unitPrice))}</td>
            <td class="num">${escapeHtml(formatCurrency(p.qty * p.unitPrice))}</td>
          </tr>`
        )
        .join("")
    : `<tr><td colspan="4" class="muted">Nenhuma peça lançada</td></tr>`;

  const labor = order.laborCost ?? 0;
  const partsTotal = parts.reduce((s, p) => s + p.qty * p.unitPrice, 0);
  const final =
    order.finalCost && order.finalCost > 0
      ? order.finalCost
      : labor + partsTotal || order.estimatedCost || 0;

  return `<!doctype html>
<html lang="pt-BR">
<head>
  <meta charset="utf-8" />
  <title>Comprovante OS ${escapeHtml(order.orderNumber)}</title>
  <style>
    * { box-sizing: border-box; }
    body { font-family: system-ui, sans-serif; color: #1a1f26; margin: 24px; font-size: 13px; }
    h1 { font-size: 18px; margin: 0 0 4px; }
    .sub { color: #64748b; font-size: 12px; margin: 0 0 16px; }
    .grid { display: grid; grid-template-columns: 1fr 1fr; gap: 8px 24px; margin-bottom: 16px; }
    .label { color: #64748b; font-size: 11px; text-transform: uppercase; letter-spacing: 0.04em; }
    .value { font-weight: 600; margin-top: 2px; }
    table { width: 100%; border-collapse: collapse; margin: 12px 0; }
    th, td { border-bottom: 1px solid #e2e8f0; padding: 8px 6px; text-align: left; }
    th { font-size: 11px; color: #64748b; font-weight: 600; }
    .num { text-align: right; font-variant-numeric: tabular-nums; }
    .muted { color: #94a3b8; }
    .totals { margin-top: 12px; width: 240px; margin-left: auto; }
    .totals .row { display: flex; justify-content: space-between; padding: 4px 0; }
    .totals .final { font-size: 15px; font-weight: 700; border-top: 1px solid #1a1f26; margin-top: 6px; padding-top: 8px; }
    .foot { margin-top: 28px; font-size: 11px; color: #64748b; }
    @media print { body { margin: 12px; } }
  </style>
</head>
<body>
  <h1>Comprovante de serviço</h1>
  <p class="sub">Documento auxiliar da ordem de serviço — ZTS Cell</p>

  <div class="grid">
    <div>
      <div class="label">OS</div>
      <div class="value">${escapeHtml(order.orderNumber)}</div>
    </div>
    <div>
      <div class="label">Status</div>
      <div class="value">${escapeHtml(order.statusLabel || statusLabel(order.status))}</div>
    </div>
    <div>
      <div class="label">Cliente</div>
      <div class="value">${escapeHtml(order.customer?.name || "—")}</div>
    </div>
    <div>
      <div class="label">Telefone</div>
      <div class="value">${escapeHtml(order.customer?.phone || "—")}</div>
    </div>
    <div>
      <div class="label">Aparelho</div>
      <div class="value">${escapeHtml(`${order.productBrand} ${order.productModel}`.trim() || "—")}</div>
    </div>
    <div>
      <div class="label">IMEI / Série</div>
      <div class="value">${escapeHtml(order.imei || "—")}</div>
    </div>
    <div>
      <div class="label">Serviço</div>
      <div class="value">${escapeHtml(order.serviceType || "—")}</div>
    </div>
    <div>
      <div class="label">Abertura</div>
      <div class="value">${escapeHtml(formatDateTime(order.createdAt))}</div>
    </div>
    <div>
      <div class="label">Data de entrega</div>
      <div class="value">${escapeHtml(formatDateTime(orderDeliveredAt(order)))}</div>
    </div>
    <div>
      <div class="label">Previsão</div>
      <div class="value">${escapeHtml(formatDate(order.expectedAt))}</div>
    </div>
  </div>

  <p><span class="label">Defeito relatado</span><br/>${escapeHtml(order.problemDescription || "—")}</p>
  ${
    order.resolution
      ? `<p><span class="label">Resolução</span><br/>${escapeHtml(order.resolution)}</p>`
      : ""
  }

  <table>
    <thead>
      <tr>
        <th>Peça / item</th>
        <th class="num">Qtd</th>
        <th class="num">Unit.</th>
        <th class="num">Total</th>
      </tr>
    </thead>
    <tbody>${partsRows}</tbody>
  </table>

  <div class="totals">
    <div class="row"><span>Orçamento inicial</span><span>${escapeHtml(formatCurrency(order.estimatedCost))}</span></div>
    <div class="row"><span>Peças</span><span>${escapeHtml(formatCurrency(partsTotal))}</span></div>
    <div class="row"><span>Mão de obra</span><span>${escapeHtml(formatCurrency(labor))}</span></div>
    ${
      order.depositAmount
        ? `<div class="row"><span>Sinal</span><span>${escapeHtml(formatCurrency(order.depositAmount))}</span></div>`
        : ""
    }
    <div class="row final"><span>Valor realizado</span><span>${escapeHtml(formatCurrency(final))}</span></div>
  </div>

  <p class="foot">
    Emitido em ${escapeHtml(formatDateTime(new Date().toISOString()))}.
    Este comprovante resume o serviço prestado; não substitui nota fiscal eletrônica quando exigida.
  </p>
</body>
</html>`;
}

/**
 * Abre a janela de impressão de forma síncrona (deve rodar no clique do usuário).
 * Sem `noopener`: com noopener o navegador devolve `null` e o recibo não abre.
 */
export function openReceiptPrintWindow(): Window {
  const win = window.open("", "_blank", "width=720,height=900");
  if (!win) {
    throw new Error("Permita pop-ups para imprimir o comprovante.");
  }
  win.document.write(
    `<!doctype html><title>Comprovante</title><body style="font-family:system-ui;padding:24px;color:#64748b">Gerando comprovante…</body>`
  );
  return win;
}

/** Preenche a janela já aberta e dispara a impressão. Só permite OS entregue. */
export async function fillAndPrintReceipt(win: Window, orderId: string): Promise<void> {
  try {
    const order = await api.serviceOrders.get(orderId);
    if (order.status !== "delivered") {
      win.close();
      throw new Error("O recibo só pode ser emitido após a entrega da OS.");
    }
    win.document.open();
    win.document.write(buildOrderReceiptHtml(order));
    win.document.close();
    win.focus();
    window.setTimeout(() => {
      try {
        win.print();
      } catch {
        /* ignore */
      }
    }, 250);
  } catch (err) {
    try {
      win.close();
    } catch {
      /* ignore */
    }
    throw err;
  }
}

/**
 * Abre o comprovante da OS entregue.
 * A janela é aberta antes do fetch para não ser bloqueada pelo navegador.
 */
export async function printOrderReceipt(orderId: string): Promise<void> {
  const win = openReceiptPrintWindow();
  await fillAndPrintReceipt(win, orderId);
}
