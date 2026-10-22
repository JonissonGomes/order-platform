import { LOGIN_PATH } from "@/const";
import { api, type User } from "@/lib/api";
import { useCallback, useEffect, useMemo, useState } from "react";

type UseAuthOptions = {
  redirectOnUnauthenticated?: boolean;
  redirectPath?: string;
};

export function useAuth(options?: UseAuthOptions) {
  const { redirectOnUnauthenticated = false, redirectPath = LOGIN_PATH } =
    options ?? {};

  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);
  const [isSuspended, setIsSuspended] = useState(false);

  const fetchUser = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      setIsSuspended(false);
      const response = await api.getMe();
      setUser(response.user);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : "";
      // Detect suspension via the specific backend message
      if (errorMessage.toLowerCase().includes("suspensa") || errorMessage.toLowerCase().includes("suspenso")) {
        setIsSuspended(true);
      }
      setError(err instanceof Error ? err : new Error("Failed to fetch user"));
      setUser(null);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchUser();
  }, [fetchUser]);

  const logout = useCallback(async () => {
    try {
      await api.logout();
      setUser(null);
    } catch (err) {
      // Even if logout fails, clear user state
      setUser(null);
    }
  }, []);

  const state = useMemo(() => {
    return {
      user,
      loading,
      error,
      isSuspended,
      isAuthenticated: Boolean(user),
    };
  }, [user, loading, error, isSuspended]);

  useEffect(() => {
    if (!redirectOnUnauthenticated) return;
    if (loading) return;
    if (state.user) return;
    if (typeof window === "undefined") return;
    if (window.location.pathname === redirectPath) return;

    window.location.href = redirectPath;
  }, [redirectOnUnauthenticated, redirectPath, loading, state.user]);

  return {
    ...state,
    refresh: fetchUser,
    logout,
    isSuspended,
  };
}
