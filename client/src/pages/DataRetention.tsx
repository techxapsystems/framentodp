import { useState } from "react";
import { trpc } from "@/lib/trpc";
import { useAuth } from "@/_core/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { Trash2, Play, RotateCw, AlertCircle } from "lucide-react";
import { toast } from "sonner";

export default function DataRetention() {
  const { user } = useAuth();
  const [editingResource, setEditingResource] = useState<string | null>(null);
  const [editingDays, setEditingDays] = useState<number>(90);

  // Verificar se é admin
  if (user?.role !== "admin") {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Card className="w-full max-w-md">
          <CardHeader>
            <CardTitle>Acesso Negado</CardTitle>
            <CardDescription>
              Apenas administradores podem gerenciar políticas de retenção.
            </CardDescription>
          </CardHeader>
        </Card>
      </div>
    );
  }

  const { data: policies, isLoading: policiesLoading, refetch: refetchPolicies } = trpc.retention.getPolicies.useQuery();
  const { data: stats } = trpc.retention.getStats.useQuery(undefined);
  const { data: cleanupHistory } = trpc.retention.getCleanupHistory.useQuery({ limit: 10 });

  const executeCleanupMutation = trpc.retention.executeCleanup.useMutation({
    onSuccess: (data) => {
      toast.success(`Limpeza concluída! ${data.totalRecordsDeleted} registros deletados.`);
      refetchPolicies();
    },
    onError: (error: any) => {
      toast.error(`Erro ao executar limpeza: ${error.message}`);
    },
  });

  const upsertPolicyMutation = trpc.retention.upsertPolicy.useMutation({
    onSuccess: () => {
      toast.success("Política de retenção atualizada com sucesso!");
      setEditingResource(null);
      refetchPolicies();
    },
    onError: (error) => {
      toast.error(`Erro ao salvar política: ${error.message}`);
    },
  });

  const handleSavePolicy = (resource: string) => {
    upsertPolicyMutation.mutate({
      resource,
      retentionDays: editingDays,
    });
  };

  return (
    <div className="flex-1 space-y-6 p-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Retenção de Dados</h1>
          <p className="text-muted-foreground mt-2">
            Configure políticas de retenção e execute limpeza de dados antigos
          </p>
        </div>
        <Button
          onClick={() => executeCleanupMutation.mutate()}
          disabled={executeCleanupMutation.isPending}
          className="gap-2"
        >
          <Play className="h-4 w-4" />
          {executeCleanupMutation.isPending ? "Limpando..." : "Executar Limpeza Agora"}
        </Button>
      </div>

      {/* Estatísticas */}
      {stats && (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Total Deletado
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.totalRecordsDeleted.toLocaleString()}</div>
              <p className="text-xs text-muted-foreground mt-1">registros</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Limpezas Bem-sucedidas
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-green-600">{stats.successfulCleanups}</div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Limpezas Falhadas
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-red-600">{stats.failedCleanups}</div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Total de Limpezas
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.totalCleanups}</div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Políticas de Retenção */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <RotateCw className="h-4 w-4" />
            Políticas de Retenção
          </CardTitle>
          <CardDescription>
            Configure quantos dias manter cada tipo de dado
          </CardDescription>
        </CardHeader>
        <CardContent>
          {policiesLoading ? (
            <div className="flex items-center justify-center py-8">
              <p className="text-muted-foreground">Carregando políticas...</p>
            </div>
          ) : !policies || policies.length === 0 ? (
            <div className="flex items-center justify-center py-8">
              <p className="text-muted-foreground">Nenhuma política configurada</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Recurso</TableHead>
                    <TableHead>Dias de Retenção</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Auto-delete</TableHead>
                    <TableHead>Ações</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {policies.map((policy) => (
                    <TableRow key={policy.id}>
                      <TableCell className="font-medium">{policy.resource}</TableCell>
                      <TableCell>
                        {editingResource === policy.resource ? (
                          <Input
                            type="number"
                            value={editingDays}
                            onChange={(e) => setEditingDays(parseInt(e.target.value) || 90)}
                            className="w-24"
                            min="1"
                            max="3650"
                          />
                        ) : (
                          <span>{policy.retentionDays} dias</span>
                        )}
                      </TableCell>
                      <TableCell>
                        <Badge variant={policy.enabled ? "default" : "secondary"}>
                          {policy.enabled ? "Ativo" : "Inativo"}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <Badge variant={policy.autoDelete ? "default" : "outline"}>
                          {policy.autoDelete ? "Sim" : "Não"}
                        </Badge>
                      </TableCell>
                      <TableCell className="space-x-2">
                        {editingResource === policy.resource ? (
                          <>
                            <Button
                              size="sm"
                              onClick={() => handleSavePolicy(policy.resource)}
                              disabled={upsertPolicyMutation.isPending}
                            >
                              Salvar
                            </Button>
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => setEditingResource(null)}
                            >
                              Cancelar
                            </Button>
                          </>
                        ) : (
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => {
                              setEditingResource(policy.resource);
                              setEditingDays(policy.retentionDays);
                            }}
                          >
                            Editar
                          </Button>
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Histórico de Limpeza */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Trash2 className="h-4 w-4" />
            Histórico de Limpeza
          </CardTitle>
          <CardDescription>
            Últimas execuções de limpeza de dados
          </CardDescription>
        </CardHeader>
        <CardContent>
          {!cleanupHistory || cleanupHistory.length === 0 ? (
            <div className="flex items-center justify-center py-8">
              <p className="text-muted-foreground">Nenhuma limpeza executada ainda</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Recurso</TableHead>
                    <TableHead>Registros Deletados</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Tipo</TableHead>
                    <TableHead>Data/Hora</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {cleanupHistory.map((cleanup) => (
                    <TableRow key={cleanup.id}>
                      <TableCell className="font-medium">{cleanup.resource}</TableCell>
                      <TableCell>{cleanup.recordsDeleted.toLocaleString()}</TableCell>
                      <TableCell>
                        <Badge
                          variant={
                            cleanup.status === "success"
                              ? "default"
                              : cleanup.status === "failed"
                                ? "destructive"
                                : "secondary"
                          }
                        >
                          {cleanup.status}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <Badge variant={cleanup.isAutomatic ? "outline" : "secondary"}>
                          {cleanup.isAutomatic ? "Automático" : "Manual"}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-sm">
                        {format(new Date(cleanup.executedAt), "dd/MM/yyyy HH:mm:ss", {
                          locale: ptBR,
                        })}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Informações */}
      <Card className="border-blue-200 bg-blue-50">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-blue-900">
            <AlertCircle className="h-4 w-4" />
            Informações Importantes
          </CardTitle>
        </CardHeader>
        <CardContent className="text-sm text-blue-800 space-y-2">
          <p>
            • A limpeza automática é executada diariamente às 2:00 AM conforme as políticas configuradas
          </p>
          <p>
            • Você pode executar limpeza manual a qualquer momento clicando no botão "Executar Limpeza Agora"
          </p>
          <p>
            • Os dados deletados não podem ser recuperados. Certifique-se de fazer backup antes de alterar as políticas
          </p>
          <p>
            • O histórico de limpeza é mantido para auditoria e rastreamento
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
