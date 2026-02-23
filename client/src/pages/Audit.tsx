import { useState, useMemo } from "react";
import { trpc } from "@/lib/trpc";
import { useAuth } from "@/_core/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
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
import { Search, Download, Filter } from "lucide-react";

const ACTION_LABELS: Record<string, string> = {
  login: "Login",
  logout: "Logout",
  create_warning: "Criar Advertência",
  edit_warning: "Editar Advertência",
  delete_warning: "Deletar Advertência",
  create_orientation: "Criar Orientação",
  edit_orientation: "Editar Orientação",
  delete_orientation: "Deletar Orientação",
  create_user: "Criar Usuário",
  edit_user: "Editar Usuário",
  delete_user: "Deletar Usuário",
  import_data: "Importar Dados",
  export_data: "Exportar Dados",
  view_report: "Visualizar Relatório",
  change_settings: "Alterar Configurações",
  access_denied: "Acesso Negado",
};

const RESOURCE_LABELS: Record<string, string> = {
  users: "Usuários",
  warnings: "Advertências",
  orientations: "Orientações",
  imports: "Importações",
  reports: "Relatórios",
  settings: "Configurações",
  system: "Sistema",
};

const STATUS_COLORS: Record<string, string> = {
  success: "bg-green-100 text-green-800",
  failed: "bg-red-100 text-red-800",
  warning: "bg-yellow-100 text-yellow-800",
};

export default function Audit() {
  const { user } = useAuth();
  const [filters, setFilters] = useState({
    action: "",
    resource: "",
    searchUser: "",
  });
  const [page, setPage] = useState(0);
  const pageSize = 20;

  // Verificar se é admin
  if (user?.role !== "admin") {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Card className="w-full max-w-md">
          <CardHeader>
            <CardTitle>Acesso Negado</CardTitle>
            <CardDescription>
              Apenas administradores podem acessar os logs de auditoria.
            </CardDescription>
          </CardHeader>
        </Card>
      </div>
    );
  }

  const { data: logsData, isLoading } = trpc.audit.getLogs.useQuery({
    action: filters.action || undefined,
    resource: filters.resource || undefined,
    limit: pageSize,
    offset: page * pageSize,
  });

  const { data: stats } = trpc.audit.getStats.useQuery({});

  const filteredLogs = useMemo(() => {
    if (!logsData?.logs) return [];
    return logsData.logs.filter((log) => {
      if (filters.searchUser && !log.userName.toLowerCase().includes(filters.searchUser.toLowerCase())) {
        return false;
      }
      return true;
    });
  }, [logsData?.logs, filters.searchUser]);

  const handleExport = () => {
    if (!logsData?.logs) return;

    const csv = [
      ["Data", "Usuário", "Email", "Ação", "Recurso", "Status", "Descrição"].join(","),
      ...logsData.logs.map((log) =>
        [
          format(new Date(log.createdAt), "dd/MM/yyyy HH:mm:ss", { locale: ptBR }),
          log.userName,
          log.userEmail,
          ACTION_LABELS[log.action] || log.action,
          RESOURCE_LABELS[log.resource] || log.resource,
          log.status,
          `"${log.description}"`,
        ].join(",")
      ),
    ].join("\n");

    const blob = new Blob([csv], { type: "text/csv" });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `auditoria-${format(new Date(), "yyyy-MM-dd-HHmmss")}.csv`;
    a.click();
    window.URL.revokeObjectURL(url);
  };

  return (
    <div className="flex-1 space-y-6 p-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Auditoria</h1>
          <p className="text-muted-foreground mt-2">
            Visualize o histórico de ações dos usuários no sistema
          </p>
        </div>
        <Button onClick={handleExport} variant="outline" className="gap-2">
          <Download className="h-4 w-4" />
          Exportar CSV
        </Button>
      </div>

      {/* Estatísticas */}
      {stats && (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Total de Ações
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.total}</div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Sucesso
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-green-600">{stats.byStatus.success}</div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Falhas
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-red-600">{stats.byStatus.failed}</div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Avisos
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-yellow-600">{stats.byStatus.warning}</div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Filtros */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Filter className="h-4 w-4" />
            Filtros
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="text-sm font-medium">Buscar Usuário</label>
              <div className="relative mt-1">
                <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Nome ou email..."
                  className="pl-8"
                  value={filters.searchUser}
                  onChange={(e) => setFilters({ ...filters, searchUser: e.target.value })}
                />
              </div>
            </div>

            <div>
              <label className="text-sm font-medium">Ação</label>
              <Select value={filters.action} onValueChange={(value) => setFilters({ ...filters, action: value })}>
                <SelectTrigger className="mt-1">
                  <SelectValue placeholder="Todas as ações" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="">Todas as ações</SelectItem>
                  {Object.entries(ACTION_LABELS).map(([key, label]) => (
                    <SelectItem key={key} value={key}>
                      {label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <label className="text-sm font-medium">Recurso</label>
              <Select value={filters.resource} onValueChange={(value) => setFilters({ ...filters, resource: value })}>
                <SelectTrigger className="mt-1">
                  <SelectValue placeholder="Todos os recursos" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="">Todos os recursos</SelectItem>
                  {Object.entries(RESOURCE_LABELS).map(([key, label]) => (
                    <SelectItem key={key} value={key}>
                      {label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Tabela de Logs */}
      <Card>
        <CardHeader>
          <CardTitle>Histórico de Ações</CardTitle>
          <CardDescription>
            {logsData?.total ? `Total: ${logsData.total} ações` : "Nenhuma ação registrada"}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex items-center justify-center py-8">
              <p className="text-muted-foreground">Carregando...</p>
            </div>
          ) : filteredLogs.length === 0 ? (
            <div className="flex items-center justify-center py-8">
              <p className="text-muted-foreground">Nenhum log encontrado</p>
            </div>
          ) : (
            <>
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Data/Hora</TableHead>
                      <TableHead>Usuário</TableHead>
                      <TableHead>Ação</TableHead>
                      <TableHead>Recurso</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Descrição</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredLogs.map((log) => (
                      <TableRow key={log.id}>
                        <TableCell className="whitespace-nowrap text-sm">
                          {format(new Date(log.createdAt), "dd/MM/yyyy HH:mm:ss", {
                            locale: ptBR,
                          })}
                        </TableCell>
                        <TableCell>
                          <div className="flex flex-col">
                            <span className="font-medium">{log.userName}</span>
                            <span className="text-xs text-muted-foreground">{log.userEmail}</span>
                          </div>
                        </TableCell>
                        <TableCell>
                          <span className="text-sm">{ACTION_LABELS[log.action] || log.action}</span>
                        </TableCell>
                        <TableCell>
                          <span className="text-sm">{RESOURCE_LABELS[log.resource] || log.resource}</span>
                        </TableCell>
                        <TableCell>
                          <Badge className={STATUS_COLORS[log.status] || "bg-gray-100 text-gray-800"}>
                            {log.status}
                          </Badge>
                        </TableCell>
                        <TableCell className="max-w-xs truncate text-sm">
                          {log.description}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>

              {/* Paginação */}
              <div className="flex items-center justify-between mt-4">
                <p className="text-sm text-muted-foreground">
                  Página {page + 1} de {Math.ceil((logsData?.total || 0) / pageSize)}
                </p>
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setPage(Math.max(0, page - 1))}
                    disabled={page === 0}
                  >
                    Anterior
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setPage(page + 1)}
                    disabled={!logsData || (page + 1) * pageSize >= logsData.total}
                  >
                    Próxima
                  </Button>
                </div>
              </div>
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
