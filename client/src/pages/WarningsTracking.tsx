import { useState, useMemo } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { trpc } from "@/lib/trpc";
import { AlertCircle, CheckCircle2, Clock, TrendingUp, X } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";

export default function WarningsTracking() {
  const [startDate, setStartDate] = useState<string>(
    new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split("T")[0]
  );
  const [endDate, setEndDate] = useState<string>(
    new Date().toISOString().split("T")[0]
  );
  const [selectedOperation, setSelectedOperation] = useState<string>("all");
  const [groupBy, setGroupBy] = useState<"day" | "week" | "month">("week");
  const [showPendingDialog, setShowPendingDialog] = useState(false);
  const [pendingWarnings, setPendingWarnings] = useState<any[]>([]);

  // Buscar operações disponíveis
  const { data: operations = [] } = trpc.dashboard.getAllOperations.useQuery();

  // Buscar estatísticas gerais
  const { data: stats } = trpc.dashboard.getWarningsStats.useQuery({
    startDate,
    endDate,
    operacao: selectedOperation !== "all" ? selectedOperation : undefined,
  });

  // Buscar tendência
  const { data: trend = [] } = trpc.dashboard.getWarningsTrend.useQuery({
    startDate,
    endDate,
    groupBy,
    operacao: selectedOperation !== "all" ? selectedOperation : undefined,
  });

  // Buscar por operação
  const { data: byOperation = [] } = trpc.dashboard.getWarningsByOperation.useQuery({
    startDate,
    endDate,
  });

  const warningStats = stats || { total: 0, assinadas: 0, naoAssinadas: 0, taxaDevolucao: 0, warnings: [] };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold">Acompanhamento de Advertências</h1>
        <p className="text-muted-foreground mt-2">
          Monitore o status das advertências enviadas aos motoristas
        </p>
      </div>

      {/* Filtros */}
      <Card>
        <CardHeader>
          <CardTitle>Filtros</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">Data Inicial</label>
              <Input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Data Final</label>
              <Input
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Operação</label>
              <Select value={selectedOperation} onValueChange={setSelectedOperation}>
                <SelectTrigger>
                  <SelectValue placeholder="Todas as operações" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todas as operações</SelectItem>
                  {operations.map((op) => (
                    <SelectItem key={op} value={op}>
                      {op}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Agrupar por</label>
              <Select value={groupBy} onValueChange={(v) => setGroupBy(v as any)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="day">Dia</SelectItem>
                  <SelectItem value="week">Semana</SelectItem>
                  <SelectItem value="month">Mês</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* KPIs */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card className="cursor-pointer hover:shadow-md transition-shadow">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Total de Advertências
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{warningStats.total}</div>
            <p className="text-xs text-muted-foreground mt-1">
              Período selecionado
            </p>
            <Button size="sm" variant="ghost" className="mt-2 w-full text-xs" onClick={() => {
              alert("Funcionalidade em desenvolvimento: Ver todas as advertências");
            }}>
              Ver Todas
            </Button>
          </CardContent>
        </Card>

        <Card className="cursor-pointer hover:shadow-md transition-shadow border-green-200">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-green-600" />
              Devolvidas Assinadas
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">{warningStats.assinadas}</div>
            <p className="text-xs text-muted-foreground mt-1">
              {warningStats.total > 0 ? `${Math.round((warningStats.assinadas / warningStats.total) * 100)}%` : "0%"}
            </p>
            <Button size="sm" variant="ghost" className="mt-2 w-full text-xs text-green-600" onClick={() => {
              alert("Funcionalidade em desenvolvimento: Ver assinadas");
            }}>
              Ver Assinadas
            </Button>
          </CardContent>
        </Card>

        <Card className="cursor-pointer hover:shadow-md transition-shadow border-yellow-200">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
              <Clock className="w-4 h-4 text-yellow-600" />
              Pendentes
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-yellow-600">{warningStats.naoAssinadas}</div>
            <p className="text-xs text-muted-foreground mt-1">
              Aguardando devolução
            </p>
            <Button size="sm" variant="ghost" className="mt-2 w-full text-xs text-yellow-600" onClick={() => {
              if (warningStats.warnings) {
                const pending = warningStats.warnings.filter((w: any) => !w.assinada);
                setPendingWarnings(pending);
                setShowPendingDialog(true);
              }
            }}>
              Ver Pendentes
            </Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
              <TrendingUp className="w-4 h-4 text-blue-600" />
              Taxa de Devolução
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-blue-600">{warningStats.taxaDevolucao}%</div>
            <p className="text-xs text-muted-foreground mt-1">
              Assinadas / Total
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Gráfico de Tendência */}
      <Card>
        <CardHeader>
          <CardTitle>Tendência de Advertências</CardTitle>
          <CardDescription>
            Evolução temporal das advertências enviadas e devolvidas
          </CardDescription>
        </CardHeader>
        <CardContent>
          {trend.length > 0 ? (
            <div className="space-y-4">
              {trend.map((item) => (
                <div key={item.period} className="space-y-2">
                  <div className="flex justify-between items-center">
                    <span className="text-sm font-medium">{item.period}</span>
                    <span className="text-xs text-muted-foreground">
                      {item.total} advertências
                    </span>
                  </div>
                  <div className="flex gap-2 h-8">
                    <div
                      className="bg-green-500 rounded"
                      style={{
                        width: `${(item.assinadas / item.total) * 100}%`,
                        minWidth: item.assinadas > 0 ? "4px" : "0",
                      }}
                      title={`Assinadas: ${item.assinadas}`}
                    />
                    <div
                      className="bg-yellow-500 rounded"
                      style={{
                        width: `${(item.naoAssinadas / item.total) * 100}%`,
                        minWidth: item.naoAssinadas > 0 ? "4px" : "0",
                      }}
                      title={`Pendentes: ${item.naoAssinadas}`}
                    />
                  </div>
                  <div className="flex justify-between text-xs text-muted-foreground">
                    <span>Assinadas: {item.assinadas}</span>
                    <span>Pendentes: {item.naoAssinadas}</span>
                    <span>Taxa: {item.taxaDevolucao}%</span>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-8 text-muted-foreground">
              Nenhum dado disponível para o período selecionado
            </div>
          )}
        </CardContent>
      </Card>

      {/* Advertências por Operação */}
      <Card>
        <CardHeader>
          <CardTitle>Advertências por Operação</CardTitle>
          <CardDescription>
            Distribuição de advertências por unidade operacional
          </CardDescription>
        </CardHeader>
        <CardContent>
          {byOperation.length > 0 ? (
            <div className="space-y-4">
              {byOperation.map((item) => (
                <div key={item.operacao} className="space-y-2">
                  <div className="flex justify-between items-center">
                    <span className="text-sm font-medium">{item.operacao}</span>
                    <span className="text-xs text-muted-foreground">
                      {item.total} advertências
                    </span>
                  </div>
                  <div className="flex gap-2 h-8">
                    <div
                      className="bg-green-500 rounded"
                      style={{
                        width: `${(item.assinadas / item.total) * 100}%`,
                        minWidth: item.assinadas > 0 ? "4px" : "0",
                      }}
                      title={`Assinadas: ${item.assinadas}`}
                    />
                    <div
                      className="bg-yellow-500 rounded"
                      style={{
                        width: `${(item.naoAssinadas / item.total) * 100}%`,
                        minWidth: item.naoAssinadas > 0 ? "4px" : "0",
                      }}
                      title={`Pendentes: ${item.naoAssinadas}`}
                    />
                  </div>
                  <div className="flex justify-between text-xs text-muted-foreground">
                    <span>Assinadas: {item.assinadas} ({item.taxaDevolucao}%)</span>
                    <span>Pendentes: {item.naoAssinadas}</span>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-8 text-muted-foreground">
              Nenhum dado disponível
            </div>
          )}
        </CardContent>
      </Card>

      {/* Modal de Advertências Pendentes */}
      <Dialog open={showPendingDialog} onOpenChange={setShowPendingDialog}>
        <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Advertências Pendentes de Assinatura</DialogTitle>
          </DialogHeader>
          
          {pendingWarnings.length > 0 ? (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Motorista</TableHead>
                    <TableHead>Placa</TableHead>
                    <TableHead>Operacao</TableHead>
                    <TableHead>Nivel</TableHead>
                    <TableHead>Data Criacao</TableHead>
                    <TableHead>Motivo</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {pendingWarnings.map((warning: any) => (
                    <TableRow key={warning.id}>
                      <TableCell className="font-medium">{warning.conductorName}</TableCell>
                      <TableCell>{warning.placa}</TableCell>
                      <TableCell>{warning.operacao}</TableCell>
                      <TableCell>
                        <Badge variant="outline">
                          Aviso {warning.nivelAdvertencia}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        {new Date(warning.criadoEm).toLocaleDateString('pt-BR')}
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground">
                        {warning.motivo || '-'}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          ) : (
            <div className="text-center py-8 text-muted-foreground">
              Nenhuma advertencia pendente de assinatura
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
