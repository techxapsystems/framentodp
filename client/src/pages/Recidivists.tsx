import { useState } from "react";
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
import { AlertTriangle, AlertCircle } from "lucide-react";
import { toast } from "sonner";

export default function Recidivists() {
  const [selectedType, setSelectedType] = useState<"" | "pouco_rodado" | "horas_extras">("");
  const [selectedConductor, setSelectedConductor] = useState<string>("");
  const [warningLevel, setWarningLevel] = useState<"1" | "2" | "3">("1");
  const [warningReason, setWarningReason] = useState("");
  const [warningNote, setWarningNote] = useState("");

  const { data, isLoading, refetch } = trpc.dashboard.getReincidents.useQuery({
    tipo: selectedType || undefined,
  });

  const createWarningMutation = trpc.dashboard.createWarning.useMutation({
    onSuccess: () => {
      toast.success("Advertência registrada com sucesso");
      setSelectedConductor("");
      setWarningLevel("1");
      setWarningReason("");
      setWarningNote("");
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
      tipo: selectedType || "pouco_rodado",
      nivelAdvertencia: parseInt(warningLevel),
      motivo: warningReason,
      observacao: warningNote,
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
          <Dialog>
            <DialogTrigger asChild>
              <Button className="mt-6 bg-red-600 hover:bg-red-700">
                + Nova Advertência
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Registrar Nova Advertência</DialogTitle>
              </DialogHeader>
              <div className="space-y-4">
                <div>
                  <label className="text-sm font-medium text-slate-700 block mb-2">
                    Motorista:
                  </label>
                  <Select value={selectedConductor} onValueChange={setSelectedConductor}>
                    <SelectTrigger>
                      <SelectValue placeholder="Selecione o motorista" />
                    </SelectTrigger>
                    <SelectContent>
                      {data?.reincidents?.map((r: any) => (
                        <SelectItem key={r.conductorName} value={r.conductorName}>
                          {r.conductorName}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <label className="text-sm font-medium text-slate-700 block mb-2">
                    Tipo:
                  </label>
                  <Select value={selectedType} onValueChange={(v: any) => setSelectedType(v)}>
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
                    Motivo:
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
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          ) : (
            <p className="text-center text-slate-600 py-8">
              Nenhum motorista reincidente encontrado
            </p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
