import { api } from "@/lib/api";
import type { ServiceOrderFilters } from "@/types";
import { useQuery } from "@tanstack/react-query";

/** Chaves de cache centralizadas (usadas também em invalidateQueries). */
export const qk = {
  orders: ["service-orders"] as const,
  customers: ["customers"] as const,
  products: ["products"] as const,
  departments: ["departments"] as const,
  employees: ["employees"] as const,
  profiles: ["profiles"] as const,
  branches: ["branches"] as const,
  cash: ["cash"] as const,
  cashCurrent: ["cash", "current"] as const,
  cashMovements: ["cash", "movements"] as const,
};

export const useServiceOrders = (filters?: ServiceOrderFilters) =>
  useQuery({
    queryKey: [...qk.orders, filters ?? {}],
    queryFn: () => api.serviceOrders.list(filters),
  });

export const useCustomers = () =>
  useQuery({ queryKey: qk.customers, queryFn: () => api.customers.list() });

export const useProducts = () =>
  useQuery({ queryKey: qk.products, queryFn: () => api.products.list() });

export const useDepartments = () =>
  useQuery({ queryKey: qk.departments, queryFn: () => api.departments.list() });

export const useEmployees = () =>
  useQuery({ queryKey: qk.employees, queryFn: () => api.employees.list() });

export const useProfiles = () =>
  useQuery({ queryKey: qk.profiles, queryFn: () => api.profiles.list() });

export const useBranches = () =>
  useQuery({ queryKey: qk.branches, queryFn: () => api.branches.list() });

/** Sessão de caixa aberta (ou null) + resumo de totais. */
export const useCashSession = () =>
  useQuery({ queryKey: qk.cashCurrent, queryFn: () => api.cash.current() });

/** Lançamentos de uma sessão; só executa quando há sessionId. */
export const useCashMovements = (sessionId?: string) =>
  useQuery({
    queryKey: [...qk.cashMovements, sessionId ?? "none"],
    queryFn: () => api.cash.sessionMovements(sessionId!),
    enabled: Boolean(sessionId),
    select: data => data.movements,
  });
