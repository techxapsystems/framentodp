import { useState } from "react";
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

// Componente que renderiza o conteúdo (com hooks)
function WarningAuditLogContent() {
  const [searchConductor, setSearchConductor] = useState("");
  const [filterAction, setFilterAction] = useState<"all" | "criado" | "editado" | "deletado" | "assinado">("all");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [loading, setLoading] = useState(false);
  const [expandedLog, setExpandedLog] = useState<number | null>(null);

  const handleSearch = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (searchConductor) params.append("conductor", searchConductor);
      if (filterAction && filterAction !== "all") params.append("action", filterAction);
      if (startDate) params.append("startDate", startDate);
      if (endDate) params.append("endDate", endDate);

      const response = await fetch(`/api/auth/warnings-audit-log?${params.toString()}`);
      if (response.ok) {
        const data = await response.json();
        setLogs(data);
      }
    } catch (error) {
      console.error("Erro ao buscar histórico:", error);
    } finally {
      setLoading(false);
    }
  };

  const getActionBadge = (acao: string) => {
    const variants: Record<string, { label: string; variant: any }> = {
      criado: { label: "Criado", variant: "default" },
      editado: { label: "Editado", variant: "secondary" },
      deletado: { label: "Deletado", variant: "destructive" },
      assinado: { label: "Assinado", variant: "outline" },
    };
    const config = variants[acao] || { label: acao, variant: "default" };
    return <Badge variant={config.variant}>{config.label}</Badge>;
  };

  const getActionIcon = (acao: string) => {
    switch (acao) {
      case "criado":
        return <Plus className="h-4 w-4" />;
      case "editado":
        return <Edit className="h-4 w-4" />;
      case "deletado":
        return <Trash2 className="h-4 w-4" />;
      case "assinado":
        return <CheckCircle className="h-4 w-4" />;
      default:
        return null;
    }
  };

  return (
    <div className="container mx-auto py-6 space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Histórico de Auditoria de Advertências</h1>
        <p className="text-muted-foreground mt-2">
          Rastreie todas as alterações realizadas em advertências e suspensões
        </p>
      </div>

      {/* Filtros */}
      <Card>
        <CardHeader>
          <CardTitle>Filtros</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <div>
              <label className="text-sm font-medium mb-2 block">Motorista</label>
              <Input
                placeholder="Nome do motorista"
                value={searchConductor}
                onChange={(e) => setSearchConductor(e.target.value)}
              />
            </div>

            <div>
              <label className="text-sm font-medium mb-2 block">Ação</label>
              <Select value={filterAction} onValueChange={(v: any) => setFilterAction(v)}>
                <SelectTrigger>
                  <SelectValue placeholder="Todas as ações" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todas as ações</SelectItem>
                  <SelectItem value="criado">Criado</SelectItem>
                  <SelectItem value="editado">Editado</SelectItem>
                  <SelectItem value="deletado">Deletado</SelectItem>
                  <SelectItem value="assinado">Assinado</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <label className="text-sm font-medium mb-2 block">Data Inicial</label>
              <Input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
              />
            </div>

            <div>
              <label className="text-sm font-medium mb-2 block">Data Final</label>
              <Input
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
              />
            </div>
          </div>

          <Button onClick={handleSearch} disabled={loading} className="w-full bg-yellow-400 hover:bg-yellow-500 text-black">
            {loading ? "Buscando..." : "Buscar Histórico"}
          </Button>
        </CardContent>
      </Card>

      {/* Resultados */}
      <div className="space-y-4">
        {logs.length === 0 ? (
          <Card>
            <CardContent className="pt-6">
              <p className="text-center text-muted-foreground">
                Nenhum registro encontrado. Use os filtros acima para buscar.
              </p>
            </CardContent>
          </Card>
        ) : (
          logs.map((log) => (
            <Card key={log.id} className="overflow-hidden">
              <CardHeader className="pb-3">
                <div className="flex items-start justify-between">
                  <div className="space-y-2">
                    <div className="flex items-center gap-2">
                      {getActionIcon(log.acao)}
                      <span className="font-medium">{log.conductorName}</span>
                      {getActionBadge(log.acao)}
                    </div>
                    <p className="text-sm text-muted-foreground">
                      Advertência #{log.warningId}
                    </p>
                  </div>
                  <div className="text-right text-sm text-muted-foreground">
                    <p>{format(new Date(log.criadoEm), "dd/MM/yyyy HH:mm", { locale: ptBR })}</p>
                    <p className="text-xs">{log.usuarioNome}</p>
                  </div>
                </div>
              </CardHeader>

              {expandedLog === log.id && (
                <CardContent className="space-y-4 border-t pt-4">
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div>
                      <p className="font-medium">Usuário</p>
                      <p className="text-muted-foreground">{log.usuarioEmail}</p>
                    </div>
                    <div>
                      <p className="font-medium">IP</p>
                      <p className="text-muted-foreground text-xs">{log.ipAddress || "N/A"}</p>
                    </div>
                  </div>

                  {log.motivo && (
                    <div>
                      <p className="font-medium text-sm">Motivo</p>
                      <p className="text-sm text-muted-foreground">{log.motivo}</p>
                    </div>
                  )}

                  {log.camposAlterados && log.camposAlterados.length > 0 && (
                    <div>
                      <p className="font-medium text-sm mb-2">Campos Alterados</p>
                      <div className="space-y-2">
                        {log.camposAlterados.map((campo, idx) => (
                          <div key={idx} className="bg-muted p-2 rounded text-xs">
                            <p className="font-medium">{campo}</p>
                            {log.valorAnterior && log.valorAnterior[campo] !== undefined && (
                              <p className="text-muted-foreground">
                                Antes: {String(log.valorAnterior[campo] as any)}
                              </p>
                            )}
                            {log.valorNovo && log.valorNovo[campo] !== undefined && (
                              <p className="text-muted-foreground">
                                Depois: {String(log.valorNovo[campo] as any)}
                              </p>
                            )}
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setExpandedLog(null)}
                    className="w-full"
                  >
                    Fechar Detalhes
                  </Button>
                </CardContent>
              )}

              {expandedLog !== log.id && (
                <CardContent className="pt-3">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setExpandedLog(log.id)}
                    className="w-full"
                  >
                    Ver Detalhes
                  </Button>
                </CardContent>
              )}
            </Card>
          ))
        )}
      </div>
    </div>
  );
}

// Componente principal que verifica admin ANTES de renderizar conteúdo com hooks
export default function WarningAuditLog() {
  const { user } = useAuth();

  // Se não for admin, mostra mensagem de acesso negado
  if (!user || user.role !== "admin") {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Card className="w-full max-w-md">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <AlertCircle className="h-5 w-5 text-red-500" />
              Acesso Negado
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">
              Apenas administradores podem acessar o histórico de auditoria de advertências.
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Só renderiza o conteúdo com hooks se for admin
  return <WarningAuditLogContent />;
}
