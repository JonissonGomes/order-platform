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
  CreateCustomerRequest,
  CreateServiceOrderRequest,
  UpdateServiceOrderStatusRequest,
  CreateDepartmentRequest,
  StatusHistory,
} from "@/types";

// VITE_API_URL é obrigatório para garantir segurança e consistência
const API_BASE_URL = import.meta.env.VITE_API_URL;

if (!API_BASE_URL) {
  console.error(
    "⚠️ VITE_API_URL não está configurado! " +
    "Configure no arquivo .env do frontend. " +
    "Exemplo: VITE_API_URL=http://localhost:8080 (dev) ou https://api.seusite.com (prod)"
  );
}

export interface User {
  id: string;
  email: string;
  name: string;
  role: "user" | "admin";
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
  }): Promise<{ order?: ServiceOrder; orders?: ServiceOrder[]; customer?: { name: string } }> {
    return fetchAPI<{ order?: ServiceOrder; orders?: ServiceOrder[]; customer?: { name: string } }>(
      "/api/public/service-orders/search",
      {
        method: "POST",
        body: JSON.stringify(data),
      }
    );
  },
};
