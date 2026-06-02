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
        let parsedUser = JSON.parse(storedUser);
        
        // Normalize user.modules to always be a string array
        if (parsedUser && parsedUser.modules) {
          if (Array.isArray(parsedUser.modules)) {
            // If it's an array, ensure all elements are strings
            parsedUser.modules = parsedUser.modules.map((m: any) => {
              if (typeof m === 'string') return m;
              if (typeof m === 'object' && m !== null && m.module) return m.module;
              return String(m);
            });
          } else if (typeof parsedUser.modules === 'string') {
            // If it's a string, try to parse it as JSON array
            try {
              const parsed = JSON.parse(parsedUser.modules);
              if (Array.isArray(parsed)) {
                parsedUser.modules = parsed.map((m: any) => typeof m === 'string' ? m : String(m));
              }
            } catch {
              // Keep as string if can't parse
              parsedUser.modules = [parsedUser.modules];
            }
          }
        }
        
        setUser(parsedUser);
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
          let parsedUser = JSON.parse(storedUser);
          
          // Normalize user.modules to always be a string array
          if (parsedUser && parsedUser.modules) {
            if (Array.isArray(parsedUser.modules)) {
              parsedUser.modules = parsedUser.modules.map((m: any) => {
                if (typeof m === 'string') return m;
                if (typeof m === 'object' && m !== null && m.module) return m.module;
                return String(m);
              });
            } else if (typeof parsedUser.modules === 'string') {
              try {
                const parsed = JSON.parse(parsedUser.modules);
                if (Array.isArray(parsed)) {
                  parsedUser.modules = parsed.map((m: any) => typeof m === 'string' ? m : String(m));
                }
              } catch {
                parsedUser.modules = [parsedUser.modules];
              }
            }
          }
          
          setUser(parsedUser);
        } catch (e) {
          console.error("Erro ao atualizar usuário:", e);
        }
      }
    },
    logout,
    navigate,
  };
}
