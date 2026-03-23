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
  const [data, setData] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Carregar dados via fetch
  useEffect(() => {
    const loadReincidents = async () => {
      try {
        setIsLoading(true);
        const response = await fetch("/api/auth/reincidents");
        const result = await response.json();
        setData(result.result?.data?.json || []);
      } catch (error) {
        console.error("Erro ao carregar reincidentes:", error);
        toast.error("Erro ao carregar dados");
      } finally {
        setIsLoading(false);
      }
    };
    loadReincidents();
  }, []);

  const refetch = async () => {
    try {
      const response = await fetch("/api/auth/reincidents");
      const result = await response.json();
      setData(result.result?.data?.json || []);
    } catch (error) {
      console.error("Erro ao recarregar reincidentes:", error);
    }
  };

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
      id: editingWarningId,
      nivelAdvertencia: parseInt(editWarningLevel),
      motivo: editWarningReason,
      observacoes: editWarningNote,
      tipo: editWarningType,
    });
  };

  const handleMarkApplied = (warningId: number) => {
    markAppliedMutation.mutate({ id: warningId });
  };

  const handleRevertWarning = (warningId: number) => {
    revertWarningMutation.mutate({ id: warningId });
  };

  const filteredData = Array.isArray(data)
    ? data.filter((item: any) => {
        if (selectedType && selectedType !== "__all__") {
          return item.warnings?.some((w: any) => w.categoria === selectedType);
        }
        return true;
      })
    : [];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Gerenciamento de Advertências</h1>
        <p className="text-gray-600">Gerencie advertências e acompanhe motoristas reincidentes</p>
      </div>

      {/* Filtro por tipo */}
      <Card>
        <CardHeader>
          <CardTitle>Filtrar por tipo</CardTitle>
        </CardHeader>
        <CardContent>
          <Select value={selectedType} onValueChange={setSelectedType}>
            <SelectTrigger>
              <SelectValue placeholder="Todos os tipos" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="__all__">Todos os tipos</SelectItem>
              <SelectItem value="pouco_rodado">Aviso Pouco Rodado</SelectItem>
              <SelectItem value="horas_extras">Aviso Horas Extras</SelectItem>
            </SelectContent>
          </Select>
        </CardContent>
      </Card>

      {/* Tabela de motoristas com advertências */}
      <Card>
        <CardHeader>
          <CardTitle>Motoristas com Advertências</CardTitle>
          <p className="text-sm text-gray-600">{filteredData.length} motorista(s) com advertências</p>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="text-center py-8">Carregando...</div>
          ) : filteredData.length === 0 ? (
            <div className="text-center py-8 text-gray-500">Nenhum motorista encontrado</div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Motorista</TableHead>
                    <TableHead>Aviso Pouco Rodado</TableHead>
                    <TableHead>Aviso Horas Extras</TableHead>
                    <TableHead>Último Aviso</TableHead>
                    <TableHead>Observação</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Ações</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredData.map((item: any) => (
                    <TableRow key={item.conductorName}>
                      <TableCell className="font-medium">{item.conductorName}</TableCell>
                      <TableCell>{item.avisosPoucoRodado || "-"}</TableCell>
                      <TableCell>{item.avisosHorasExtras || "-"}</TableCell>
                      <TableCell>
                        {item.ultimoAviso ? new Date(item.ultimoAviso).toLocaleDateString("pt-BR") : "-"}
                      </TableCell>
                      <TableCell>{item.observacao || "-"}</TableCell>
                      <TableCell>
                        <Badge variant={item.maxLevel >= 3 ? "destructive" : "secondary"}>
                          {item.maxLevel >= 3 ? "Crítico" : "Ativo"}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <div className="flex gap-2">
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => {
                              setSelectedMotoristaForOrientation({
                                name: item.conductorName,
                                placa: "",
                              });
                              setOrientationDialogOpen(true);
                            }}
                          >
                            <MessageSquare className="w-4 h-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Dialog de Orientação */}
      {selectedMotoristaForOrientation && (
        <OrientationDialog
          isOpen={orientationDialogOpen}
          onClose={() => {
            setOrientationDialogOpen(false);
            setSelectedMotoristaForOrientation(null);
          }}
          motorista={selectedMotoristaForOrientation}
          onSuccess={() => {
            refetch();
            setOrientationDialogOpen(false);
            setSelectedMotoristaForOrientation(null);
          }}
        />
      )}

      {/* Dialog de Edição */}
      <Dialog open={editDialogOpen} onOpenChange={setEditDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Editar Advertência</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <label className="text-sm font-medium">Nível</label>
              <Select value={editWarningLevel} onValueChange={setEditWarningLevel}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="1">1 - Leve</SelectItem>
                  <SelectItem value="2">2 - Médio</SelectItem>
                  <SelectItem value="3">3 - Grave</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <label className="text-sm font-medium">Motivo</label>
              <input
                type="text"
                value={editWarningReason}
                onChange={(e) => setEditWarningReason(e.target.value)}
                className="w-full px-3 py-2 border rounded"
              />
            </div>
            <div>
              <label className="text-sm font-medium">Observação</label>
              <textarea
                value={editWarningNote}
                onChange={(e) => setEditWarningNote(e.target.value)}
                className="w-full px-3 py-2 border rounded"
              />
            </div>
            <div className="flex gap-2">
              <Button onClick={handleSaveEdit}>Salvar</Button>
              <Button variant="outline" onClick={() => setEditDialogOpen(false)}>
                Cancelar
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
