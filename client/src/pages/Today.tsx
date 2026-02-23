import { useMemo, useState } from "react";
import { trpc } from "@/lib/trpc";
import { useFilters } from "@/contexts/FilterContext";
import { DateMaskInput } from "@/components/DateMaskInput";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
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
import { AlertCircle, CheckCircle2, Clock, Plus, AlertTriangle } from "lucide-react";
import { toast } from "sonner";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";

export default function Today() {
  const [selectedMotorista, setSelectedMotorista] = useState<any>(null);
  const [orientacaoMotivo, setOrientacaoMotivo] = useState("");
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const { filters, setDateFrom: setContextDateFrom, setDateTo: setContextDateTo, setManager: setContextManager } = useFilters();
  
  const dateFrom = filters.dateFrom.toISOString().split("T")[0];
  const dateTo = filters.dateTo.toISOString().split("T")[0];
  const selectedGestor = filters.manager;

  // Buscar dados para o intervalo de datas
  const { data, isLoading, refetch } = trpc.dashboard.getTodayData.useQuery({
    date: dateFrom,
    dateEnd: dateTo,
    gestores: selectedGestor && selectedGestor !== "__all__" ? [selectedGestor === "__none__" ? "" : selectedGestor] : undefined,
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

  const createOrientationMutation = trpc.dashboard.createOrientation.useMutation({
    onSuccess: () => {
      toast.success("Orientação registrada com sucesso");
      setOrientacaoMotivo("");
      setSelectedMotorista(null);
      setIsDialogOpen(false);
      refetch();
    },
    onError: (error) => {
      toast.error(`Erro: ${error.message}`);
    },
  });

  const countOrientationsMutation = trpc.dashboard.countOrientations.useQuery(
    selectedMotorista ? { conductorName: selectedMotorista.condutor } : { conductorName: "" },
    { enabled: !!selectedMotorista }
  );

  const handleRegistrarOrientacao = () => {
    if (!selectedMotorista || !orientacaoMotivo.trim()) {
      toast.error("Preencha todos os campos");
      return;
    }

    createOrientationMutation.mutate({
      conductorName: selectedMotorista.condutor,
      tipo: "pouco_rodado",
      motivo: orientacaoMotivo,
    });
  };

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

  const handleDateFromChange = (newDate: string) => {
    // Converter de DD/MM/YYYY para YYYY-MM-DD
    if (newDate.length === 10 && newDate.includes("/")) {
      const [day, month, year] = newDate.split("/");
      const isoDate = `${year}-${month}-${day}`;
      const date = new Date(isoDate + "T00:00:00");
      setContextDateFrom(date);
    }
  };

  const handleDateToChange = (newDate: string) => {
    // Converter de DD/MM/YYYY para YYYY-MM-DD
    if (newDate.length === 10 && newDate.includes("/")) {
      const [day, month, year] = newDate.split("/");
      const isoDate = `${year}-${month}-${day}`;
      const date = new Date(isoDate + "T00:00:00");
      setContextDateTo(date);
    }
  };

  // Converter datas do contexto para formato DD/MM/YYYY para exibição
  const dateFromFormatted = dateFrom ? (
    dateFrom.split("-").reverse().join("/")
  ) : "";
  
  const dateToFormatted = dateTo ? (
    dateTo.split("-").reverse().join("/")
  ) : "";

  const handleGestorChange = (value: string) => {
    setContextManager(value);
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
        <h1 className="text-3xl font-bold text-slate-900">Status de Ociosidade - Hoje</h1>
        <p className="text-slate-600 mt-2">
          Motoristas com jornada acima de 10h e direção abaixo de 2h
        </p>
      </div>

      {/* Filtros */}
      <div className="bg-white rounded-lg border border-slate-200 p-6 space-y-4">
        <h3 className="font-semibold text-slate-900">Filtros</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {/* Data DE */}
          <div>
            <label className="text-sm font-medium text-slate-700 block mb-2">
              Data DE:
            </label>
            <DateMaskInput
              value={dateFromFormatted}
              onChange={handleDateFromChange}
              placeholder="DD/MM/YYYY"
            />
          </div>

          {/* Data ATÉ */}
          <div>
            <label className="text-sm font-medium text-slate-700 block mb-2">
              Data ATÉ:
            </label>
            <DateMaskInput
              value={dateToFormatted}
              onChange={handleDateToChange}
              placeholder="DD/MM/YYYY"
            />
          </div>

          {/* Gestor */}
          <div>
            <label className="text-sm font-medium text-slate-700 block mb-2">
              Gestor:
            </label>
            <Select value={selectedGestor} onValueChange={handleGestorChange}>
              <SelectTrigger className="w-full">
                <SelectValue placeholder="Todos os gestores" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="__all__">Todos os gestores</SelectItem>
                {data?.filtros?.gestores?.map((gestor: string | null) => (
                  <SelectItem key={gestor} value={gestor || "__none__"}>
                    {gestor || "Sem gestor"}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
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
                Motoristas Ociosos
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
                HE Total do Período
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
              <div className="text-3xl font-bold text-orange-600">
                {data.kpis.motoristasComHe}
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Tabela de Ofensores */}
      <Card>
        <CardHeader>
          <CardTitle>Motoristas Ociosos</CardTitle>
          <p className="text-sm text-slate-600 mt-2">
            {data?.ofensoresPoucoRodado?.length || 0} motorista(s) encontrado(s)
          </p>
        </CardHeader>
        <CardContent>
          {data?.ofensoresPoucoRodado && data.ofensoresPoucoRodado.length > 0 ? (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Motorista</TableHead>
                    <TableHead>Gestor</TableHead>
                    <TableHead>Direção</TableHead>
                    <TableHead>Ocor. 7d</TableHead>
                    <TableHead>Ocor. 30d</TableHead>
                    <TableHead>Ação Sugerida</TableHead>
                    <TableHead>Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {data.ofensoresPoucoRodado.map((item: any) => (
                    <TableRow key={item.journeyId}>
                      <TableCell className="font-medium">
                        {item.condutor}
                      </TableCell>
                      <TableCell>{item.gestor || "-"}</TableCell>
                      <TableCell>
                        <Badge variant="outline" className="bg-red-50 text-red-700">
                          {formatMinutesToTime(item.dirigido)}
                        </Badge>
                      </TableCell>
                      <TableCell>{item.ocorJanela}</TableCell>
                      <TableCell>{item.ocor30d}</TableCell>
                      <TableCell>
                        {item.acaoSugerida ? (
                          <Badge className={getSeverityColor(item.severidade)}>
                            {item.acaoSugerida}
                          </Badge>
                        ) : (
                          "-"
                        )}
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          {getStatusIcon(item.status)}
                          <span className="text-sm capitalize">
                            {item.status?.replace("_", " ")}
                          </span>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          ) : (
            <p className="text-center text-slate-600 py-8">
              Nenhum motorista ocioso encontrado para o período selecionado
            </p>
          )}
        </CardContent>
      </Card>

      {/* Seção de Orientações */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <AlertTriangle className="w-5 h-5" />
            Registrar Orientações
          </CardTitle>
          <p className="text-sm text-slate-600 mt-2">
            Registre orientações para motoristas ociosos. Após 3 orientações, uma advertência será sugerida automaticamente.
          </p>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {data?.ofensoresPoucoRodado && data.ofensoresPoucoRodado.length > 0 ? (
                data.ofensoresPoucoRodado.map((motorista: any) => (
                  <div key={motorista.journeyId} className="border border-slate-200 rounded-lg p-4 hover:bg-slate-50">
                    <div className="flex justify-between items-start mb-3">
                      <div>
                        <h4 className="font-semibold text-slate-900">{motorista.condutor}</h4>
                        <p className="text-sm text-slate-600">Gestor: {motorista.gestor || "-"}</p>
                      </div>
                      <Dialog open={isDialogOpen && selectedMotorista?.journeyId === motorista.journeyId} onOpenChange={(open) => {
                        if (open) {
                          setSelectedMotorista(motorista);
                          setIsDialogOpen(true);
                        } else {
                          setIsDialogOpen(false);
                          setSelectedMotorista(null);
                        }
                      }}>
                        <DialogTrigger asChild>
                          <Button size="sm" className="bg-blue-600 hover:bg-blue-700">
                            <Plus className="w-4 h-4 mr-1" />
                            Orientação
                          </Button>
                        </DialogTrigger>
                        <DialogContent>
                          <DialogHeader>
                            <DialogTitle>Registrar Orientação</DialogTitle>
                          </DialogHeader>
                          <div className="space-y-4">
                            <div>
                              <label className="text-sm font-medium text-slate-700 block mb-2">
                                Motorista
                              </label>
                              <input
                                type="text"
                                value={motorista.condutor}
                                disabled
                                className="w-full px-3 py-2 border border-slate-300 rounded-lg bg-slate-50"
                              />
                            </div>
                            <div>
                              <label className="text-sm font-medium text-slate-700 block mb-2">
                                Orientações Registradas
                              </label>
                              <div className="text-2xl font-bold text-blue-600">
                                {countOrientationsMutation.data || 0}
                              </div>
                              {countOrientationsMutation.data === 2 && (
                                <p className="text-sm text-orange-600 mt-2 font-semibold">
                                  ⚠️ Próxima orientação gerará uma advertência automática!
                                </p>
                              )}
                            </div>
                            <div>
                              <label className="text-sm font-medium text-slate-700 block mb-2">
                                Motivo da Orientação
                              </label>
                              <Textarea
                                value={orientacaoMotivo}
                                onChange={(e) => setOrientacaoMotivo(e.target.value)}
                                placeholder="Descreva o motivo da orientação..."
                                className="w-full px-3 py-2 border border-slate-300 rounded-lg"
                              />
                            </div>
                            <div className="flex gap-2 justify-end">
                              <Button variant="outline" onClick={() => {
                                setIsDialogOpen(false);
                                setSelectedMotorista(null);
                                setOrientacaoMotivo("");
                              }}>
                                Cancelar
                              </Button>
                              <Button
                                className="bg-blue-600 hover:bg-blue-700"
                                onClick={handleRegistrarOrientacao}
                                disabled={createOrientationMutation.isPending}
                              >
                                {createOrientationMutation.isPending ? "Registrando..." : "Registrar"}
                              </Button>
                            </div>
                          </div>
                        </DialogContent>
                      </Dialog>
                    </div>
                    <div className="text-sm text-slate-600">
                      <p>Direção: {formatMinutesToTime(motorista.dirigido)}</p>
                      <p>Ocorrências (7d): {motorista.ocorJanela}</p>
                    </div>
                  </div>
                ))
              ) : (
                <p className="text-center text-slate-600 col-span-2 py-8">
                  Nenhum motorista ocioso para registrar orientações
                </p>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Tabela de Horas Extras */}
      {data?.ofensoresHe && data.ofensoresHe.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Motoristas com Horas Extras</CardTitle>
            <p className="text-sm text-slate-600 mt-2">
              {data.ofensoresHe.length} motorista(s) encontrado(s)
            </p>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Motorista</TableHead>
                    <TableHead>Gestor</TableHead>
                    <TableHead>HE Total</TableHead>
                    <TableHead>HE 50%</TableHead>
                    <TableHead>HE 100%</TableHead>
                    <TableHead>Ocor. 7d</TableHead>
                    <TableHead>Ação Sugerida</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {data.ofensoresHe.map((item: any) => (
                    <TableRow key={item.journeyId}>
                      <TableCell className="font-medium">
                        {item.condutor}
                      </TableCell>
                      <TableCell>{item.gestor || "-"}</TableCell>
                      <TableCell>
                        <Badge variant="outline" className="bg-orange-50 text-orange-700">
                          {formatMinutesToTime(item.he)}
                        </Badge>
                      </TableCell>
                      <TableCell>{formatMinutesToTime(item.he50)}</TableCell>
                      <TableCell>{formatMinutesToTime(item.he100)}</TableCell>
                      <TableCell>{item.ocorJanela}</TableCell>
                      <TableCell>
                        {item.acaoSugerida ? (
                          <Badge className={getSeverityColor(item.severidade)}>
                            {item.acaoSugerida}
                          </Badge>
                        ) : (
                          "-"
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
