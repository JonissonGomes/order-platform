import { HOME_PATH } from "@/const";
import { api, type User } from "@/lib/api";
import { permissionsFromRole } from "@/lib/permissions";
import type { Employee, Permission } from "@/types";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useMemo } from "react";

export const AUTH_QUERY_KEY = ["auth", "me"] as const;

type UseAuthOptions = {
  redirectOnUnauthenticated?: boolean;
  redirectPath?: string;
};

/**
 * Estado de autenticação compartilhado via cache do TanStack Query
 * (várias chamadas de useAuth na mesma tela fazem um único GET /auth/me).
 */
export function useAuth(options?: UseAuthOptions) {
  const { redirectOnUnauthenticated = false, redirectPath = HOME_PATH } =
    options ?? {};
  const queryClient = useQueryClient();

  const query = useQuery({
    queryKey: AUTH_QUERY_KEY,
    queryFn: api.me,
    staleTime: 60_000,
  });

  const logoutMutation = useMutation({
    mutationFn: api.logout,
    onSettled: () => {
      queryClient.setQueryData(AUTH_QUERY_KEY, {
        user: null,
        employee: undefined,
        permissions: [],
      });
      queryClient.removeQueries({
        predicate: q => q.queryKey[0] !== AUTH_QUERY_KEY[0],
      });
    },
  });

  const user = (query.data?.user ?? null) as User | null;
  const employee: Employee | null = query.data?.employee ?? null;

  const permissions: Permission[] = useMemo(() => {
    const fromApi = query.data?.permissions ?? [];
    return fromApi.length > 0 ? fromApi : permissionsFromRole(user?.role);
  }, [query.data?.permissions, user?.role]);

  const loading = query.isPending;

  useEffect(() => {
    if (!redirectOnUnauthenticated || loading || user) return;
    if (typeof window === "undefined") return;
    if (window.location.pathname === redirectPath) return;
    window.location.href = redirectPath;
  }, [redirectOnUnauthenticated, redirectPath, loading, user]);

  return {
    user,
    employee,
    permissions,
    loading,
    error: query.error instanceof Error ? query.error : null,
    isAuthenticated: Boolean(user),
    refresh: () => query.refetch(),
    logout: async () => {
      await logoutMutation.mutateAsync().catch(() => undefined);
    },
  };
}
