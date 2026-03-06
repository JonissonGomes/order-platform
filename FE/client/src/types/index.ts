// Backend Models - TypeScript Types

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

export type EmployeeRole = "admin" | "department_manager" | "attendant" | "technician";

export interface Employee {
  id: string;
  userId: string;
  user?: User;
  name: string;
  email: string;
  phone?: string;
  role: EmployeeRole;
  departmentId?: string;
  department?: Department;
  isActive: boolean;
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

export interface ServiceOrder {
  id: string;
  orderNumber: string;
  customerId: string;
  customer?: Customer;
  productType: string;
  productBrand: string;
  productModel: string;
  problemDescription: string;
  initialEvaluation?: string;
  status: ServiceOrderStatus;
  departmentId: string;
  department?: Department;
  assignedTo?: string;
  assignedEmployee?: Employee;
  images?: Image[];
  estimatedCost?: number;
  finalCost?: number;
  estimatedDelivery?: string; // Data estimada de entrega
  priority?: "low" | "normal" | "high" | "urgent"; // Prioridade (não mostrada para clientes)
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
  managerId?: string;
  manager?: Employee;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
  createdBy: string;
  updatedBy: string;
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
}
