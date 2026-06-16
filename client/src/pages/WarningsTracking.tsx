import { useRef, useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { trpc } from "@/lib/trpc";
import { AlertCircle, CheckCircle2, Clock, TrendingUp, Download, FileText, CheckCheck, XCircle, Percent, RefreshCw, BarChart3, LineChart as LineChartIcon, Zap, MessageCircle } from "lucide-react";
import { PieChart, Pie, Cell, Legend, Tooltip, ResponsiveContainer, BarChart, Bar, XAxis, YAxis, CartesianGrid, LineChart, Line } from "recharts";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { AIInsightsPanel } from "@/components/AIInsightsPanel";
import { WarningsChatPanel } from "@/components/WarningsChatPanel";

export default function WarningsTracking() {
  const startDateRef = useRef<HTMLInputElement>(null);
  const endDateRef = useRef<HTMLInputElement>(null);
  
  const [selectedOperation, setSelectedOperation] = useState<string>("all");
  const [groupBy, setGroupBy] = useState<"day" | "week" | "month">("week");
  const [showPendingDialog, setShowPendingDialog] = useState(false);
  const [pendingWarnings, setPendingWarnings] = useState<any[]>([]);
  const [stats, setStats] = useState<any>(null);
  const [byOperation, setByOperation] = useState<any>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);

  const { data: operations = [] } = trpc.dashboard.getAllOperations.useQuery();

  useEffect(() => {
    if (startDateRef.current && endDateRef.current) {
      const startDate = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split("T")[0];
      const endDate = new Date().toISOString().split("T")[0];
      startDateRef.current.value = startDate;
      endDateRef.current.value = endDate;
      loadData();
    }
  }, []);

  useEffect(() => {
    const pollingInterval = setInterval(() => {
      loadData();
    }, 60000);

    return () => clearInterval(pollingInterval);
  }, [selectedOperation]);

  useEffect(() => {
    const handleDashboardRefresh = () => {
      loadData();
    };

    window.addEventListener('dashboardRefresh', handleDashboardRefresh);
    return () => window.removeEventListener('dashboardRefresh', handleDashboardRefresh);
  }, []);

  const loadData = async () => {
    try {
      setIsLoading(true);
      const startDate = startDateRef.current?.value;
      const endDate = endDateRef.current?.value;

      const params = new URLSearchParams();
      if (startDate) params.append('startDate', startDate);
      if (endDate) params.append('endDate', endDate);
      if (selectedOperation && selectedOperation !== 'all') params.append('operacao', selectedOperation);
      
      const response1 = await fetch(`/api/auth/warnings-stats?${params.toString()}`);
      const result1 = await response1.json();
      setStats(result1.result?.data?.json || null);

      const response2 = await fetch(`/api/auth/warnings-stats-by-operation?${params.toString()}`);
      const result2 = await response2.json();
      setByOperation(result2.result?.data?.json || []);
      
      setLastUpdated(new Date());
    } catch (error) {
      console.error("Erro ao carregar dados:", error);
      toast.error("Erro ao carregar dados");
    } finally {
      setIsLoading(false);
    }
  };

  const warningStats = stats || { total: 0, assinadas: 0, naoAssinadas: 0, taxaDevolucao: 0, warnings: [] };

  const formatLastUpdated = (date: Date | null) => {
    if (!date) return '';
    return date.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
  };

  const handleExportPDF = async () => {
    try {
      toast.info("Exportação em desenvolvimento");
    } catch (error) {
      console.error("Erro ao exportar:", error);
      toast.error("Erro ao exportar PDF");
    }
  };

  return (
    <div className="space-y-6">
      {/* Filtros */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <BarChart3 className="w-5 h-5" />
            Acompanhamento de Advertências
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">Data Inicial</label>
              <Input type="date" ref={startDateRef} />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Data Final</label>
              <Input type="date" ref={endDateRef} />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Operação</label>
              <Select value={selectedOperation} onValueChange={setSelectedOperation}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todas as operações</SelectItem>
                  {operations?.filter((op: any) => {
                    if (!op || typeof op !== 'object') return false;
                    const opId = String(op.id || '').trim();
                    return opId.length > 0;
                  }).map((op: any) => {
                    const opId = String(op.id || '').trim();
                    const opNome = String(op.nome || '').trim();
                    return (
                      <SelectItem key={opId} value={opId}>
                        {opNome || 'Sem nome'}
                      </SelectItem>
                    );
                  })}
                </SelectContent>
              </Select>
            </div>
            <div className="flex items-end gap-2">
              <Button onClick={loadData} className="w-full">
                <RefreshCw className="w-4 h-4 mr-2" />
                Atualizar
              </Button>
            </div>
          </div>
          {lastUpdated && (
            <div className="text-xs text-muted-foreground">
              Última atualização: {formatLastUpdated(lastUpdated)}
            </div>
          )}
        </CardContent>
      </Card>

      {/* KPIs - Métricas Principais */}
      {!isLoading && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <Card className="border-l-4 border-l-blue-500">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">Total</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-baseline justify-between">
                <div className="text-3xl font-bold">{warningStats.total || 0}</div>
                <FileText className="w-8 h-8 text-blue-500/50" />
              </div>
              <p className="text-xs text-muted-foreground mt-1">Advertências + Suspensões</p>
            </CardContent>
          </Card>

          <Card className="border-l-4 border-l-green-500">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">Assinadas</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-baseline justify-between">
                <div className="text-3xl font-bold text-green-600">{warningStats.assinadas || 0}</div>
                <CheckCheck className="w-8 h-8 text-green-500/50" />
              </div>
              <p className="text-xs text-muted-foreground mt-1">Processadas</p>
            </CardContent>
          </Card>

          <Card className="border-l-4 border-l-orange-500">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">Pendentes</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-baseline justify-between">
                <div className="text-3xl font-bold text-orange-600">{warningStats.naoAssinadas || 0}</div>
                <AlertCircle className="w-8 h-8 text-orange-500/50" />
              </div>
              <p className="text-xs text-muted-foreground mt-1">Aguardando assinatura</p>
            </CardContent>
          </Card>

          <Card className="border-l-4 border-l-purple-500">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">Taxa de Devolução</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-baseline justify-between">
                <div className="text-3xl font-bold text-purple-600">{(warningStats.taxaDevolucao || 0).toFixed(1)}%</div>
                <TrendingUp className="w-8 h-8 text-purple-500/50" />
              </div>
              <p className="text-xs text-muted-foreground mt-1">Devoluções</p>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Painel de Insights com IA */}
      {!isLoading && (
        <AIInsightsPanel
          startDate={startDateRef.current?.value || ""}
          endDate={endDateRef.current?.value || ""}
          operacao={selectedOperation !== "all" ? selectedOperation : undefined}
        />
      )}

      {/* Painel de Chat Operacional */}
      {!isLoading && (
        <WarningsChatPanel
          startDate={startDateRef.current?.value || ""}
          endDate={endDateRef.current?.value || ""}
          operacao={selectedOperation !== "all" ? selectedOperation : undefined}
        />
      )}

      {/* Gráficos - Layout Profissional */}
      {!isLoading && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Distribuição por Tipo */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Distribuição por Tipo</CardTitle>
              <CardDescription>Advertências vs Suspensões</CardDescription>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={280}>
                <PieChart>
                  <Pie
                    data={[
                      {
                        name: "Advertências",
                        value: warningStats.warnings?.filter((w: any) => w.tipo === "advertencia").length || 0,
                      },
                      {
                        name: "Suspensões",
                        value: warningStats.warnings?.filter((w: any) => w.tipo === "suspensao").length || 0,
                      },
                    ]}
                    cx="50%"
                    cy="50%"
                    innerRadius={50}
                    outerRadius={90}
                    labelLine={false}
                    label={({ name, value }) => `${name}: ${value}`}
                    dataKey="value"
                  >
                    <Cell fill="#3b82f6" />
                    <Cell fill="#ef4444" />
                  </Pie>
                  <Tooltip formatter={(value) => `${value} registros`} />
                  <Legend />
                </PieChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          {/* Status de Assinatura */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Status de Assinatura</CardTitle>
              <CardDescription>Proporção de assinadas vs pendentes</CardDescription>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={280}>
                <BarChart
                  data={[
                    {
                      status: "Assinadas",
                      count: warningStats.assinadas || 0,
                      fill: "#10b981",
                    },
                    {
                      status: "Pendentes",
                      count: warningStats.naoAssinadas || 0,
                      fill: "#f97316",
                    },
                  ]}
                  layout="vertical"
                  margin={{ top: 5, right: 30, left: 100, bottom: 5 }}
                >
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis type="number" />
                  <YAxis dataKey="status" type="category" />
                  <Tooltip />
                  <Bar dataKey="count" fill="#3b82f6" label={{ position: 'right' }} />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Tabela por Operação */}
      {!isLoading && byOperation.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Resumo por Operação</CardTitle>
            <CardDescription>Estatísticas detalhadas por operação</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <Table className="text-sm">
                <TableHeader>
                  <TableRow className="bg-muted/50">
                    <TableHead className="font-semibold">Operação</TableHead>
                    <TableHead className="text-right font-semibold">Total</TableHead>
                    <TableHead className="text-right font-semibold">Advertências</TableHead>
                    <TableHead className="text-right font-semibold">Suspensões</TableHead>
                    <TableHead className="text-right font-semibold">Assinadas</TableHead>
                    <TableHead className="text-right font-semibold">Pendentes</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {byOperation
                    .sort((a: any, b: any) => b.total - a.total)
                    .map((op: any, idx: number) => {
                      const advCount = op.warnings?.filter((w: any) => w.tipo === 'advertencia').length || 0;
                      const suspCount = op.warnings?.filter((w: any) => w.tipo === 'suspensao').length || 0;
                      const assinadas = op.warnings?.filter((w: any) => w.assinada).length || 0;
                      const pendentes = op.total - assinadas;
                      const pctAssinadas = op.total > 0 ? ((assinadas / op.total) * 100).toFixed(0) : 0;

                      return (
                        <TableRow key={idx} className="hover:bg-muted/50">
                          <TableCell className="font-medium">{op.operacao}</TableCell>
                          <TableCell className="text-right font-semibold">{op.total}</TableCell>
                          <TableCell className="text-right">
                            <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-200">
                              {advCount}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-right">
                            <Badge variant="outline" className="bg-red-50 text-red-700 border-red-200">
                              {suspCount}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-right">
                            <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">
                              {assinadas}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-right">
                            <Badge variant="outline" className="bg-orange-50 text-orange-700 border-orange-200">
                              {pendentes}
                            </Badge>
                          </TableCell>
                        </TableRow>
                      );
                    })}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
      )}

      {isLoading && (
        <div className="text-center py-12">
          <div className="inline-flex items-center gap-2 text-muted-foreground">
            <RefreshCw className="w-4 h-4 animate-spin" />
            Carregando dados...
          </div>
        </div>
      )}
    </div>
  );
}
