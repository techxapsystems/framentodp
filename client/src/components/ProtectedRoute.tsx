import { useAuth } from "@/_core/hooks/useAuth";
import { useLocation } from "wouter";
import { useEffect } from "react";
import NotFound from "@/pages/NotFound";

type ProtectedRouteProps = {
  children: React.ReactNode;
  requiredModules?: string[];
  requiredRole?: "admin" | "user";
};

export function ProtectedRoute({
  children,
  requiredModules = [],
  requiredRole,
}: ProtectedRouteProps) {
  const { user, loading } = useAuth();
  const [, setLocation] = useLocation();

  // Verificar se o usuário tem permissão
  const hasPermission = () => {
    if (loading || !user) return false;

    // Verificar role se necessário
    if (requiredRole && user.role !== requiredRole) {
      return false;
    }

    // Se é admin, tem acesso a tudo
    if (user.role === "admin") {
      return true;
    }

    // Verificar módulos se necessário
    if (requiredModules.length > 0) {
      const userModules = user.modules ? JSON.parse(user.modules) : [];
      return requiredModules.some(module => userModules.includes(module));
    }

    return true;
  };

  useEffect(() => {
    if (loading) return;
    
    if (!user) {
      // Redirecionar para login se não autenticado
      setLocation("/");
      return;
    }

    if (!hasPermission()) {
      // Redirecionar para página de acesso negado
      setLocation("/404");
    }
  }, [user, loading, setLocation]);

  if (loading) {
    return <div>Carregando...</div>;
  }

  if (!user || !hasPermission()) {
    return <NotFound />;
  }

  return <>{children}</>;
}
