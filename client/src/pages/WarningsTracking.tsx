import { useState, useEffect, useRef } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { trpc } from "@/lib/trpc";
import { AlertCircle, CheckCircle2, Clock, TrendingUp, X } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";

export default function WarningsTracking() {
  const startDateRef = useRef<HTMLInputElement>(null);
  const endDateRef = useRef<HTMLInputElement>(null);
  
  const [selectedOperation, setSelectedOperation] = useState<string>("all");
  const [groupBy, setGroupBy] = useState<"day" | "week" | "month">("week");
  const [showPendingDialog, setShowPendingDialog] = useState(false);
  const [pendingWarnings, setPendingWarnings] = useState<any[]>([]);
  const [stats, setStats] = useState<any>(null);
  const [byOperation, setByOperation] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Buscar operações disponíveis
  const { data: operations = [] } = trpc.dashboard.getAllOperations.useQuery();

  // Inicializar datas
  useEffect(() => {
    if (startDateRef.current && endDateRef.current) {
      const startDate = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split("T")[0];
      const endDate = new Date().toISOString().split("T")[0];
      startDateRef.current.value = startDate;
      endDateRef.current.value = endDate;
      loadData();
    }
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
      
      // Carregar estatísticas gerais
      const response1 = await fetch(`/api/auth/warnings-stats?${params.toString()}`);
      const result1 = await response1.json();
      setStats(result1.result?.data?.json || null);

      // Carregar dados por operação
      const response2 = await fetch(`/api/auth/warnings-stats-by-operation?${params.toString()}`);
      const result2 = await response2.json();
      setByOperation(result2.result?.data?.json || []);
    } catch (error) {
      console.error("Erro ao carregar dados:", error);
      toast.error("Erro ao carregar dados");
    } finally {
      setIsLoading(false);
    }
  };

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
                ref={startDateRef}
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Data Final</label>
              <Input
                type="date"
                ref={endDateRef}
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Operação</label>
              <Select value={selectedOperation} onValueChange={setSelectedOperation}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todas as operações</SelectItem>
                  {operations?.filter((op: any) => op.id && op.id.trim() !== '').map((op: any) => (
                    <SelectItem key={op.id} value={op.id}>
                      {op.nome}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Agrupar por</label>
              <Select value={groupBy} onValueChange={(v: any) => setGroupBy(v)}>
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
          <Button onClick={loadData} className="w-full">
            Aplicar Filtros
          </Button>
        </CardContent>
      </Card>

      {/* KPIs */}
      {isLoading ? (
        <div className="text-center py-8">Carregando...</div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">Total de Advertências</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{warningStats.total || 0}</div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">Assinadas</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-green-600">{warningStats.assinadas || 0}</div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">Não Assinadas</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-red-600">{warningStats.naoAssinadas || 0}</div>
              <Button
                variant="link"
                size="sm"
                className="mt-2 p-0"
                onClick={() => {
                  setPendingWarnings(warningStats.warnings || []);
                  setShowPendingDialog(true);
                }}
              >
                Ver detalhes
              </Button>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">Taxa de Devolução</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{(warningStats.taxaDevolucao || 0).toFixed(1)}%</div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Tabela por Operação */}
      <Card>
        <CardHeader>
          <CardTitle>Advertências por Operação</CardTitle>
        </CardHeader>
        <CardContent>
          {byOperation.length === 0 ? (
            <div className="text-center py-8 text-gray-500">Nenhum dado disponível</div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Operação</TableHead>
                    <TableHead>Total</TableHead>
                    <TableHead>Assinadas</TableHead>
                    <TableHead>Não Assinadas</TableHead>
                    <TableHead>Taxa (%)</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {byOperation.map((item: any) => (
                    <TableRow key={item.operacao}>
                      <TableCell className="font-medium">{item.operacao}</TableCell>
                      <TableCell>{item.total}</TableCell>
                      <TableCell className="text-green-600">{item.assinadas}</TableCell>
                      <TableCell className="text-red-600">{item.naoAssinadas}</TableCell>
                      <TableCell>{((item.naoAssinadas / item.total) * 100).toFixed(1)}%</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Dialog de Advertências Pendentes */}
      <Dialog open={showPendingDialog} onOpenChange={setShowPendingDialog}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Advertências Não Assinadas</DialogTitle>
          </DialogHeader>
          <div className="max-h-96 overflow-y-auto">
            {pendingWarnings.length === 0 ? (
              <div className="text-center py-8 text-gray-500">Nenhuma advertência pendente</div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Motorista</TableHead>
                    <TableHead>Data</TableHead>
                    <TableHead>Tipo</TableHead>
                    <TableHead>Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {pendingWarnings.map((warning: any) => (
                    <TableRow key={warning.id}>
                      <TableCell>{warning.conductorName}</TableCell>
                      <TableCell>{new Date(warning.criadoEm).toLocaleDateString("pt-BR")}</TableCell>
                      <TableCell>{warning.categoria}</TableCell>
                      <TableCell>
                        <Badge variant="destructive">Pendente</Badge>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
