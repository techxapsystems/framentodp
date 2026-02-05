import { useState, useEffect } from "react";
import { trpc } from "@/lib/trpc";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
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
import { AlertCircle, CheckCircle2, Clock } from "lucide-react";
import { toast } from "sonner";

export default function Today() {
  const [selectedDate, setSelectedDate] = useState(
    new Date().toISOString().split("T")[0]
  );
  const [selectedGestores, setSelectedGestores] = useState<string[]>([]);
  const [selectedOperacoes, setSelectedOperacoes] = useState<string[]>([]);

  const { data, isLoading, refetch } = trpc.dashboard.getTodayData.useQuery({
    date: selectedDate,
    gestores: selectedGestores.length > 0 ? selectedGestores : undefined,
    operacoes: selectedOperacoes.length > 0 ? selectedOperacoes : undefined,
  });

  const updateTreatmentMutation = trpc.dashboard.updateTreatment.useMutation({
    onSuccess: () => {
      toast.success("Tratativa atualizada com sucesso");
      refetch();
    },
    onError: (error) => {
      toast.error(`Erro: ${error.message}`);
    },
  });

  const formatMinutesToTime = (minutes: number | undefined) => {
    if (!minutes) return "0h 0m";
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    return `${hours}h ${mins}m`;
  };

  const getSeverityColor = (severidade: string) => {
    switch (severidade) {
      case "critical":
        return "bg-red-100 text-red-800";
      case "warning":
        return "bg-yellow-100 text-yellow-800";
      default:
        return "bg-blue-100 text-blue-800";
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "resolvido":
        return <CheckCircle2 className="w-4 h-4 text-green-600" />;
      case "em_andamento":
        return <Clock className="w-4 h-4 text-blue-600" />;
      case "ignorado":
        return <AlertCircle className="w-4 h-4 text-gray-600" />;
      default:
        return <AlertCircle className="w-4 h-4 text-red-600" />;
    }
  };

  if (isLoading) {
    return (
      <div className="p-8">
        <div className="animate-pulse space-y-4">
          <div className="h-32 bg-slate-200 rounded-lg" />
          <div className="h-96 bg-slate-200 rounded-lg" />
        </div>
      </div>
    );
  }

  return (
    <div className="p-8 space-y-8">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold text-slate-900">Dashboard Hoje</h1>
        <p className="text-slate-600 mt-2">
          Acompanhamento de motoristas e infrações do dia
        </p>
      </div>

      {/* Filtros */}
      <div className="flex gap-4 flex-wrap">
        <div className="flex-1 min-w-[200px]">
          <label className="text-sm font-medium text-slate-700 block mb-2">
            Data
          </label>
          <input
            type="date"
            value={selectedDate}
            onChange={(e) => setSelectedDate(e.target.value)}
            className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          />
        </div>
      </div>

      {/* KPIs */}
      {data?.kpis && (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium text-slate-600">
                Total de Motoristas
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-slate-900">
                {data.kpis.totalMotoristas}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium text-slate-600">
                Ofensores (Pouco Rodado)
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-red-600">
                {data.kpis.ofensoresPoucoRodado}
              </div>
              <p className="text-xs text-slate-500 mt-1">
                {data.kpis.percentualOfensores}% do total
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium text-slate-600">
                HE Total do Dia
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-orange-600">
                {formatMinutesToTime(data.kpis.heTotal)}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium text-slate-600">
                Motoristas com HE
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-slate-900">
                {data.kpis.motoristasComHe}
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Tabela Pouco Rodado */}
      {data?.ofensoresPoucoRodado && data.ofensoresPoucoRodado.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Ofensores - Pouco Rodado</CardTitle>
            <p className="text-sm text-slate-600">
              Motoristas que dirigiram menos de 2 horas
            </p>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow className="bg-slate-50">
                    <TableHead>Condutor</TableHead>
                    <TableHead>Gestor</TableHead>
                    <TableHead className="text-right">Dirigido</TableHead>
                    <TableHead className="text-right">Ocor. (7d)</TableHead>
                    <TableHead className="text-right">Ocor. (30d)</TableHead>
                    <TableHead>Ação Sugerida</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Observação</TableHead>
                    <TableHead>Ação</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {data.ofensoresPoucoRodado.map((item: any) => (
                    <TableRow key={item.journeyId} className="hover:bg-slate-50">
                      <TableCell className="font-medium">{item.condutor}</TableCell>
                      <TableCell className="text-sm">{item.gestor}</TableCell>
                      <TableCell className="text-right font-mono">
                        {formatMinutesToTime(item.dirigido || 0)}
                      </TableCell>
                      <TableCell className="text-right">
                        <Badge
                          variant="outline"
                          className={
                            item.ocorJanela >= 3
                              ? "bg-red-100 text-red-800 border-red-300"
                              : item.ocorJanela === 2
                              ? "bg-yellow-100 text-yellow-800 border-yellow-300"
                              : "bg-blue-100 text-blue-800 border-blue-300"
                          }
                        >
                          {item.ocorJanela}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right">
                        <Badge variant="outline">{item.ocor30d}</Badge>
                      </TableCell>
                      <TableCell>
                        <Badge className={getSeverityColor(item.severidade)}>
                          {item.acaoSugerida || "-"}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          {getStatusIcon(item.status)}
                          <span className="text-sm capitalize">{item.status}</span>
                        </div>
                      </TableCell>
                      <TableCell className="text-sm max-w-xs truncate">
                        {item.observacao || "-"}
                      </TableCell>
                      <TableCell>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() =>
                            updateTreatmentMutation.mutate({
                              journeyId: item.journeyId,
                              tipo: "pouco_rodado",
                              status: "resolvido",
                            })
                          }
                          disabled={updateTreatmentMutation.isPending}
                        >
                          Resolver
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Tabela Horas Extras */}
      {data?.ofensoresHe && data.ofensoresHe.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Ofensores - Horas Extras</CardTitle>
            <p className="text-sm text-slate-600">
              Motoristas com horas extras acumuladas
            </p>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow className="bg-slate-50">
                    <TableHead>Condutor</TableHead>
                    <TableHead>Gestor</TableHead>
                    <TableHead className="text-right">HE Total</TableHead>
                    <TableHead className="text-right">HE 50%</TableHead>
                    <TableHead className="text-right">HE 100%</TableHead>
                    <TableHead className="text-right">Ocor. (7d)</TableHead>
                    <TableHead className="text-right">Ocor. (30d)</TableHead>
                    <TableHead>Ação Sugerida</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Ação</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {data.ofensoresHe.map((item: any) => (
                    <TableRow key={item.journeyId} className="hover:bg-slate-50">
                      <TableCell className="font-medium">{item.condutor}</TableCell>
                      <TableCell className="text-sm">{item.gestor}</TableCell>
                      <TableCell className="text-right font-mono font-bold text-orange-600">
                        {formatMinutesToTime(item.he)}
                      </TableCell>
                      <TableCell className="text-right font-mono">
                        {formatMinutesToTime(item.he50)}
                      </TableCell>
                      <TableCell className="text-right font-mono">
                        {formatMinutesToTime(item.he100)}
                      </TableCell>
                      <TableCell className="text-right">
                        <Badge variant="outline">{item.ocorJanela}</Badge>
                      </TableCell>
                      <TableCell className="text-right">
                        <Badge variant="outline">{item.ocor30d}</Badge>
                      </TableCell>
                      <TableCell>
                        <Badge className={getSeverityColor(item.severidade)}>
                          {item.acaoSugerida || "-"}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          {getStatusIcon(item.status)}
                          <span className="text-sm capitalize">{item.status}</span>
                        </div>
                      </TableCell>
                      <TableCell>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() =>
                            updateTreatmentMutation.mutate({
                              journeyId: item.journeyId,
                              tipo: "horas_extras",
                              status: "resolvido",
                            })
                          }
                          disabled={updateTreatmentMutation.isPending}
                        >
                          Resolver
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Empty State */}
      {(!data?.ofensoresPoucoRodado || data.ofensoresPoucoRodado.length === 0) &&
        (!data?.ofensoresHe || data.ofensoresHe.length === 0) && (
          <Card>
            <CardContent className="pt-12 pb-12 text-center">
              <p className="text-slate-600">Nenhuma infração registrada para este dia</p>
            </CardContent>
          </Card>
        )}
    </div>
  );
}
