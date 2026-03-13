import { useState, useEffect } from "react";
import { useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { AlertCircle, CheckCircle2, Eye, EyeOff, ArrowLeft } from "lucide-react";
import { trpc } from "@/lib/trpc";

export default function ResetPassword() {
  const [, setLocation] = useLocation();
  const [searchParams] = useLocation();
  const token = new URLSearchParams(searchParams.split("?")[1] || "").get("token");
  
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);
  const [loading, setLoading] = useState(true);
  const [tokenValid, setTokenValid] = useState(false);
  const [userEmail, setUserEmail] = useState("");

  const validateToken = trpc.auth.validatePasswordResetToken.useQuery(
    { token: token || "" },
    {
      enabled: !!token,
      onSuccess: (data) => {
        setTokenValid(true);
        setUserEmail(data.email);
        setLoading(false);
      },
      onError: () => {
        setTokenValid(false);
        setError("Token inválido ou expirado");
        setLoading(false);
      },
    }
  );

  const resetPassword = trpc.auth.resetPassword.useMutation({
    onSuccess: () => {
      setSuccess(true);
      setError("");
      setTimeout(() => setLocation("/login"), 3000);
    },
    onError: (error) => {
      setError(error.message || "Erro ao redefinir senha");
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    if (!newPassword.trim()) {
      setError("Por favor, insira uma nova senha");
      return;
    }

    if (newPassword.length < 6) {
      setError("A senha deve ter pelo menos 6 caracteres");
      return;
    }

    if (newPassword !== confirmPassword) {
      setError("As senhas não coincidem");
      return;
    }

    if (!token) {
      setError("Token não encontrado");
      return;
    }

    resetPassword.mutate({ token, newPassword });
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-yellow-500 mx-auto mb-4"></div>
          <p className="text-slate-400">Validando token...</p>
        </div>
      </div>
    );
  }

  if (!tokenValid) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 flex items-center justify-center p-4">
        <div className="w-full max-w-md">
          <Card className="bg-slate-800 border-slate-700">
            <CardHeader>
              <CardTitle className="text-white">Token Inválido</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <Alert className="bg-red-900/20 border-red-700">
                <AlertCircle className="h-4 w-4 text-red-500" />
                <AlertDescription className="text-red-300 ml-2">
                  {error}
                </AlertDescription>
              </Alert>

              <Button
                onClick={() => setLocation("/forgot-password")}
                className="w-full bg-yellow-500 hover:bg-yellow-600 text-black font-semibold"
              >
                Solicitar Novo Reset
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        {/* Logo */}
        <div className="text-center mb-8">
          <div className="flex justify-center mb-4">
            <div className="w-12 h-12 bg-red-500 rounded-lg flex items-center justify-center">
              <span className="text-white font-bold text-xl">F</span>
            </div>
          </div>
          <h1 className="text-3xl font-bold text-white mb-2">Sistema de Gestão</h1>
          <p className="text-slate-400">Redefinir Senha</p>
        </div>

        {/* Card */}
        <Card className="bg-slate-800 border-slate-700">
          <CardHeader>
            <CardTitle className="text-white">Redefinir Senha</CardTitle>
            <CardDescription className="text-slate-400">
              {success
                ? "Senha redefinida com sucesso!"
                : `Crie uma nova senha para ${userEmail}`}
            </CardDescription>
          </CardHeader>

          <CardContent>
            {success ? (
              <div className="space-y-4">
                <Alert className="bg-green-900/20 border-green-700">
                  <CheckCircle2 className="h-4 w-4 text-green-500" />
                  <AlertDescription className="text-green-300 ml-2">
                    Sua senha foi redefinida com sucesso! Redirecionando para o login...
                  </AlertDescription>
                </Alert>

                <Button
                  onClick={() => setLocation("/login")}
                  className="w-full bg-yellow-500 hover:bg-yellow-600 text-black font-semibold"
                >
                  Ir para Login
                </Button>
              </div>
            ) : (
              <form onSubmit={handleSubmit} className="space-y-4">
                {error && (
                  <Alert className="bg-red-900/20 border-red-700">
                    <AlertCircle className="h-4 w-4 text-red-500" />
                    <AlertDescription className="text-red-300 ml-2">
                      {error}
                    </AlertDescription>
                  </Alert>
                )}

                <div className="space-y-2">
                  <label className="text-sm font-medium text-slate-300">Nova Senha</label>
                  <div className="relative">
                    <Input
                      type={showPassword ? "text" : "password"}
                      placeholder="••••••••"
                      value={newPassword}
                      onChange={(e) => setNewPassword(e.target.value)}
                      className="bg-slate-700 border-slate-600 text-white placeholder:text-slate-500 pr-10"
                      disabled={resetPassword.isPending}
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-300"
                    >
                      {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-medium text-slate-300">Confirmar Senha</label>
                  <Input
                    type="password"
                    placeholder="••••••••"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    className="bg-slate-700 border-slate-600 text-white placeholder:text-slate-500"
                    disabled={resetPassword.isPending}
                  />
                </div>

                <div className="text-sm text-slate-400">
                  <p>Requisitos de senha:</p>
                  <ul className="list-disc list-inside mt-2 space-y-1">
                    <li className={newPassword.length >= 6 ? "text-green-400" : ""}>
                      Mínimo 6 caracteres
                    </li>
                    <li className={newPassword === confirmPassword && newPassword ? "text-green-400" : ""}>
                      Senhas devem coincidir
                    </li>
                  </ul>
                </div>

                <Button
                  type="submit"
                  className="w-full bg-yellow-500 hover:bg-yellow-600 text-black font-semibold"
                  disabled={resetPassword.isPending}
                >
                  {resetPassword.isPending ? "Redefinindo..." : "Redefinir Senha"}
                </Button>

                <Button
                  type="button"
                  onClick={() => setLocation("/login")}
                  variant="ghost"
                  className="w-full text-slate-400 hover:text-white hover:bg-slate-700"
                >
                  <ArrowLeft className="w-4 h-4 mr-2" />
                  Voltar ao Login
                </Button>
              </form>
            )}
          </CardContent>
        </Card>

        {/* Footer */}
        <p className="text-center text-slate-500 text-sm mt-8">
          © 2026 Framento Transportes. Todos os direitos reservados.
        </p>
      </div>
    </div>
  );
}
