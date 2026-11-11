// Backend Models - TypeScript Types (ZTS Cell)

export * from "./stock";

export type UserRole = "user" | "admin" | "super_admin";

export interface User {
  id: string;
  email: string;
  name: string;
  role: UserRole;
  createdAt: string;
  updatedAt: string;
  lastSignedIn: string;
}

// Permissões no formato "recurso.ação" (ex: "service_orders.read"), "recurso.*" ou "*"
export type Permission = string;

export interface Profile {
  id: string;
  name: string;
  description?: string;
  permissions: Permission[];
  isDefault: boolean;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface Branch {
  id: string;
  name: string;
  code?: string;
  phone?: string;
  address?: string;
  isDefault: boolean;
  isActive: boolean;
}

export type EmployeeRole = "admin" | "department_manager" | "attendant" | "technician";

export interface Employee {
  id: string;
  userId: string;
  user?: User;
  name: string;
  email: string;
  phone?: string;
  role: EmployeeRole;
  profileId?: string;
  profile?: Profile;
  departmentId?: string;
  department?: Department;
  branchId?: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
  createdBy: string;
  updatedBy: string;
}

/** Usuário retornado em /auth/me (campos de auditoria podem faltar). */
export type SessionUser = Pick<User, "id" | "email" | "name" | "role"> & Partial<User>;

export interface AuthMe {
  user: SessionUser | null;
  employee?: Employee;
  permissions: Permission[];
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
  | "cancelled"
  | "unrepairable";

export interface Note {
  id: string;
  content: string;
  /** Visível no portal do cliente. */
  isPublic?: boolean;
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

export interface ServiceOrder {
  id: string;
  deviceLabel?: string;
  statusLabel?: string;
  orderNumber: string;
  customerId: string;
  customer?: Customer;
  productType: string;
  productBrand: string;
  productModel: string;
  imei?: string;
  serviceType?: string;
  problemDescription: string;
  initialEvaluation?: string;
  status: ServiceOrderStatus;
  departmentId?: string;
  department?: Department;
  branchId?: string;
  assignedTo?: string;
  assignedEmployee?: Employee;
  images?: Image[];
  checklist?: string[];
  estimatedCost?: number;
  finalCost?: number;
  depositAmount?: number;
  warrantyDays?: number;
  expectedAt?: string;
  technicalReport?: string;
  resolution?: string;
  laborOnly?: boolean;
  laborCost?: number;
  parts?: ServiceOrderPart[];
  notes?: Note[];
  statusHistory?: StatusHistory[];
  createdAt: string;
  updatedAt: string;
  createdBy: string;
  updatedBy: string;
  statusChangedBy?: string;
  statusChangedAt?: string;
}

export interface ServiceOrderPart {
  id: string;
  productId: string;
  name: string;
  sku?: string;
  barcode?: string;
  qty: number;
  unitPrice: number;
  unitCost: number;
  consumed?: boolean;
  createdAt: string;
  createdBy: string;
}

export interface Department {
  id: string;
  name: string;
  description?: string;
  managerId?: string;
  manager?: Employee;
  isActive: boolean;
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
  changes?: Record<string, unknown>;
  ip?: string;
  userAgent?: string;
  timestamp: string;
}

// Request/Response Types

export interface CreateEmployeeRequest {
  email: string;
  password: string;
  name: string;
  phone?: string;
  role: EmployeeRole;
  /** Obrigatório: única fonte de permissão do colaborador. */
  profileId: string;
  departmentId?: string;
}

export interface UpdateEmployeeRequest {
  name?: string;
  phone?: string;
  role?: EmployeeRole;
  profileId?: string;
  departmentId?: string;
  isActive?: boolean;
}

export interface CreateProfileRequest {
  name: string;
  description?: string;
  permissions: Permission[];
}

export type UpdateProfileRequest = Partial<CreateProfileRequest> & {
  isActive?: boolean;
};

export interface CreateCustomerRequest {
  name: string;
  cpf?: string;
  phone: string;
  email?: string;
  address?: Address;
}

export type UpdateCustomerRequest = Partial<CreateCustomerRequest>;

export interface CreateServiceOrderRequest {
  customerId: string;
  productType: string;
  productBrand: string;
  productModel: string;
  imei?: string;
  serviceType?: string;
  problemDescription: string;
  departmentId?: string;
  branchId?: string;
  /** Rótulos dos itens do checklist marcados na entrada. */
  checklist?: string[];
  estimatedCost?: number;
  depositAmount?: number;
  warrantyDays?: number;
  expectedAt?: string;
  images?: Image[];
}

export type UpdateServiceOrderRequest = Partial<CreateServiceOrderRequest> & {
  initialEvaluation?: string;
  finalCost?: number;
  assignedTo?: string;
};

export interface UpdateServiceOrderStatusRequest {
  status: ServiceOrderStatus;
  notes?: string;
}

export interface OrderCloseoutRequest {
  technicalReport: string;
  resolution: string;
  laborOnly: boolean;
  laborCost: number;
}

export interface AddOrderPartRequest {
  productId: string;
  qty: number;
}

export interface CreateDepartmentRequest {
  name: string;
  description?: string;
  managerId?: string;
}

export type UpdateDepartmentRequest = Partial<CreateDepartmentRequest> & {
  isActive?: boolean;
};

export interface ServiceOrderFilters {
  status?: ServiceOrderStatus;
  customerId?: string;
  assignedTo?: string;
  branchId?: string;
}
