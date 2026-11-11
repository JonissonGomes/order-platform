/**
 * Código interno da loja para produtos sem código de fabricante.
 * Formato Code128-friendly: ZTS + 10 dígitos.
 */
export function generateStoreProductCode(): string {
  const now = Date.now().toString().slice(-8);
  const rand = Math.floor(Math.random() * 100)
    .toString()
    .padStart(2, "0");
  return `ZTS${now}${rand}`;
}

/** Normaliza o código digitado/bipado (trim, sem espaços internos). */
export function normalizeProductCode(raw: string): string {
  return raw.trim().replace(/\s+/g, "");
}
