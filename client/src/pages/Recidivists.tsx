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
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { AlertTriangle, AlertCircle, Copy, Edit2, MessageSquare } from "lucide-react";
import { OrientationDialog } from "@/components/OrientationDialog";
import { toast } from "sonner";

export default function Recidivists() {
  const [selectedType, setSelectedType] = useState<"" | "pouco_rodado" | "horas_extras">("");
  const [selectedConductor, setSelectedConductor] = useState<string>("");
  const [warningLevel, setWarningLevel] = useState<"1" | "2" | "3">("1");
  const [warningReason, setWarningReason] = useState("");
  const [warningNote, setWarningNote] = useState("");
  const [licensePlate, setLicensePlate] = useState("");
  const [infrationDays, setInfrationDays] = useState("");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [dialogWarningType, setDialogWarningType] = useState<"pouco_rodado" | "horas_extras">("pouco_rodado");
  const [editingWarningId, setEditingWarningId] = useState<number | null>(null);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [editWarningLevel, setEditWarningLevel] = useState<"1" | "2" | "3">("1");
  const [editWarningReason, setEditWarningReason] = useState("");
  const [editWarningNote, setEditWarningNote] = useState("");
  const [editWarningType, setEditWarningType] = useState<"pouco_rodado" | "horas_extras">("pouco_rodado");
  const [orientationDialogOpen, setOrientationDialogOpen] = useState(false);
  const [selectedMotoristaForOrientation, setSelectedMotoristaForOrientation] = useState<{ name: string; placa: string } | null>(null);

  const { data, isLoading, refetch } = trpc.dashboard.getReincidents.useQuery(
    {
      tipo: selectedType && selectedType !== "" ? (selectedType as "pouco_rodado" | "horas_extras") : undefined,
    },
    {
      enabled: true,
      staleTime: 0,
    }
  );

  // Query para buscar todos os motoristas ociosos no dialog
  const { data: idleDriversData } = trpc.dashboard.getIdleDriversForWarning.useQuery(
    {},
    {
      enabled: true,
      staleTime: 0,
    }
  );

  // Debug: log dos dados
  useEffect(() => {
    console.log("Reincidents data:", data);
  }, [data]);

  const updateWarningMutation = trpc.dashboard.updateWarning.useMutation({
    onSuccess: () => {
      toast.success("Advertência atualizada com sucesso");
      setEditDialogOpen(false);
      setEditingWarningId(null);
      setEditWarningLevel("1");
      setEditWarningReason("");
      setEditWarningNote("");
      refetch();
    },
    onError: (error) => {
      toast.error(`Erro: ${error.message}`);
    },
  });

  const createWarningMutation = trpc.dashboard.createWarning.useMutation({
    onSuccess: () => {
      toast.success("Advertência registrada com sucesso");
      // Fechar dialog sem reload
      setDialogOpen(false);
      // Limpar formulário
      setSelectedConductor("");
      setWarningLevel("1");
      setWarningReason("");
      setWarningNote("");
      setLicensePlate("");
      setInfrationDays("");
      setDialogWarningType("pouco_rodado");
      // Refetch dados sem reload de página
      refetch();
    },
    onError: (error) => {
      toast.error(`Erro: ${error.message}`);
    },
  });

  const handleCreateWarning = () => {
    if (!selectedConductor || !warningReason) {
      toast.error("Preencha motorista e motivo");
      return;
    }

    createWarningMutation.mutate({
      conductorName: selectedConductor,
      tipo: dialogWarningType,
      nivelAdvertencia: parseInt(warningLevel),
      motivo: warningReason,
      observacao: warningNote,
    });
  };

  const handleEditWarning = (warning: any) => {
    setEditingWarningId(warning.id);
    setEditWarningType(warning.tipo);
    setEditWarningLevel(String(warning.nivelAdvertencia) as "1" | "2" | "3");
    setEditWarningReason(warning.motivo);
    setEditWarningNote(warning.observacao || "");
    setEditDialogOpen(true);
  };

  const handleSaveEditWarning = () => {
    if (!editingWarningId || !editWarningReason) {
      toast.error("Preencha todos os campos obrigatórios");
      return;
    }

    updateWarningMutation.mutate({
      warningId: editingWarningId,
      tipo: editWarningType,
      nivelAdvertencia: parseInt(editWarningLevel),
      motivo: editWarningReason,
      observacao: editWarningNote,
    });
  };

  const generateEmailTemplate = () => {
    if (!selectedConductor || !licensePlate || !infrationDays || !warningReason) {
      return "";
    }

    const typeLabel = selectedType === "pouco_rodado" ? "Pouco Rodado" : "Horas Extras";
    const date = new Date();
    const dateStr = date.toLocaleDateString("pt-BR");
    const timeStr = date.toLocaleTimeString("pt-BR");

    const lines = [
      "Solicitação de Advertência - Motorista Ocioso",
      "",
      "---",
      "",
      `Motorista: ${selectedConductor}`,
      `Placa do Veículo: ${licensePlate}`,
      `Dias de Infração: ${infrationDays}`,
      `Tipo de Infração: ${typeLabel}`,
      `Nível de Aviso: ${warningLevel}`,
      "",
      "Descrição da Infração:",
      warningReason,
    ];

    if (warningNote) {
      lines.push("");
      lines.push("Observações Adicionais:");
      lines.push(warningNote);
    }

    lines.push("");
    lines.push("---");
    lines.push("");
    lines.push(`Solicitação gerada em: ${dateStr} às ${timeStr}`);

    return lines.join("\n");
  };

  const handleCopyEmail = () => {
    if (!selectedConductor || !licensePlate || !infrationDays || !warningReason) {
      toast.error("Preencha todos os campos obrigatórios para gerar o email");
      return;
    }
    const emailContent = generateEmailTemplate();
    navigator.clipboard.writeText(emailContent);
    toast.success("Email copiado para a área de transferência!");
  };

  const getWarningBadgeColor = (nivel: number) => {
    switch (nivel) {
      case 1:
        return "bg-yellow-100 text-yellow-800";
      case 2:
        return "bg-orange-100 text-orange-800";
      case 3:
        return "bg-red-100 text-red-800";
      default:
        return "bg-gray-100 text-gray-800";
    }
  };

  const getWarningIcon = (nivel: number) => {
    if (nivel >= 3) {
      return <AlertTriangle className="w-4 h-4 text-red-600" />;
    }
    return <AlertCircle className="w-4 h-4 text-orange-600" />;
  };

  const selectedConductorData = data?.reincidents?.find(
    (r: any) => r.conductorName === selectedConductor
  );

  // Auto-preencher placa quando motorista é selecionado
  const handleConductorChange = (value: string) => {
    setSelectedConductor(value);
    const conductor = idleDriversData?.drivers?.find((d: any) => d.conductorName === value);
    if (conductor?.placa) {
      setLicensePlate(conductor.placa);
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
        <h1 className="text-3xl font-bold text-slate-900">Controle de Reincidentes</h1>
        <p className="text-slate-600 mt-2">
          Gerencie advertências e acompanhe motoristas reincidentes
        </p>
      </div>

      {/* Filtros e Ação */}
      <div className="bg-white rounded-lg border border-slate-200 p-6 space-y-4">
        <div className="flex justify-between items-start gap-4">
          <div className="flex-1">
            <label className="text-sm font-medium text-slate-700 block mb-2">
              Filtrar por tipo:
            </label>
            <Select value={selectedType} onValueChange={(v: any) => setSelectedType(v)}>
              <SelectTrigger className="w-full">
                <SelectValue placeholder="Todos os tipos" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="__all__">Todos os tipos</SelectItem>
                <SelectItem value="pouco_rodado">Pouco Rodado</SelectItem>
                <SelectItem value="horas_extras">Horas Extras</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Dialog para nova advertência */}
          <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
            <DialogTrigger asChild>
              <Button className="mt-6 bg-red-600 hover:bg-red-700">
                + Nova Advertência
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>Registrar Nova Advertência</DialogTitle>
              </DialogHeader>
              <div className="grid grid-cols-2 gap-6">
                {/* Coluna esquerda: Formulário */}
                <div className="space-y-4">
                  <div>
                    <label className="text-sm font-medium text-slate-700 block mb-2">
                      Motorista: *
                    </label>
                    <Select value={selectedConductor} onValueChange={handleConductorChange}>
                      <SelectTrigger>
                        <SelectValue placeholder="Selecione o motorista" />
                      </SelectTrigger>
                      <SelectContent>
                        {idleDriversData?.drivers?.map((d: any) => (
                          <SelectItem key={d.conductorName} value={d.conductorName}>
                            {d.conductorName}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div>
                    <label className="text-sm font-medium text-slate-700 block mb-2">
                      Placa do Veículo: *
                    </label>
                    <input
                      type="text"
                      value={licensePlate}
                      onChange={(e) => setLicensePlate(e.target.value.toUpperCase())}
                      placeholder="Ex: ABC-1234"
                      className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                    />
                  </div>

                  <div>
                    <label className="text-sm font-medium text-slate-700 block mb-2">
                      Dias de Infração: *
                    </label>
                    <input
                      type="text"
                      value={infrationDays}
                      onChange={(e) => setInfrationDays(e.target.value)}
                      placeholder="Ex: 02/05/2026, 01/05/2026"
                      className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                    />
                  </div>

                  <div>
                    <label className="text-sm font-medium text-slate-700 block mb-2">
                      Tipo:
                    </label>
                    <Select value={dialogWarningType} onValueChange={(v: any) => setDialogWarningType(v)}>
                      <SelectTrigger>
                        <SelectValue placeholder="Selecione o tipo" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="pouco_rodado">Pouco Rodado</SelectItem>
                        <SelectItem value="horas_extras">Horas Extras</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div>
                    <label className="text-sm font-medium text-slate-700 block mb-2">
                      Nível de Advertência:
                    </label>
                    <Select value={warningLevel} onValueChange={(v: any) => setWarningLevel(v)}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="1">Aviso 1</SelectItem>
                        <SelectItem value="2">Aviso 2</SelectItem>
                        <SelectItem value="3">Aviso 3 (Crítico)</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div>
                    <label className="text-sm font-medium text-slate-700 block mb-2">
                      Motivo: *
                    </label>
                    <textarea
                      value={warningReason}
                      onChange={(e) => setWarningReason(e.target.value)}
                      placeholder="Descreva o motivo da advertência"
                      className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                      rows={3}
                    />
                  </div>

                  <div>
                    <label className="text-sm font-medium text-slate-700 block mb-2">
                      Observação (opcional):
                    </label>
                    <textarea
                      value={warningNote}
                      onChange={(e) => setWarningNote(e.target.value)}
                      placeholder="Adicione observações adicionais"
                      className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                      rows={2}
                    />
                  </div>

                  <Button
                    onClick={handleCreateWarning}
                    disabled={createWarningMutation.isPending}
                    className="w-full bg-red-600 hover:bg-red-700"
                  >
                    {createWarningMutation.isPending ? "Registrando..." : "Registrar Advertência"}
                  </Button>
                </div>

                {/* Coluna direita: Histórico e Email */}
                <div className="space-y-4 border-l border-slate-200 pl-6">
                  <div>
                    <h3 className="font-semibold text-slate-900 mb-3">Informações do Motorista</h3>
                    {selectedConductorData ? (
                      <div className="space-y-3">
                        <div className="bg-slate-50 p-3 rounded-lg">
                          <p className="text-sm text-slate-600">Motorista</p>
                          <p className="font-medium text-slate-900">{selectedConductorData.conductorName}</p>
                        </div>

                        <div className="grid grid-cols-2 gap-2">
                          <div className="bg-yellow-50 p-3 rounded-lg">
                            <p className="text-xs text-slate-600">Pouco Rodado (7d)</p>
                            <p className="font-bold text-yellow-700">
                              {selectedConductorData.reincidencias?.poucoRodado7d || 0}x
                            </p>
                          </div>
                          <div className="bg-orange-50 p-3 rounded-lg">
                            <p className="text-xs text-slate-600">Pouco Rodado (30d)</p>
                            <p className="font-bold text-orange-700">
                              {selectedConductorData.reincidencias?.poucoRodado30d || 0}x
                            </p>
                          </div>
                          <div className="bg-blue-50 p-3 rounded-lg">
                            <p className="text-xs text-slate-600">HE (7d)</p>
                            <p className="font-bold text-blue-700">
                              {selectedConductorData.reincidencias?.horasExtras7d || 0}x
                            </p>
                          </div>
                          <div className="bg-purple-50 p-3 rounded-lg">
                            <p className="text-xs text-slate-600">HE (30d)</p>
                            <p className="font-bold text-purple-700">
                              {selectedConductorData.reincidencias?.horasExtras30d || 0}x
                            </p>
                          </div>
                        </div>

                        <div className="bg-slate-50 p-3 rounded-lg">
                          <p className="text-sm text-slate-600 mb-2">Nível Atual</p>
                          <div className="flex gap-2 flex-wrap">
                            {selectedConductorData.avisosPoucoRodado > 0 && (
                              <Badge className={getWarningBadgeColor(selectedConductorData.avisosPoucoRodado)}>
                                Pouco Rodado: Aviso {selectedConductorData.avisosPoucoRodado}
                              </Badge>
                            )}
                            {selectedConductorData.avisosHorasExtras > 0 && (
                              <Badge className={getWarningBadgeColor(selectedConductorData.avisosHorasExtras)}>
                                HE: Aviso {selectedConductorData.avisosHorasExtras}
                              </Badge>
                            )}
                          </div>
                        </div>
                      </div>
                    ) : (
                      <p className="text-sm text-slate-500">Selecione um motorista para ver detalhes</p>
                    )}
                  </div>

                  <div>
                    <h3 className="font-semibold text-slate-900 mb-3">Histórico de Advertências</h3>
                    {selectedConductorData?.historico && selectedConductorData.historico.length > 0 ? (
                      <div className="space-y-2 max-h-40 overflow-y-auto">
                        {selectedConductorData.historico.map((w: any, idx: number) => (
                          <div key={idx} className="bg-slate-50 p-3 rounded-lg border border-slate-200">
                            <div className="flex justify-between items-start mb-1">
                              <Badge className={getWarningBadgeColor(w.nivelAdvertencia)}>
                                Aviso {w.nivelAdvertencia}
                              </Badge>
                              <span className="text-xs text-slate-500">
                                {new Date(w.criadoEm).toLocaleDateString("pt-BR")}
                              </span>
                            </div>
                            <p className="text-sm font-medium text-slate-900">
                              {w.tipo === "pouco_rodado" ? "Pouco Rodado" : "Horas Extras"}
                            </p>
                            <p className="text-xs text-slate-600 mt-1">{w.motivo}</p>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <p className="text-sm text-slate-500">Nenhuma advertência registrada</p>
                    )}
                  </div>

                  <div className="bg-blue-50 p-4 rounded-lg border border-blue-200">
                    <h4 className="font-semibold text-blue-900 mb-2 flex items-center gap-2">
                      <Copy className="w-4 h-4" />
                      Template de Email
                    </h4>
                    <p className="text-xs text-blue-700 mb-3">
                      Preencha todos os campos obrigatórios (*) para gerar o email
                    </p>
                    <Button
                      onClick={handleCopyEmail}
                      disabled={!selectedConductor || !licensePlate || !infrationDays || !warningReason}
                      className="w-full bg-blue-600 hover:bg-blue-700"
                      size="sm"
                    >
                      <Copy className="w-4 h-4 mr-2" />
                      Copiar Email
                    </Button>
                  </div>
                </div>
              </div>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {/* Tabela de Reincidentes */}
      <Card>
        <CardHeader>
          <CardTitle>Motoristas Reincidentes</CardTitle>
          <p className="text-sm text-slate-600 mt-2">
            {data?.reincidents?.length || 0} motorista(s) com advertências
          </p>
        </CardHeader>
        <CardContent>
          {data?.reincidents && data.reincidents.length > 0 ? (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Motorista</TableHead>
                    <TableHead>Aviso Pouco Rodado</TableHead>
                    <TableHead>Aviso Horas Extras</TableHead>
                    <TableHead>Último Aviso</TableHead>
                    <TableHead>Advertência Gerada</TableHead>
                    <TableHead>Advertência Aplicada</TableHead>
                    <TableHead>Assinada</TableHead>
                    <TableHead>Ações</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {data.reincidents.map((item: any) => (
                    <TableRow key={item.conductorName}>
                      <TableCell className="font-medium">{item.conductorName}</TableCell>
                      <TableCell>
                        {item.avisosPoucoRodado > 0 ? (
                          <Badge className={getWarningBadgeColor(item.avisosPoucoRodado)}>
                            {getWarningIcon(item.avisosPoucoRodado)}
                            <span className="ml-1">Aviso {item.avisosPoucoRodado}</span>
                          </Badge>
                        ) : (
                          <span className="text-slate-500">-</span>
                        )}
                      </TableCell>
                      <TableCell>
                        {item.avisosHorasExtras > 0 ? (
                          <Badge className={getWarningBadgeColor(item.avisosHorasExtras)}>
                            {getWarningIcon(item.avisosHorasExtras)}
                            <span className="ml-1">Aviso {item.avisosHorasExtras}</span>
                          </Badge>
                        ) : (
                          <span className="text-slate-500">-</span>
                        )}
                      </TableCell>
                      <TableCell>
                        {item.ultimoAviso
                          ? new Date(item.ultimoAviso).toLocaleDateString("pt-BR")
                          : "-"}
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline" className="bg-green-50 text-green-700">
                          ✓ Sim
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline" className="bg-blue-50 text-blue-700">
                          ✓ Sim
                        </Badge>
                      </TableCell>
                      <TableCell>
                        {item.historico && item.historico.length > 0 ? (
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => {
                              const warningId = item.historico[0]?.id;
                              if (warningId) {
                                markWarningAsSignedMutation.mutate({ warningId });
                              }
                            }}
                            className={item.historico[0]?.assinada ? "bg-green-100 text-green-700" : ""}
                          >
                            {item.historico[0]?.assinada ? "✓ Assinada" : "Marcar Assinada"}
                          </Button>
                        ) : (
                          <span className="text-slate-500">-</span>
                        )}
                      </TableCell>
                      <TableCell>
                        <div className="flex gap-2">
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => {
                              setSelectedMotoristaForOrientation({
                                name: item.conductorName,
                                placa: item.placa,
                              });
                              setOrientationDialogOpen(true);
                            }}
                            className="gap-2"
                            title="Registrar orientação"
                          >
                            <MessageSquare className="w-4 h-4" />
                            Orientação
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => handleEditWarning(item.historico?.[0])}
                            disabled={!item.historico || item.historico.length === 0}
                            className="gap-2"
                          >
                            <Edit2 className="w-4 h-4" />
                            Editar
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>

              {/* Dialog de Edição */}
              <Dialog open={editDialogOpen} onOpenChange={setEditDialogOpen}>
                <DialogContent className="max-w-2xl">
                  <DialogHeader>
                    <DialogTitle>Editar Advertência</DialogTitle>
                  </DialogHeader>
                  <div className="space-y-4">
                    <div>
                      <label className="text-sm font-medium text-slate-700 block mb-2">
                        Tipo:
                      </label>
                      <Select value={editWarningType} onValueChange={(v: any) => setEditWarningType(v)}>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="pouco_rodado">Pouco Rodado</SelectItem>
                          <SelectItem value="horas_extras">Horas Extras</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    <div>
                      <label className="text-sm font-medium text-slate-700 block mb-2">
                        Nível de Advertência:
                      </label>
                      <Select value={editWarningLevel} onValueChange={(v: any) => setEditWarningLevel(v)}>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="1">Aviso 1</SelectItem>
                          <SelectItem value="2">Aviso 2</SelectItem>
                          <SelectItem value="3">Aviso 3 (Crítico)</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    <div>
                      <label className="text-sm font-medium text-slate-700 block mb-2">
                        Motivo: *
                      </label>
                      <textarea
                        value={editWarningReason}
                        onChange={(e) => setEditWarningReason(e.target.value)}
                        placeholder="Descreva o motivo da advertência"
                        className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                        rows={3}
                      />
                    </div>

                    <div>
                      <label className="text-sm font-medium text-slate-700 block mb-2">
                        Observação (opcional):
                      </label>
                      <textarea
                        value={editWarningNote}
                        onChange={(e) => setEditWarningNote(e.target.value)}
                        placeholder="Adicione observações adicionais"
                        className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                        rows={2}
                      />
                    </div>

                    <div className="flex gap-2 justify-end">
                      <Button
                        variant="outline"
                        onClick={() => setEditDialogOpen(false)}
                      >
                        Cancelar
                      </Button>
                      <Button
                        onClick={handleSaveEditWarning}
                        disabled={updateWarningMutation.isPending}
                        className="bg-blue-600 hover:bg-blue-700"
                      >
                        {updateWarningMutation.isPending ? "Salvando..." : "Salvar Alterações"}
                      </Button>
                    </div>
                  </div>
                </DialogContent>
              </Dialog>
            </div>
          ) : (
            <p className="text-center text-slate-600 py-8">
              Nenhum motorista reincidente encontrado
            </p>
          )}
        </CardContent>
      </Card>

      {/* Dialog de Orientação */}
      <OrientationDialog
        open={orientationDialogOpen}
        onOpenChange={setOrientationDialogOpen}
        motorista={selectedMotoristaForOrientation}
        onSuccess={() => {
          refetch();
          setOrientationDialogOpen(false);
        }}
      />
    </div>
  );
}

  const markWarningAsSignedMutation = trpc.dashboard.markWarningAsSigned.useMutation({
    onSuccess: () => {
      toast.success("Advertência marcada como assinada");
      refetch();
    },
    onError: (error) => {
      toast.error(`Erro: ${error.message}`);
    },
  });
