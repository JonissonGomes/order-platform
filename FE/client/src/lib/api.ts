// API client (REST - backend Go). Ver apiClient.ts para configuração de base URL.
// Contrato de rotas/respostas espelha backend/internal/router (chaves envelopadas: { orders }, { order }, ...).
import { fetchAPI, itemOf, jsonBody, listOf, qs } from "./apiClient";
import type {
  AdjustStockRequest,
  AuthMe,
  Branch,
  CashMovement,
  CashSession,
  CashSessionMovements,
  CashSessionState,
  CloseCashRequest,
  CreateCashMovementRequest,
  CreateCustomerRequest,
  CreateDepartmentRequest,
  CreateEmployeeRequest,
  CreateProductRequest,
  CreateProfileRequest,
  CreateServiceOrderRequest,
  Customer,
  Department,
  Employee,
  InventoryMovement,
  Note,
  OpenCashRequest,
  PortalLookup,
  PortalLookupRequest,
  Product,
  Profile,
  ServiceOrder,
  ServiceOrderFilters,
  StatusHistory,
  UpdateCustomerRequest,
  UpdateDepartmentRequest,
  UpdateEmployeeRequest,
  UpdateProductRequest,
  UpdateProfileRequest,
  UpdateServiceOrderRequest,
  UpdateServiceOrderStatusRequest,
} from "@/types";

export { API_BASE_URL } from "./apiClient";

export interface User {
  id: string;
  email: string;
  name: string;
  role: "user" | "admin" | "super_admin";
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

/** Tamanho de página máximo aceito pelo backend (maxPageSize). */
const PAGE_LIMIT = 200;

const send = (method: string, data?: unknown): RequestInit => ({
  method,
  ...(data === undefined ? {} : jsonBody(data)),
});

/** Gera os métodos CRUD padrão de um recurso REST. */
function crud<T, C, U>(base: string, listKey: string, itemKey: string) {
  return {
    list: async (params?: object) =>
      listOf<T>(await fetchAPI<unknown>(`${base}${qs({ limit: PAGE_LIMIT, ...params })}`), listKey),
    get: async (id: string) => itemOf<T>(await fetchAPI<unknown>(`${base}/${id}`), itemKey),
    create: async (data: C) =>
      itemOf<T>(await fetchAPI<unknown>(base, send("POST", data)), itemKey),
    update: async (id: string, data: U) =>
      itemOf<T>(await fetchAPI<unknown>(`${base}/${id}`, send("PUT", data)), itemKey),
  };
}

/** Retorna user + employee + permissions. Backends antigos devolvem só `user`. */
async function me(): Promise<AuthMe> {
  const res = await fetchAPI<Partial<AuthMe>>("/api/auth/me");
  return {
    user: res?.user ?? null,
    employee: res?.employee ?? undefined,
    permissions: Array.isArray(res?.permissions) ? res.permissions : [],
  };
}

const serviceOrderCrud = crud<
  ServiceOrder,
  CreateServiceOrderRequest,
  UpdateServiceOrderRequest
>("/api/service-orders", "orders", "order");

const productCrud = crud<Product, CreateProductRequest, UpdateProductRequest>(
  "/api/products", "products", "product"
);

export const api = {
  // Auth
  login: (data: LoginRequest) => fetchAPI<AuthResponse>("/api/auth/login", send("POST", data)),
  register: (data: RegisterRequest) =>
    fetchAPI<AuthResponse>("/api/auth/register", send("POST", data)),
  me,
  /** Alias retrocompatível. */
  getMe: me,
  logout: () => fetchAPI<{ success: boolean }>("/api/auth/logout", send("POST")),

  // Colaboradores / perfis / setores / filiais
  employees: crud<Employee, CreateEmployeeRequest, UpdateEmployeeRequest>(
    "/api/employees", "employees", "employee"
  ),
  profiles: crud<Profile, CreateProfileRequest, UpdateProfileRequest>(
    "/api/profiles", "profiles", "profile"
  ),
  departments: crud<Department, CreateDepartmentRequest, UpdateDepartmentRequest>(
    "/api/departments", "departments", "department"
  ),
  branches: {
    list: async () => listOf<Branch>(await fetchAPI<unknown>("/api/branches"), "branches"),
  },

  // Clientes (busca: ?q=)
  customers: crud<Customer, CreateCustomerRequest, UpdateCustomerRequest>(
    "/api/customers", "customers", "customer"
  ),

  // Ordens de serviço
  serviceOrders: {
    ...serviceOrderCrud,
    list: (filters?: ServiceOrderFilters) => serviceOrderCrud.list(filters),
    /** GET /:id devolve { order, history }; o histórico é anexado em statusHistory. */
    get: async (id: string): Promise<ServiceOrder> => {
      const res = await fetchAPI<{ order: ServiceOrder; history?: StatusHistory[] }>(
        `/api/service-orders/${id}`
      );
      return { ...res.order, statusHistory: res.history ?? [] };
    },
    updateStatus: async (id: string, data: UpdateServiceOrderStatusRequest) =>
      itemOf<ServiceOrder>(
        await fetchAPI<unknown>(`/api/service-orders/${id}/status`, send("PATCH", data)),
        "order"
      ),
    addNote: async (id: string, content: string, isPublic = false) =>
      itemOf<Note>(
        await fetchAPI<unknown>(
          `/api/service-orders/${id}/notes`,
          send("POST", { content, isPublic })
        ),
        "note"
      ),
  },

  // Produtos / estoque (busca: ?q=, ?lowStock=true)
  products: {
    ...productCrud,
    byBarcode: async (code: string) =>
      itemOf<Product>(
        await fetchAPI<unknown>(`/api/products/barcode/${encodeURIComponent(code)}`),
        "product"
      ),
    adjust: async (id: string, data: AdjustStockRequest) =>
      fetchAPI<{ product: Product; movement: InventoryMovement }>(
        `/api/products/${id}/adjust`,
        send("POST", data)
      ),
    movements: async (productId: string) =>
      listOf<InventoryMovement>(
        await fetchAPI<unknown>(`/api/products/${productId}/movements`),
        "movements"
      ),
  },

  // Caixa
  cash: {
    /** Sessão aberta da filial (session = null se fechado) + resumo. */
    current: async (): Promise<CashSessionState> => {
      const res = await fetchAPI<Partial<CashSessionState>>("/api/cash/session");
      return { session: res?.session?.id ? res.session : null, summary: res?.summary };
    },
    open: async (data: OpenCashRequest) =>
      itemOf<CashSession>(await fetchAPI<unknown>("/api/cash/open", send("POST", data)), "session"),
    close: async (data: CloseCashRequest) =>
      itemOf<CashSession>(await fetchAPI<unknown>("/api/cash/close", send("POST", data)), "session"),
    sessionMovements: async (sessionId: string): Promise<CashSessionMovements> => {
      const res = await fetchAPI<Partial<CashSessionMovements>>(
        `/api/cash/sessions/${sessionId}/movements`
      );
      return {
        session: res?.session ?? null,
        movements: Array.isArray(res?.movements) ? res.movements : [],
        summary: res?.summary,
      };
    },
    addMovement: async (data: CreateCashMovementRequest) =>
      itemOf<CashMovement>(
        await fetchAPI<unknown>("/api/cash/movements", send("POST", data)),
        "movement"
      ),
  },

  // Portal público do cliente (sem autenticação)
  portalLookup: async (data: PortalLookupRequest) =>
    itemOf<PortalLookup>(await fetchAPI<unknown>("/api/portal/lookup", send("POST", data)), "order"),
};
