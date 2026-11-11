import { useAuth } from "@/_core/hooks/useAuth";
import { canAccessRoute, hasPermission } from "@/lib/permissions";
import type { Permission } from "@/types";
import { useCallback } from "react";

/** Permissões do usuário logado, derivadas do estado de useAuth. */
export function usePermissions() {
  const { permissions, user, employee, loading } = useAuth();

  const can = useCallback(
    (required: Permission | readonly Permission[] | undefined) =>
      hasPermission(permissions, required),
    [permissions]
  );

  const canAccess = useCallback(
    (path: string) => canAccessRoute(permissions, path),
    [permissions]
  );

  const isSuperAdmin = user?.role === "super_admin";
  const isAdmin = user?.role === "admin" || isSuperAdmin;

  return {
    permissions,
    user,
    employee,
    loading,
    can,
    canAccess,
    isSuperAdmin,
    isAdmin,
  };
}
