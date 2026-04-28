import { useState, useEffect } from "react";
import { useAuth } from "@/_core/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { AlertCircle, CheckCircle, Trash2, Edit, Plus } from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

interface AuditLog {
  id: number;
  warningId: number;
  conductorName: string;
  acao: "criado" | "editado" | "deletado" | "assinado";
  camposAlterados: string[] | null;
  valorAnterior: Record<string, unknown> | null;
  valorNovo: Record<string, unknown> | null;
  usuarioId: number;
  usuarioEmail: string;
  usuarioNome: string;
  motivo: string | null;
  ipAddress: string | null;
  criadoEm: Date;
}

export default function WarningAuditLog() {
  const { user } = useAuth();
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchConductor, setSearchConductor] = useState("");
  const [selectedAction, setSelectedAction] = useState("all");
  const [filteredLogs, setFilteredLogs] = useState<AuditLog[]>([]);

  // Verificar se é admin
  if (!user || user.role !== "admin") {
    return (
      <div className="flex items-center justify-center h-screen">
        <Card className="w-full max-w-md">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <AlertCircle className="w-5 h-5 text-red-500" />
              Acesso Negado
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p>Você não tem permissão para acessar esta página.</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Carregar dados de auditoria
  useEffect(() => {
    const loadAuditLogs = async () => {
      try {
        setLoading(true);
        const response = await fetch("/api/auth/warnings-audit-log");
        if (!response.ok) throw new Error("Failed to load audit logs");
        const data = await response.json();
        setLogs(Array.isArray(data) ? data : []);
      } catch (error) {
        console.error("Error loading audit logs:", error);
        setLogs([]);
      } finally {
        setLoading(false);
      }
    };

    loadAuditLogs();
  }, []);

  // Filtrar logs
  useEffect(() => {
    let filtered = logs;

    if (searchConductor.trim()) {
      filtered = filtered.filter((log) =>
        log.conductorName.toLowerCase().includes(searchConductor.toLowerCase())
      );
    }

    if (selectedAction !== "all") {
      filtered = filtered.filter((log) => log.acao === selectedAction);
    }

    setFilteredLogs(filtered);
  }, [logs, searchConductor, selectedAction]);

  // Obter ações únicas
  const actions = Array.from(new Set(logs.map((log) => log.acao)));

  // Função para renderizar badge de ação
  const getActionBadge = (acao: string) => {
    const variants: Record<string, string> = {
      criado: "bg-green-100 text-green-800",
      editado: "bg-blue-100 text-blue-800",
      deletado: "bg-red-100 text-red-800",
      assinado: "bg-purple-100 text-purple-800",
    };
    return variants[acao] || "bg-gray-100 text-gray-800";
  };

  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Auditoria de Advertências</h1>
        <p className="text-gray-600 mt-2">Histórico completo de alterações em advertências</p>
      </div>

      {/* Filtros */}
      <Card>
        <CardHeader>
          <CardTitle>Filtros</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="text-sm font-medium">Motorista</label>
              <Input
                placeholder="Buscar por nome..."
                value={searchConductor}
                onChange={(e) => setSearchConductor(e.target.value)}
              />
            </div>
            <div>
              <label className="text-sm font-medium">Ação</label>
              <Select value={selectedAction} onValueChange={setSelectedAction}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todas as ações</SelectItem>
                  {actions.map((action) => (
                    <SelectItem key={action} value={action}>
                      {action.charAt(0).toUpperCase() + action.slice(1)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Resultados */}
      <Card>
        <CardHeader>
          <CardTitle>Registros ({filteredLogs.length})</CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="text-center py-8">Carregando...</div>
          ) : filteredLogs.length === 0 ? (
            <div className="text-center py-8 text-gray-500">Nenhum registro encontrado</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-gray-50 border-b">
                  <tr>
                    <th className="px-4 py-2 text-left">Motorista</th>
                    <th className="px-4 py-2 text-left">Ação</th>
                    <th className="px-4 py-2 text-left">Usuário</th>
                    <th className="px-4 py-2 text-left">Data/Hora</th>
                    <th className="px-4 py-2 text-left">Motivo</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredLogs.map((log) => (
                    <tr key={log.id} className="border-b hover:bg-gray-50">
                      <td className="px-4 py-2">{log.conductorName}</td>
                      <td className="px-4 py-2">
                        <Badge className={getActionBadge(log.acao)}>
                          {log.acao}
                        </Badge>
                      </td>
                      <td className="px-4 py-2">{log.usuarioNome}</td>
                      <td className="px-4 py-2">
                        {format(new Date(log.criadoEm), "dd/MM/yyyy HH:mm", { locale: ptBR })}
                      </td>
                      <td className="px-4 py-2">{log.motivo || "-"}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
