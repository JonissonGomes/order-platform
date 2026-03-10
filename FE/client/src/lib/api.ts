// API client for REST API calls to Go backend
// 
// IMPORTANTE: VITE_API_URL deve ser configurado sempre (dev e prod)
// 
// Development:
//   - Configure VITE_API_URL=http://localhost:8080 no .env
//   - Configure CORS_ORIGINS no backend com as URLs do frontend
//   - O backend valida a origem via CORS para segurança
//
// Production:
//   - Configure VITE_API_URL=https://api.seusite.com no .env
//   - Configure CORS_ORIGINS no backend com as URLs permitidas
//   - Use HTTPS sempre em produção
//
// Segurança:
//   - CORS está configurado no backend para validar origens
//   - Cookies são HTTP-only e SameSite para proteção CSRF
//   - Credentials são enviados apenas para a origem configurada

import { handleHttpError, handleApiError } from "./errors";
import type {
  Customer,
  ServiceOrder,
  Department,
  Employee,
  EmployeeRole,
  CreateCustomerRequest,
  CreateServiceOrderRequest,
  UpdateServiceOrderStatusRequest,
  CreateDepartmentRequest,
  StatusHistory,
  Profile,
  StockItem,
  StockMovement,
  StockSummary,
  Transaction,
  FinancialSummary,
  CashFlowEntry,
  Settings,
} from "@/types";

// Em desenvolvimento sem VITE_API_URL, usa string vazia (Vite proxy cuida do /api/*)
// Em produção, VITE_API_URL deve apontar para a URL da API (ex: https://api.seusite.com)
const API_BASE_URL: string = import.meta.env.VITE_API_URL || "";

if (!import.meta.env.VITE_API_URL && import.meta.env.PROD) {
  console.error(
    "⚠️ VITE_API_URL não está configurado! " +
    "Configure no arquivo .env do frontend. " +
    "Exemplo: VITE_API_URL=https://api.seusite.com (prod)"
  );
}

export interface User {
  id: string;
  email: string;
  name: string;
  // "dono" = novo valor; "super_admin" mantido por retrocompatibilidade
  role: "user" | "admin" | "dono" | "super_admin";
  createdAt?: string;
  updatedAt?: string;
  lastSignedIn?: string;
}

export interface LoginRequest {
  email: string;
  password: string;
}

export interface RegisterRequest {
  email: string;
  password: string;
  name: string;
}

export interface AuthResponse {
  user: User;
}

async function fetchAPI<T>(
  endpoint: string,
  options: RequestInit = {}
): Promise<T> {
  const url = `${API_BASE_URL}${endpoint}`;
  
  let response: Response;
  
  try {
    response = await fetch(url, {
      ...options,
      headers: {
        "Content-Type": "application/json",
        ...options.headers,
      },
      credentials: "include", // Important for cookies
    });
  } catch (error) {
    // Network error (no response from server)
    const apiError = handleApiError(error);
    throw new Error(apiError.message);
  }

  if (!response.ok) {
    // HTTP error (response received but status is not ok)
    // Não lançar erro para 404 - silenciar
    if (response.status === 404) {
      throw new Error("status: 404"); // Marca como 404 mas sem mensagem visível
    }
    const apiError = await handleHttpError(response);
    throw new Error(apiError.message);
  }

  return response.json();
}

export const api = {
  // Auth endpoints
  async login(data: LoginRequest): Promise<AuthResponse> {
    return fetchAPI<AuthResponse>("/api/auth/login", {
      method: "POST",
      body: JSON.stringify(data),
    });
  },

  async register(data: RegisterRequest): Promise<AuthResponse> {
    return fetchAPI<AuthResponse>("/api/auth/register", {
      method: "POST",
      body: JSON.stringify(data),
    });
  },

  async registerCustomer(data: {
    name: string;
    email: string;
    password: string;
    cpf?: string;
    phone: string;
    address?: {
      street?: string;
      number?: string;
      complement?: string;
      neighborhood?: string;
      city?: string;
      state?: string;
      zipCode?: string;
    };
    notes?: string;
  }): Promise<{ user: any; customer: any }> {
    return fetchAPI<{ user: any; customer: any }>("/api/public/register", {
      method: "POST",
      body: JSON.stringify(data),
    });
  },

  async getMe(): Promise<{ user: User | null }> {
    return fetchAPI<{ user: User | null }>("/api/auth/me");
  },

  async logout(): Promise<{ success: boolean }> {
    return fetchAPI<{ success: boolean }>("/api/auth/logout", {
      method: "POST",
    });
  },

  // Employee endpoints
  async listEmployees(): Promise<{ employees: Employee[] }> {
    return fetchAPI<{ employees: Employee[] }>("/api/employees");
  },
  async createEmployee(data: {
    name: string;
    email: string;
    password: string;
    phone?: string;
    role: EmployeeRole;
    departmentId?: string;
  }): Promise<{ employee: Employee }> {
    return fetchAPI<{ employee: Employee }>("/api/employees", {
      method: "POST",
      body: JSON.stringify(data),
    });
  },
  async getEmployee(id: string): Promise<{ employee: Employee }> {
    return fetchAPI<{ employee: Employee }>(`/api/employees/${id}`);
  },
  async updateEmployee(id: string, data: {
    name?: string;
    phone?: string;
    role?: EmployeeRole;
    departmentId?: string;
    isActive?: boolean;
  }): Promise<{ employee: Employee }> {
    return fetchAPI<{ employee: Employee }>(`/api/employees/${id}`, {
      method: "PUT",
      body: JSON.stringify(data),
    });
  },

  async suspendEmployee(id: string): Promise<{ success: boolean; message: string }> {
    return fetchAPI<{ success: boolean; message: string }>(`/api/employees/${id}/suspend`, {
      method: "POST",
    });
  },

  async unsuspendEmployee(id: string): Promise<{ success: boolean; message: string }> {
    return fetchAPI<{ success: boolean; message: string }>(`/api/employees/${id}/unsuspend`, {
      method: "POST",
    });
  },

  // Customer endpoints
  async createCustomer(data: CreateCustomerRequest): Promise<{ customer: Customer }> {
    return fetchAPI<{ customer: Customer }>("/api/customers", {
      method: "POST",
      body: JSON.stringify(data),
    });
  },

  async getCustomer(id: string): Promise<{ customer: Customer }> {
    return fetchAPI<{ customer: Customer }>(`/api/customers/${id}`);
  },

  async getCustomerByCPF(cpf: string): Promise<{ customer: Customer }> {
    return fetchAPI<{ customer: Customer }>(`/api/customers/search/cpf?cpf=${encodeURIComponent(cpf)}`);
  },

  async getCustomerByPhone(phone: string): Promise<{ customer: Customer }> {
    return fetchAPI<{ customer: Customer }>(`/api/customers/search/phone?phone=${encodeURIComponent(phone)}`);
  },

  async listCustomers(params?: {
    page?: number;
    limit?: number;
    name?: string;
    cpf?: string;
    phone?: string;
  }): Promise<{ customers: Customer[]; pagination: { page: number; limit: number; total: number } }> {
    const queryParams = new URLSearchParams();
    if (params?.page) queryParams.append("page", params.page.toString());
    if (params?.limit) queryParams.append("limit", params.limit.toString());
    if (params?.name) queryParams.append("name", params.name);
    if (params?.cpf) queryParams.append("cpf", params.cpf);
    if (params?.phone) queryParams.append("phone", params.phone);

    const query = queryParams.toString();
    return fetchAPI<{ customers: Customer[]; pagination: { page: number; limit: number; total: number } }>(
      `/api/customers${query ? `?${query}` : ""}`
    );
  },

  async updateCustomer(id: string, data: Partial<CreateCustomerRequest>): Promise<{ customer: Customer }> {
    return fetchAPI<{ customer: Customer }>(`/api/customers/${id}`, {
      method: "PUT",
      body: JSON.stringify(data),
    });
  },

  async deleteCustomer(id: string): Promise<{ success: boolean }> {
    return fetchAPI<{ success: boolean }>(`/api/customers/${id}`, {
      method: "DELETE",
    });
  },

  async getCustomerServiceOrders(id: string): Promise<{ orders: ServiceOrder[] }> {
    return fetchAPI<{ orders: ServiceOrder[] }>(`/api/customers/${id}/orders`);
  },

  // Service Order endpoints
  async createServiceOrder(data: CreateServiceOrderRequest): Promise<{ order: ServiceOrder }> {
    return fetchAPI<{ order: ServiceOrder }>("/api/service-orders", {
      method: "POST",
      body: JSON.stringify(data),
    });
  },

  async getServiceOrder(id: string): Promise<{ order: ServiceOrder }> {
    return fetchAPI<{ order: ServiceOrder }>(`/api/service-orders/${id}`);
  },

  async listServiceOrders(params?: {
    page?: number;
    limit?: number;
    status?: string;
    departmentId?: string;
    customerId?: string;
    assignedTo?: string;
    priority?: string;
  }): Promise<{ orders: ServiceOrder[]; pagination: { page: number; limit: number; total: number } }> {
    const queryParams = new URLSearchParams();
    if (params?.page) queryParams.append("page", params.page.toString());
    if (params?.limit) queryParams.append("limit", params.limit.toString());
    if (params?.status) queryParams.append("status", params.status);
    if (params?.departmentId) queryParams.append("departmentId", params.departmentId);
    if (params?.customerId) queryParams.append("customerId", params.customerId);
    if (params?.assignedTo) queryParams.append("assignedTo", params.assignedTo);

    const query = queryParams.toString();
    return fetchAPI<{ orders: ServiceOrder[]; pagination: { page: number; limit: number; total: number } }>(
      `/api/service-orders${query ? `?${query}` : ""}`
    );
  },

  async updateServiceOrder(id: string, data: Partial<CreateServiceOrderRequest>): Promise<{ order: ServiceOrder }> {
    return fetchAPI<{ order: ServiceOrder }>(`/api/service-orders/${id}`, {
      method: "PUT",
      body: JSON.stringify(data),
    });
  },

  async deleteServiceOrder(id: string): Promise<{ success: boolean }> {
    return fetchAPI<{ success: boolean }>(`/api/service-orders/${id}`, {
      method: "DELETE",
    });
  },

  async updateServiceOrderStatus(
    id: string,
    data: UpdateServiceOrderStatusRequest
  ): Promise<{ order: ServiceOrder; statusHistory: StatusHistory }> {
    return fetchAPI<{ order: ServiceOrder; statusHistory: StatusHistory }>(`/api/service-orders/${id}/status`, {
      method: "PATCH",
      body: JSON.stringify(data),
    });
  },

  async assignServiceOrder(id: string, employeeId: string): Promise<{ order: ServiceOrder }> {
    return fetchAPI<{ order: ServiceOrder }>(`/api/service-orders/${id}/assign`, {
      method: "PATCH",
      body: JSON.stringify({ employeeId }),
    });
  },

  async addNoteToServiceOrder(id: string, content: string): Promise<{ order: ServiceOrder }> {
    return fetchAPI<{ order: ServiceOrder }>(`/api/service-orders/${id}/notes`, {
      method: "POST",
      body: JSON.stringify({ content }),
    });
  },

  async getServiceOrderHistory(id: string): Promise<{ statusHistory: StatusHistory[] }> {
    return fetchAPI<{ statusHistory: StatusHistory[] }>(`/api/service-orders/${id}/history`);
  },

  // Department endpoints
  async createDepartment(data: CreateDepartmentRequest): Promise<{ department: Department }> {
    return fetchAPI<{ department: Department }>("/api/departments", {
      method: "POST",
      body: JSON.stringify(data),
    });
  },

  async getDepartment(id: string): Promise<{ department: Department }> {
    return fetchAPI<{ department: Department }>(`/api/departments/${id}`);
  },

  async listDepartments(params?: { isActive?: boolean }): Promise<{ departments: Department[] }> {
    const queryParams = new URLSearchParams();
    if (params?.isActive !== undefined) queryParams.append("isActive", params.isActive.toString());

    const query = queryParams.toString();
    return fetchAPI<{ departments: Department[] }>(`/api/departments${query ? `?${query}` : ""}`);
  },

  async updateDepartment(id: string, data: Partial<CreateDepartmentRequest & { isActive?: boolean }>): Promise<{ department: Department }> {
    return fetchAPI<{ department: Department }>(`/api/departments/${id}`, {
      method: "PUT",
      body: JSON.stringify(data),
    });
  },

  async deleteDepartment(id: string): Promise<{ success: boolean }> {
    return fetchAPI<{ success: boolean }>(`/api/departments/${id}`, {
      method: "DELETE",
    });
  },

  async getDepartmentEmployees(id: string): Promise<{ employees: Employee[] }> {
    return fetchAPI<{ employees: Employee[] }>(`/api/departments/${id}/employees`);
  },

  async getDepartmentServiceOrders(id: string, status?: string): Promise<{ orders: ServiceOrder[] }> {
    const queryParams = new URLSearchParams();
    if (status) queryParams.append("status", status);

    const query = queryParams.toString();
    return fetchAPI<{ orders: ServiceOrder[] }>(`/api/departments/${id}/orders${query ? `?${query}` : ""}`);
  },

  // Public endpoints (no auth required)
  async getPublicServiceOrder(orderNumber: string): Promise<{ order: ServiceOrder }> {
    return fetchAPI<{ order: ServiceOrder }>(`/api/public/service-orders/${orderNumber}`);
  },

  async searchPublicServiceOrder(data: {
    orderNumber?: string;
    cpf?: string;
    phone?: string;
    email?: string;
  }): Promise<{ order?: ServiceOrder; orders?: ServiceOrder[]; customer?: { name: string } }> {
    return fetchAPI<{ order?: ServiceOrder; orders?: ServiceOrder[]; customer?: { name: string } }>(
      "/api/public/service-orders/search",
      {
        method: "POST",
        body: JSON.stringify(data),
      }
    );
  },

  // Profile endpoints
  async listProfiles(): Promise<{ profiles: Profile[] }> {
    return fetchAPI<{ profiles: Profile[] }>("/api/profiles");
  },
  async getProfile(id: string): Promise<{ profile: Profile }> {
    return fetchAPI<{ profile: Profile }>(`/api/profiles/${id}`);
  },
  async getProfileByName(name: string): Promise<{ profile: Profile }> {
    return fetchAPI<{ profile: Profile }>(`/api/profiles/name/${encodeURIComponent(name)}`);
  },
  async getAvailableModules(): Promise<{ modules: string[] }> {
    return fetchAPI<{ modules: string[] }>("/api/profiles/modules/available");
  },
  async updateProfilePermissions(
    name: string,
    permissions: string[],
    editPermissions: string[],
    deletePermissions: string[]
  ): Promise<{ profile: Profile }> {
    return fetchAPI<{ profile: Profile }>(`/api/profiles/${encodeURIComponent(name)}/permissions`, {
      method: "PUT",
      body: JSON.stringify({
        permissions,
        editPermissions,
        deletePermissions,
      }),
    });
  },

  // ── Stock endpoints ──────────────────────────────────────────────────────

  async getStockSummary(): Promise<{ summary: StockSummary }> {
    return fetchAPI<{ summary: StockSummary }>("/api/stock/summary");
  },

  async listStockItems(params?: {
    page?: number;
    limit?: number;
    category?: string;
    name?: string;
    lowStock?: boolean;
  }): Promise<{ items: StockItem[]; pagination: { page: number; limit: number; total: number } }> {
    const q = new URLSearchParams();
    if (params?.page) q.append("page", params.page.toString());
    if (params?.limit) q.append("limit", params.limit.toString());
    if (params?.category) q.append("category", params.category);
    if (params?.name) q.append("name", params.name);
    if (params?.lowStock) q.append("lowStock", "true");
    const qs = q.toString();
    return fetchAPI(`/api/stock${qs ? `?${qs}` : ""}`);
  },

  async getStockItem(id: string): Promise<{ item: StockItem }> {
    return fetchAPI<{ item: StockItem }>(`/api/stock/${id}`);
  },

  async createStockItem(data: {
    name: string;
    sku?: string;
    category: string;
    description?: string;
    quantity?: number;
    minQuantity?: number;
    costPrice?: number;
    sellingPrice?: number;
    supplier?: string;
    location?: string;
  }): Promise<{ item: StockItem }> {
    return fetchAPI<{ item: StockItem }>("/api/stock", {
      method: "POST",
      body: JSON.stringify(data),
    });
  },

  async updateStockItem(id: string, data: Partial<StockItem>): Promise<{ item: StockItem }> {
    return fetchAPI<{ item: StockItem }>(`/api/stock/${id}`, {
      method: "PUT",
      body: JSON.stringify(data),
    });
  },

  async deleteStockItem(id: string): Promise<void> {
    return fetchAPI(`/api/stock/${id}`, { method: "DELETE" });
  },

  async createStockMovement(
    itemId: string,
    data: {
      type: string;
      reason: string;
      quantity: number;
      unitCost?: number;
      serviceOrderId?: string;
      notes?: string;
      newQuantity?: number;
    }
  ): Promise<{ movement: StockMovement; item: StockItem }> {
    return fetchAPI<{ movement: StockMovement; item: StockItem }>(`/api/stock/${itemId}/movements`, {
      method: "POST",
      body: JSON.stringify(data),
    });
  },

  async listStockMovements(params?: {
    itemId?: string;
    page?: number;
    limit?: number;
    type?: string;
  }): Promise<{ movements: StockMovement[]; pagination: { page: number; limit: number; total: number } }> {
    const q = new URLSearchParams();
    if (params?.page) q.append("page", params.page.toString());
    if (params?.limit) q.append("limit", params.limit.toString());
    if (params?.type) q.append("type", params.type);
    const qs = q.toString();

    const base = params?.itemId
      ? `/api/stock/${params.itemId}/movements`
      : "/api/stock/movements";
    return fetchAPI(`${base}${qs ? `?${qs}` : ""}`);
  },

  // ── Financial endpoints ──────────────────────────────────────────────────

  async getFinancialSummary(month?: string): Promise<{ summary: FinancialSummary }> {
    const q = month ? `?month=${month}` : "";
    return fetchAPI<{ summary: FinancialSummary }>(`/api/financial/summary${q}`);
  },

  async getFinancialCashFlow(months?: number): Promise<{ cashFlow: CashFlowEntry[] }> {
    const q = months ? `?months=${months}` : "";
    return fetchAPI<{ cashFlow: CashFlowEntry[] }>(`/api/financial/cash-flow${q}`);
  },

  async listTransactions(params?: {
    page?: number;
    limit?: number;
    type?: string;
    category?: string;
    isPaid?: boolean;
    month?: string;
    from?: string;
    to?: string;
  }): Promise<{ transactions: Transaction[]; pagination: { page: number; limit: number; total: number } }> {
    const q = new URLSearchParams();
    if (params?.page) q.append("page", params.page.toString());
    if (params?.limit) q.append("limit", params.limit.toString());
    if (params?.type) q.append("type", params.type);
    if (params?.category) q.append("category", params.category);
    if (params?.isPaid !== undefined) q.append("isPaid", params.isPaid.toString());
    if (params?.month) q.append("month", params.month);
    if (params?.from) q.append("from", params.from);
    if (params?.to) q.append("to", params.to);
    const qs = q.toString();
    return fetchAPI(`/api/financial/transactions${qs ? `?${qs}` : ""}`);
  },

  async createTransaction(data: {
    type: string;
    category: string;
    description: string;
    amount: number;
    paymentMethod: string;
    serviceOrderId?: string;
    stockItemId?: string;
    referenceDate?: string;
    dueDate?: string;
    isPaid?: boolean;
    notes?: string;
  }): Promise<{ transaction: Transaction }> {
    return fetchAPI<{ transaction: Transaction }>("/api/financial/transactions", {
      method: "POST",
      body: JSON.stringify(data),
    });
  },

  async updateTransaction(
    id: string,
    data: Partial<{ description: string; amount: number; paymentMethod: string; isPaid: boolean; notes: string; dueDate: string }>
  ): Promise<{ transaction: Transaction }> {
    return fetchAPI<{ transaction: Transaction }>(`/api/financial/transactions/${id}`, {
      method: "PUT",
      body: JSON.stringify(data),
    });
  },

  async markTransactionAsPaid(id: string): Promise<{ transaction: Transaction }> {
    return fetchAPI<{ transaction: Transaction }>(`/api/financial/transactions/${id}/pay`, {
      method: "PATCH",
    });
  },

  async deleteTransaction(id: string): Promise<{ success: boolean }> {
    return fetchAPI<{ success: boolean }>(`/api/financial/transactions/${id}`, {
      method: "DELETE",
    });
  },

  // ── Settings endpoints ─────────────────────────────────────────────────────

  async getSettings(): Promise<{ settings: Settings }> {
    return fetchAPI<{ settings: Settings }>("/api/settings");
  },

  async updateSettings(data: Partial<Settings>): Promise<{ settings: Settings }> {
    return fetchAPI<{ settings: Settings }>("/api/settings", {
      method: "PUT",
      body: JSON.stringify(data),
    });
  },

  // ── Reports endpoints ─────────────────────────────────────────────────────

  async getServiceOrderReport(params?: {
    startDate?: string;
    endDate?: string;
    departmentId?: string;
    status?: string;
    employeeId?: string;
  }): Promise<{ report: any }> {
    const queryParams = new URLSearchParams();
    if (params?.startDate) queryParams.append("startDate", params.startDate);
    if (params?.endDate) queryParams.append("endDate", params.endDate);
    if (params?.departmentId) queryParams.append("departmentId", params.departmentId);
    if (params?.status) queryParams.append("status", params.status);
    if (params?.employeeId) queryParams.append("employeeId", params.employeeId);
    const query = queryParams.toString();
    return fetchAPI<{ report: any }>(`/api/reports/service-orders${query ? `?${query}` : ""}`);
  },

  async getFinancialReport(params?: {
    startDate?: string;
    endDate?: string;
    category?: string;
    type?: string;
  }): Promise<{ report: any }> {
    const queryParams = new URLSearchParams();
    if (params?.startDate) queryParams.append("startDate", params.startDate);
    if (params?.endDate) queryParams.append("endDate", params.endDate);
    if (params?.category) queryParams.append("category", params.category);
    if (params?.type) queryParams.append("type", params.type);
    const query = queryParams.toString();
    return fetchAPI<{ report: any }>(`/api/reports/financial${query ? `?${query}` : ""}`);
  },

  async getStockReport(params?: {
    startDate?: string;
    endDate?: string;
  }): Promise<{ report: any }> {
    const queryParams = new URLSearchParams();
    if (params?.startDate) queryParams.append("startDate", params.startDate);
    if (params?.endDate) queryParams.append("endDate", params.endDate);
    const query = queryParams.toString();
    return fetchAPI<{ report: any }>(`/api/reports/stock${query ? `?${query}` : ""}`);
  },

  async getCustomerReport(params?: {
    startDate?: string;
    endDate?: string;
    customerId?: string;
  }): Promise<{ report: any }> {
    const queryParams = new URLSearchParams();
    if (params?.startDate) queryParams.append("startDate", params.startDate);
    if (params?.endDate) queryParams.append("endDate", params.endDate);
    if (params?.customerId) queryParams.append("customerId", params.customerId);
    const query = queryParams.toString();
    return fetchAPI<{ report: any }>(`/api/reports/customers${query ? `?${query}` : ""}`);
  },

  async getDashboardReport(params?: {
    startDate?: string;
    endDate?: string;
    departmentId?: string;
  }): Promise<{ report: any }> {
    const queryParams = new URLSearchParams();
    if (params?.startDate) queryParams.append("startDate", params.startDate);
    if (params?.endDate) queryParams.append("endDate", params.endDate);
    if (params?.departmentId) queryParams.append("departmentId", params.departmentId);
    const query = queryParams.toString();
    return fetchAPI<{ report: any }>(`/api/reports/dashboard${query ? `?${query}` : ""}`);
  },

  async exportReport(report: string, type: "pdf" | "excel" | "csv"): Promise<Blob> {
    return fetchAPI<Blob>(`/api/reports/export?report=${report}&type=${type}`);
  },

  // ── Quotations endpoints ─────────────────────────────────────────────────────

  async listQuotations(params?: {
    page?: number;
    limit?: number;
    status?: string;
    customerId?: string;
  }): Promise<{ quotations: any[]; pagination: any }> {
    const queryParams = new URLSearchParams();
    if (params?.page) queryParams.append("page", params.page.toString());
    if (params?.limit) queryParams.append("limit", params.limit.toString());
    if (params?.status) queryParams.append("status", params.status);
    if (params?.customerId) queryParams.append("customerId", params.customerId);
    const query = queryParams.toString();
    return fetchAPI<{ quotations: any[]; pagination: any }>(`/api/quotations${query ? `?${query}` : ""}`);
  },

  async createQuotation(data: {
    customerId: string;
    departmentId: string;
    items: any[];
    discount?: number;
    validUntil?: string;
    notes?: string;
  }): Promise<{ quotation: any }> {
    return fetchAPI<{ quotation: any }>("/api/quotations", {
      method: "POST",
      body: JSON.stringify(data),
    });
  },

  async getQuotation(id: string): Promise<{ quotation: any }> {
    return fetchAPI<{ quotation: any }>(`/api/quotations/${id}`);
  },

  async updateQuotation(id: string, data: Partial<any>): Promise<{ quotation: any }> {
    return fetchAPI<{ quotation: any }>(`/api/quotations/${id}`, {
      method: "PUT",
      body: JSON.stringify(data),
    });
  },

  async convertQuotationToServiceOrder(id: string): Promise<{ message: string; serviceOrderId: string; quotation: any }> {
    return fetchAPI<{ message: string; serviceOrderId: string; quotation: any }>(`/api/quotations/${id}/convert`, {
      method: "POST",
    });
  },

  async deleteQuotation(id: string): Promise<{ message: string }> {
    return fetchAPI<{ message: string }>(`/api/quotations/${id}`, {
      method: "DELETE",
    });
  },

  // ── Suppliers endpoints ─────────────────────────────────────────────────────

  async listSuppliers(params?: {
    page?: number;
    limit?: number;
    search?: string;
  }): Promise<{ suppliers: any[]; pagination: any }> {
    const queryParams = new URLSearchParams();
    if (params?.page) queryParams.append("page", params.page.toString());
    if (params?.limit) queryParams.append("limit", params.limit.toString());
    if (params?.search) queryParams.append("search", params.search);
    const query = queryParams.toString();
    return fetchAPI<{ suppliers: any[]; pagination: any }>(`/api/suppliers${query ? `?${query}` : ""}`);
  },

  async createSupplier(data: {
    name: string;
    cnpj?: string;
    cpf?: string;
    email?: string;
    phone?: string;
    address?: any;
    contactName?: string;
    notes?: string;
  }): Promise<{ supplier: any }> {
    return fetchAPI<{ supplier: any }>("/api/suppliers", {
      method: "POST",
      body: JSON.stringify(data),
    });
  },

  async getSupplier(id: string): Promise<{ supplier: any }> {
    return fetchAPI<{ supplier: any }>(`/api/suppliers/${id}`);
  },

  async updateSupplier(id: string, data: Partial<any>): Promise<{ supplier: any }> {
    return fetchAPI<{ supplier: any }>(`/api/suppliers/${id}`, {
      method: "PUT",
      body: JSON.stringify(data),
    });
  },

  async deleteSupplier(id: string): Promise<{ message: string }> {
    return fetchAPI<{ message: string }>(`/api/suppliers/${id}`, {
      method: "DELETE",
    });
  },

  // ── Purchase Orders endpoints ───────────────────────────────────────────────

  async listPurchaseOrders(params?: {
    page?: number;
    limit?: number;
    status?: string;
    supplierId?: string;
  }): Promise<{ purchaseOrders: any[]; pagination: any }> {
    const queryParams = new URLSearchParams();
    if (params?.page) queryParams.append("page", params.page.toString());
    if (params?.limit) queryParams.append("limit", params.limit.toString());
    if (params?.status) queryParams.append("status", params.status);
    if (params?.supplierId) queryParams.append("supplierId", params.supplierId);
    const query = queryParams.toString();
    return fetchAPI<{ purchaseOrders: any[]; pagination: any }>(`/api/purchase-orders${query ? `?${query}` : ""}`);
  },

  async createPurchaseOrder(data: {
    supplierId: string;
    items: any[];
    shippingCost?: number;
    expectedDelivery?: string;
    notes?: string;
  }): Promise<{ purchaseOrder: any }> {
    return fetchAPI<{ purchaseOrder: any }>("/api/purchase-orders", {
      method: "POST",
      body: JSON.stringify(data),
    });
  },

  async getPurchaseOrder(id: string): Promise<{ purchaseOrder: any }> {
    return fetchAPI<{ purchaseOrder: any }>(`/api/purchase-orders/${id}`);
  },

  async updatePurchaseOrder(id: string, data: Partial<any>): Promise<{ purchaseOrder: any }> {
    return fetchAPI<{ purchaseOrder: any }>(`/api/purchase-orders/${id}`, {
      method: "PUT",
      body: JSON.stringify(data),
    });
  },

  async deletePurchaseOrder(id: string): Promise<{ message: string }> {
    return fetchAPI<{ message: string }>(`/api/purchase-orders/${id}`, {
      method: "DELETE",
    });
  },

  // ── Notifications endpoints ────────────────────────────────────────────────

  async listNotifications(params?: {
    page?: number;
    limit?: number;
    unread?: boolean;
  }): Promise<{ notifications: any[]; unreadCount: number; pagination: any }> {
    const queryParams = new URLSearchParams();
    if (params?.page) queryParams.append("page", params.page.toString());
    if (params?.limit) queryParams.append("limit", params.limit.toString());
    if (params?.unread) queryParams.append("unread", "true");
    const query = queryParams.toString();
    return fetchAPI<{ notifications: any[]; unreadCount: number; pagination: any }>(`/api/notifications${query ? `?${query}` : ""}`);
  },

  async getUnreadCount(): Promise<{ count: number }> {
    return fetchAPI<{ count: number }>("/api/notifications/unread-count");
  },

  async markNotificationAsRead(id: string): Promise<{ message: string }> {
    return fetchAPI<{ message: string }>(`/api/notifications/${id}/read`, {
      method: "POST",
    });
  },

  async markAllNotificationsAsRead(): Promise<{ message: string }> {
    return fetchAPI<{ message: string }>("/api/notifications/read-all", {
      method: "POST",
    });
  },

  // ── Payment endpoints ────────────────────────────────────────────────────────

  async createPayment(data: {
    amount: number;
    currency: string;
    description: string;
    orderId: string;
    customerId: string;
    metadata?: Record<string, string>;
  }): Promise<{ payment: { paymentId: string; paymentLink: string; status: string; amount: number } }> {
    return fetchAPI<{ payment: { paymentId: string; paymentLink: string; status: string; amount: number } }>("/api/payments/create", {
      method: "POST",
      body: JSON.stringify(data),
    });
  },

  async getPaymentStatus(paymentId: string): Promise<{ status: string }> {
    return fetchAPI<{ status: string }>(`/api/payments/${paymentId}/status`);
  },
};
