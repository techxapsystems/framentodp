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
} from "@/components/ui/dialog";
import { AlertTriangle, AlertCircle, Edit2, MessageSquare, Check, X } from "lucide-react";
import { OrientationDialog } from "@/components/OrientationDialog";
import { toast } from "sonner";

export default function WarningsManagement() {
  const [selectedType, setSelectedType] = useState<string>("");
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
      tipo: selectedType && selectedType !== "__all__" ? (selectedType as "pouco_rodado" | "horas_extras") : undefined,
    },
    {
      enabled: true,
      staleTime: 0,
    }
  );

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

  const markAppliedMutation = trpc.dashboard.markWarningApplied.useMutation({
    onSuccess: () => {
      toast.success("Advertencia marcada como aplicada com sucesso");
      refetch();
    },
    onError: (error) => {
      toast.error(`Erro: ${error.message}`);
    },
  });

  const revertWarningMutation = trpc.dashboard.revertWarning.useMutation({
    onSuccess: () => {
      toast.success("Advertencia revertida para pendente com sucesso");
      refetch();
    },
    onError: (error) => {
      toast.error(`Erro: ${error.message}`);
    },
  });

  const handleEditWarning = (warning: any) => {
    setEditingWarningId(warning.id);
    setEditWarningLevel(warning.nivelAdvertencia as "1" | "2" | "3");
    setEditWarningReason(warning.motivo);
    setEditWarningNote(warning.observacoes || "");
    setEditWarningType(warning.tipo as "pouco_rodado" | "horas_extras");
    setEditDialogOpen(true);
  };

  const handleSaveEdit = () => {
    if (!editingWarningId) return;
    
    updateWarningMutation.mutate({
      warningId: editingWarningId,
      nivelAdvertencia: parseInt(editWarningLevel),
      motivo: editWarningReason,
      observacao: editWarningNote,
      tipo: editWarningType,
    });
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

  return (
    <div className="p-8 space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold text-slate-900">
          Gerenciamento de Advertências
        </h1>
        <p className="text-slate-600 mt-2">
          Gerencie advertências e acompanhe motoristas reincidentes
        </p>
      </div>

      {/* Filtros */}
      <Card>
        <CardHeader>
          <CardTitle>Filtrar por tipo</CardTitle>
        </CardHeader>
        <CardContent>
          <Select value={selectedType || "__all__"} onValueChange={(v: any) => setSelectedType(v === "__all__" ? "" : v)}>
            <SelectTrigger className="w-full">
              <SelectValue placeholder="Todos os tipos" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="__all__">Todos os tipos</SelectItem>
              <SelectItem value="pouco_rodado">Pouco Rodado</SelectItem>
              <SelectItem value="horas_extras">Horas Extras</SelectItem>
            </SelectContent>
          </Select>
        </CardContent>
      </Card>

      {/* Tabela de Motoristas */}
      <Card>
        <CardHeader>
          <CardTitle>Motoristas com Advertências</CardTitle>
          <p className="text-sm text-slate-600 mt-2">
            {data?.reincidents?.length || 0} motorista(s) com advertências
          </p>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="animate-pulse space-y-4">
              <div className="h-10 bg-slate-200 rounded-lg" />
              <div className="h-10 bg-slate-200 rounded-lg" />
              <div className="h-10 bg-slate-200 rounded-lg" />
            </div>
          ) : data?.reincidents && data.reincidents.length > 0 ? (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Motorista</TableHead>
                    <TableHead>Aviso Pouco Rodado</TableHead>
                    <TableHead>Aviso Horas Extras</TableHead>
                    <TableHead>Último Aviso</TableHead>
                    <TableHead>Status</TableHead>
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
                        {item.historico && item.historico.length > 0 ? (
                          <div className="space-y-1">
                            {!item.historico[0].advertenciaAplicada ? (
                              <Badge className="bg-yellow-100 text-yellow-800 border border-yellow-300">
                                ⏳ Pendente
                              </Badge>
                            ) : !item.historico[0].assinada ? (
                              <Badge className="bg-blue-100 text-blue-800 border border-blue-300">
                                ✓ Aplicada
                              </Badge>
                            ) : (
                              <Badge className="bg-green-100 text-green-800 border border-green-300">
                                ✓✓ Assinada
                              </Badge>
                            )}
                          </div>
                        ) : (
                          <span className="text-slate-500">-</span>
                        )}
                      </TableCell>
                      <TableCell>
                        <div className="flex gap-1 flex-wrap">
                          {/* Botão Orientação */}
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
                          
                          {/* Botão Marcar como Aplicada */}
                          {item.historico && item.historico.length > 0 && !item.historico[0].advertenciaAplicada && (
                            <Button
                              size="sm"
                              variant="outline"
                              className="gap-2 border-blue-300 text-blue-700 hover:bg-blue-50"
                              title="Marcar como aplicada"
                              onClick={() => {
                                markAppliedMutation.mutate({
                                  warningId: item.historico[0].id,
                                  dataAplicacao: new Date().toISOString().split('T')[0],
                                  assinada: false,
                                });
                              }}
                              disabled={markAppliedMutation.isPending}
                            >
                              <Check className="w-4 h-4" />
                              Aplicada
                            </Button>
                          )}
                          
                          {/* Botao Reverter para Pendente */}
                          {item.historico && item.historico.length > 0 && item.historico[0].advertenciaAplicada && (
                            <Button
                              size="sm"
                              variant="outline"
                              className="gap-2 border-red-300 text-red-700 hover:bg-red-50"
                              title="Reverter para pendente"
                              onClick={() => {
                                if (confirm("Tem certeza que deseja reverter esta advertencia para pendente?")) {
                                  revertWarningMutation.mutate({
                                    warningId: item.historico[0].id,
                                  });
                                }
                              }}
                              disabled={revertWarningMutation.isPending}
                            >
                              <X className="w-4 h-4" />
                              Reverter
                            </Button>
                          )}
                          
                          {/* Botao Editar */}
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => {
                              if (item.historico && item.historico.length > 0) {
                                handleEditWarning(item.historico[0]);
                              }
                            }}
                            className="gap-2"
                            title="Editar advertência"
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
            </div>
          ) : (
            <div className="text-center py-8">
              <p className="text-slate-500">Nenhuma advertência encontrada</p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Dialog de Orientação */}
      {selectedMotoristaForOrientation && (
        <OrientationDialog
          open={orientationDialogOpen}
          onOpenChange={setOrientationDialogOpen}
          motorista={selectedMotoristaForOrientation}
          onSuccess={() => {
            refetch();
            setOrientationDialogOpen(false);
          }}
        />
      )}

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
                Motivo:
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
              <Button variant="outline" onClick={() => setEditDialogOpen(false)}>
                Cancelar
              </Button>
              <Button
                onClick={handleSaveEdit}
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
  );
}
