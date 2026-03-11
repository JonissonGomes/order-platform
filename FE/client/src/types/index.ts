// Backend Models - TypeScript Types

// "dono" = novo valor; "super_admin" mantido por retrocompatibilidade com dados existentes
export type UserRole = "user" | "admin" | "dono" | "super_admin";

export interface User {
  id: string;
  email: string;
  name: string;
  role: UserRole;
  createdAt: string;
  updatedAt: string;
  lastSignedIn: string;
}

export type EmployeeRole = "dono" | "admin" | "department_manager" | "attendant" | "technician";

export interface Employee {
  id: string;
  name: string;
  email: string;
  phone?: string;
  role: EmployeeRole;
  profileId?: string;
  profile?: Profile;
  departmentId?: string;
  department?: Department;
  isActive: boolean;
  isSuspended?: boolean;
  lastSignedIn?: string;
  createdAt: string;
  updatedAt: string;
  createdBy: string;
  updatedBy: string;
}

export interface Address {
  street: string;
  number: string;
  complement?: string;
  neighborhood: string;
  city: string;
  state: string;
  zipCode: string;
}

export interface Customer {
  id: string;
  name: string;
  cpf: string;
  phone: string;
  email?: string;
  address?: Address;
  isTemporary?: boolean;
  notes?: string;
  lastSignedIn?: string;
  // Fidelização e manutenção periódica
  maintenanceIntervalMonths?: number; // 0 = sem alerta
  lastMaintenanceDate?: string;
  nextMaintenanceDate?: string;
  maintenanceAlertSent?: boolean;
  createdAt: string;
  updatedAt: string;
  createdBy: string;
  updatedBy: string;
}

export type ServiceOrderStatus =
  | "pending"
  | "evaluating"
  | "approved"
  | "waiting_parts"
  | "in_repair"
  | "testing"
  | "ready"
  | "delivered"
  | "cancelled";

export interface Note {
  id: string;
  content: string;
  createdAt: string;
  createdBy: string;
}

export interface Image {
  id: string;
  url: string;
  publicId: string;
  width?: number;
  height?: number;
  format?: string;
  size?: number;
  uploadedAt: string;
  uploadedBy: string;
}

export type DeliveryType = "none" | "own" | "third";

export interface ServiceItem {
  name: string;
  quantity: number;
  unitPrice: number;
  imageUrl?: string;
}

export interface PaymentInfo {
  method?: "pix" | "cartao" | "dinheiro" | "boleto" | "";
  dueDate?: string;
  observation?: string;
  paid?: boolean;
}

export interface DeliveryInfo {
  type: DeliveryType;
  address?: Address;
  distanceKm?: number;
  cost?: number;
  scheduledAt?: string;
  deliveredAt?: string;
  observations?: string;
}

export interface ServiceOrder {
  id: string;
  orderNumber: string;
  customerId: string;
  customer?: Customer;

  // Equipamento
  productType: string;
  productBrand: string;
  productModel: string;
  serialNumber?: string;

  // Diagnóstico e laudo
  aestheticConditions?: string;
  problemDescription: string;
  initialEvaluation?: string;
  technicalReport?: string;
  solution?: string;

  // Status e fluxo
  status: ServiceOrderStatus;
  departmentId: string;
  department?: Department;
  assignedTo?: string;
  assignedEmployee?: Employee;

  // Datas
  entryDate?: string;
  exitDate?: string;
  estimatedDelivery?: string;

  // Arquivos
  images?: Image[];

  // Serviços
  serviceItems?: ServiceItem[];

  // Custos
  estimatedCost?: number;
  finalCost?: number;

  // Pagamento e entrega
  payment?: PaymentInfo;
  delivery?: DeliveryInfo;

  // Metadados
  priority?: "low" | "normal" | "high" | "urgent";
  warrantyTerms?: string;
  observations?: string;
  notes?: Note[];

  createdAt: string;
  updatedAt: string;
  createdBy: string;
  updatedBy: string;
  statusChangedBy?: string;
  statusChangedAt?: string;
}

export interface Department {
  id: string;
  name: string;
  description?: string;
  address?: Address;
  managerId?: string;
  manager?: Employee;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
  createdBy: string;
  updatedBy: string;
}

export interface Settings {
  id?: string;
  companyName?: string;
  companyPhone?: string;
  companyEmail?: string;
  companyAddress?: Address;
  companyCNPJ?: string;
  companyLogo?: string;
  companyWebsite?: string;
  responsiblePerson?: string;
  technicalContact?: string;
  warrantyTerms?: string;
  deliveryCostPerKm?: number;
  updatedAt?: string;
}

export interface Product {
  id: string;
  type: string;
  brand: string;
  model: string;
  description?: string;
  createdAt: string;
  updatedAt: string;
  createdBy: string;
  updatedBy: string;
}

export interface StatusHistory {
  id: string;
  serviceOrderId: string;
  previousStatus: ServiceOrderStatus;
  newStatus: ServiceOrderStatus;
  changedBy: string;
  changedByEmployee?: Employee;
  employeeRole: EmployeeRole;
  departmentId: string;
  departmentName: string;
  notes?: string;
  changedAt: string;
}

export type AuditAction = "create" | "update" | "delete" | "status_changed" | "assigned" | "unassigned";

export interface AuditLog {
  id: string;
  action: AuditAction;
  entity: string;
  entityId: string;
  userId: string;
  userName: string;
  userEmail: string;
  userRole: EmployeeRole;
  departmentId?: string;
  departmentName?: string;
  changes?: Record<string, any>;
  ip?: string;
  userAgent?: string;
  timestamp: string;
}

// ── Estoque ──────────────────────────────────────────────────────────────────

export type StockMovementType = "in" | "out" | "adjustment" | "return" | "damaged";
export type StockMovementReason =
  | "purchase"
  | "used_in_order"
  | "returned"
  | "damaged"
  | "adjustment"
  | "initial";

export interface StockItem {
  id: string;
  name: string;
  sku?: string;
  category: string;
  description?: string;
  quantity: number;
  minQuantity: number;
  costPrice: number;
  sellingPrice?: number;
  supplier?: string;
  location?: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
  createdBy: string;
  updatedBy: string;
}

export interface StockMovement {
  id: string;
  stockItemId: string;
  stockItem?: StockItem;
  type: StockMovementType;
  reason: StockMovementReason;
  quantity: number;
  unitCost?: number;
  totalCost?: number;
  quantityBefore: number;
  quantityAfter: number;
  serviceOrderId?: string;
  notes?: string;
  createdAt: string;
  createdBy: string;
}

export interface StockSummary {
  totalItems: number;
  activeItems: number;
  lowStockItems: number;
  outOfStock: number;
  totalValue: number;
}

// ── Financeiro ────────────────────────────────────────────────────────────────

export type TransactionType = "income" | "expense";
export type TransactionCategory =
  | "service_order"
  | "other_income"
  | "parts_purchase"
  | "salary"
  | "rent"
  | "utilities"
  | "equipment"
  | "marketing"
  | "other_expense";

export interface Transaction {
  id: string;
  type: TransactionType;
  category: TransactionCategory;
  description: string;
  amount: number;
  paymentMethod: string;
  serviceOrderId?: string;
  serviceOrder?: ServiceOrder;
  stockItemId?: string;
  referenceDate: string;
  dueDate?: string;
  paidAt?: string;
  isPaid: boolean;
  notes?: string;
  createdAt: string;
  updatedAt: string;
  createdBy: string;
  updatedBy: string;
}

export interface FinancialSummary {
  period: string;
  totalIncome: number;
  totalExpense: number;
  balance: number;
  pendingIncome: number;
  pendingExpense: number;
  transactionCount: number;
}

export interface CashFlowEntry {
  month: string;
  income: number;
  expense: number;
  balance: number;
}

// ── Requests ─────────────────────────────────────────────────────────────────

// Request/Response Types

export interface CreateEmployeeRequest {
  email: string;
  password: string;
  name: string;
  phone?: string;
  role: EmployeeRole;
  departmentId?: string;
}

export interface UpdateEmployeeRequest {
  name?: string;
  phone?: string;
  role?: EmployeeRole;
  departmentId?: string;
  isActive?: boolean;
}

export interface CreateCustomerRequest {
  name: string;
  cpf: string;
  phone: string;
  email?: string;
  address?: Address;
  notes?: string;
  maintenanceIntervalMonths?: number;
  isTemporary?: boolean;
}

export interface CreateServiceOrderRequest {
  customerId?: string;
  customer?: CreateCustomerRequest;
  productType: string;
  productBrand: string;
  productModel: string;
  problemDescription: string;
  departmentId: string;
  images?: Image[];
  estimatedCost?: number;
  estimatedDelivery?: string; // ISO 8601 date string
  priority?: "low" | "normal" | "high" | "urgent";
}

export interface UpdateServiceOrderStatusRequest {
  status: ServiceOrderStatus;
  notes?: string;
}

export interface CreateDepartmentRequest {
  name: string;
  description?: string;
  managerId?: string;
  address?: Address;
}

export interface Profile {
  id: string;
  name: string;
  description?: string;
  permissions: string[]; // View permissions
  editPermissions?: string[]; // Edit permissions
  deletePermissions?: string[]; // Delete permissions
  isDefault: boolean;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}
