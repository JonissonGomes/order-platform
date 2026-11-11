// Estoque, caixa e portal do cliente - ZTS Cell
// Nomes de campos seguem o contrato JSON do backend Go (models/*.go).

export interface Product {
  id: string;
  branchId?: string;
  name: string;
  sku?: string;
  barcode?: string;
  category?: string;
  description?: string;
  cost: number;
  price: number;
  qty: number;
  minQty: number;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
  createdBy?: string;
  updatedBy?: string;
}

/** in = entrada, out = saída, adjust = define quantidade absoluta. */
export type InventoryMovementType = "in" | "out" | "adjust" | "sale" | "os_consume";

export interface InventoryMovement {
  id: string;
  branchId?: string;
  productId: string;
  product?: Product;
  type: InventoryMovementType;
  /** Variação aplicada (negativa para saídas). */
  qty: number;
  unitCost?: number;
  refType?: string;
  refId?: string;
  note?: string;
  createdAt: string;
  createdBy?: string;
}

export type CashSessionStatus = "open" | "closed";

export interface CashSession {
  id: string;
  branchId: string;
  status: CashSessionStatus;
  openingFloat: number;
  closingCounted?: number;
  expectedTotal?: number;
  difference?: number;
  notes?: string;
  openedAt: string;
  closedAt?: string;
  openedBy?: string;
  closedBy?: string;
}

export type PaymentMethod = "pix" | "debit" | "credit" | "cash";
export type CashMovementType = "in" | "out";
export type CashMovementKind =
  | "sale"
  | "os_deposit"
  | "os_balance"
  | "withdraw"
  | "float"
  | "other";

export interface CashMovement {
  id: string;
  sessionId: string;
  branchId?: string;
  type: CashMovementType;
  kind: CashMovementKind;
  method: PaymentMethod;
  amount: number;
  description?: string;
  refType?: string;
  refId?: string;
  createdAt: string;
  createdBy?: string;
}

export interface CashSummary {
  /** entradas - saídas por forma de pagamento */
  totalsByMethod: Partial<Record<PaymentMethod, number>>;
  totalIn: number;
  totalOut: number;
  /** fundo inicial + dinheiro em espécie líquido */
  expectedCash: number;
}

export interface CashSessionState {
  session: CashSession | null;
  summary?: CashSummary;
}

export interface CashSessionMovements {
  session: CashSession | null;
  movements: CashMovement[];
  summary?: CashSummary;
}

// Portal público do cliente (OS + últimos 4 dígitos do telefone)

export interface PortalTimelineEntry {
  status: string;
  statusLabel?: string;
  at: string;
}

export interface PortalMessage {
  content: string;
  createdAt: string;
}

export interface PortalLookupRequest {
  orderNumber: string;
  phoneLast4: string;
}

/** Resposta sanitizada de POST /api/portal/lookup (campo `order`). */
export interface PortalLookup {
  orderNumber: string;
  status: string;
  statusLabel?: string;
  device: string;
  serviceType?: string;
  createdAt: string;
  updatedAt: string;
  expectedAt?: string;
  timeline: PortalTimelineEntry[];
  messages: PortalMessage[];
}

// Requests

export interface CreateProductRequest {
  name: string;
  sku?: string;
  barcode?: string;
  category?: string;
  description?: string;
  cost: number;
  price: number;
  qty: number;
  minQty: number;
}

export type UpdateProductRequest = Partial<Omit<CreateProductRequest, "qty">> & {
  isActive?: boolean;
};

export interface AdjustStockRequest {
  type: InventoryMovementType;
  qty: number;
  unitCost?: number;
  refType?: string;
  refId?: string;
  note?: string;
}

export interface OpenCashRequest {
  openingFloat: number;
  notes?: string;
}

export interface CloseCashRequest {
  closingCounted: number;
  notes?: string;
}

export interface CreateCashMovementRequest {
  type: CashMovementType;
  kind: CashMovementKind;
  method: PaymentMethod;
  amount: number;
  description?: string;
  refType?: string;
  refId?: string;
}
