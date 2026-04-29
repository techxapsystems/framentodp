import { useState } from "react";
import React from "react";
import { useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { AlertCircle, Loader2, Eye, EyeOff, User, Lock } from "lucide-react";
import { trpc } from "@/lib/trpc";

export default function Login() {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [, navigate] = useLocation();


  const { mutate: login, isPending } = trpc.auth.login.useMutation({
    onSuccess: (result) => {
      if (result.success) {
        localStorage.setItem("user", JSON.stringify(result.user));
        setIsLoading(false);
        // Force page reload to trigger Router re-render
        setTimeout(() => {
          window.location.href = "/";
        }, 100);
      } else {
        setError("Erro ao fazer login. Tente novamente.");
        setIsLoading(false);
      }
    },
    onError: (error) => {
      setError(error.message || "Erro ao fazer login. Verifique suas credenciais.");
      setIsLoading(false);
    },
  });

  // Sync isLoading with isPending
  React.useEffect(() => {
    setIsLoading(isPending);
  }, [isPending]);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setIsLoading(true);

    try {
      login({
        email: username.trim(),
        password,
      });
    } catch (err: any) {
      setError(
        err.message || "Erro ao fazer login. Verifique suas credenciais."
      );
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 to-slate-800 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        {/* Logo e Branding */}
        <div className="text-center mb-8">
          <div className="flex items-center justify-center gap-2 mb-4">
            <img
              src="/framento-logo.webp"
              alt="Framento"
              className="h-12"
              onError={(e) => {
                e.currentTarget.style.display = "none";
              }}
            />
          </div>
          <h1 className="text-3xl font-bold text-white mb-2">
            Sistema de Gestão
          </h1>
          <p className="text-yellow-400 font-semibold">
            Gestão de Motoristas
          </p>
        </div>

        {/* Card de Login */}
        <Card className="bg-white shadow-2xl border-0">
          <CardHeader className="space-y-1 pb-4">
            <CardTitle className="text-2xl text-center">Acesso ao Sistema</CardTitle>
            <CardDescription className="text-center">
              Digite suas credenciais para entrar
            </CardDescription>
          </CardHeader>

          <CardContent>
            <form onSubmit={handleLogin} className="space-y-4">
              {/* Usuário */}
              <div className="space-y-2">
                <label htmlFor="username" className="text-sm font-medium text-gray-700">
                  Usuário
                </label>
                <div className="relative">
                  <User className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                  <Input
                    id="username"
                    type="text"
                    placeholder="Digite seu usuário"
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    disabled={isLoading}
                    className="border-gray-300 pl-10"
                    required
                    autoComplete="username"
                  />
                </div>
              </div>

              {/* Senha */}
              <div className="space-y-2">
                <label htmlFor="password" className="text-sm font-medium text-gray-700">
                  Senha
                </label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                  <Input
                    id="password"
                    type={showPassword ? "text" : "password"}
                    placeholder="Digite sua senha"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    disabled={isLoading}
                    className="border-gray-300 pl-10 pr-10"
                    required
                    autoComplete="current-password"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    disabled={isLoading}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-700 disabled:opacity-50 focus:outline-none"
                    aria-label={showPassword ? "Esconder senha" : "Mostrar senha"}
                    tabIndex={-1}
                  >
                    {showPassword ? (
                      <EyeOff className="h-4 w-4" />
                    ) : (
                      <Eye className="h-4 w-4" />
                    )}
                  </button>
                </div>
              </div>

              {/* Erro */}
              {error && (
                <Alert variant="destructive" className="bg-red-50 border-red-200">
                  <AlertCircle className="h-4 w-4 text-red-600" />
                  <AlertDescription className="text-red-700">
                    {error}
                  </AlertDescription>
                </Alert>
              )}

              {/* Botão de Login */}
              <Button
                type="submit"
                disabled={isLoading || !username || !password}
                className="w-full bg-yellow-400 hover:bg-yellow-500 text-black font-semibold h-11 text-base"
              >
                {isLoading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Entrando...
                  </>
                ) : (
                  "Entrar no Sistema"
                )}
              </Button>
            </form>
          </CardContent>
        </Card>

        {/* Footer */}
        <p className="text-center text-gray-400 text-xs mt-6">
          &copy; 2026 Framento Transportes. Todos os direitos reservados.
        </p>
      </div>
    </div>
  );
}
