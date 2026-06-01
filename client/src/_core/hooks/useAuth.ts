import { useCallback, useEffect, useMemo, useState } from "react";
import { useLocation } from "wouter";

type UseAuthOptions = {
  redirectOnUnauthenticated?: boolean;
  redirectPath?: string;
};

export function useAuth(options?: UseAuthOptions) {
  const { redirectOnUnauthenticated = false, redirectPath = "/login" } = options ?? {};
  const [, navigate] = useLocation();
  const [user, setUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<any>(null);

  // Carregar usuário do localStorage na inicialização
  useEffect(() => {
    const storedUser = localStorage.getItem("user");
    if (storedUser) {
      try {
        setUser(JSON.parse(storedUser));
      } catch (e) {
        console.error("Erro ao carregar usuário:", e);
        localStorage.removeItem("user");
      }
    }
    setLoading(false);
  }, []);

  const logout = useCallback(async () => {
    try {
      // Remover usuário do localStorage
      localStorage.removeItem("user");
      setUser(null);
      
      // Redirecionar para login
      navigate("/login", { replace: true });
    } catch (err) {
      console.error("Erro ao fazer logout:", err);
      throw err;
    }
  }, [navigate]);

  const state = useMemo(() => {
    return {
      user: user ?? null,
      loading,
      error,
      isAuthenticated: Boolean(user),
    };
  }, [user, loading, error]);

  useEffect(() => {
    if (!redirectOnUnauthenticated) return;
    if (loading) return;
    if (state.user) return;
    if (typeof window === "undefined") return;
    if (window.location.pathname === redirectPath) return;

    navigate(redirectPath, { replace: true });
  }, [redirectOnUnauthenticated, redirectPath, loading, state.user, navigate]);

  return {
    ...state,
    refresh: () => {
      const storedUser = localStorage.getItem("user");
      if (storedUser) {
        try {
          setUser(JSON.parse(storedUser));
        } catch (e) {
          console.error("Erro ao atualizar usuário:", e);
        }
      }
    },
    logout,
    navigate,
  };
}
