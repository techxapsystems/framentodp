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
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Copy } from "lucide-react";
import { WarningPDFButton } from "@/components/WarningPDFGenerator";
import { toast } from "sonner";
import { DateMaskInput } from "@/components/DateMaskInput";

export default function Recidivists() {
  const [selectedConductor, setSelectedConductor] = useState<string>("");
  const [warningLevel, setWarningLevel] = useState<"1" | "2" | "3">("1");
  const [warningReason, setWarningReason] = useState("");
  const [warningNote, setWarningNote] = useState("");
  const [licensePlate, setLicensePlate] = useState("");
  const [infrationDays, setInfrationDays] = useState("");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [dialogWarningType, setDialogWarningType] = useState<"pouco_rodado" | "horas_extras">("pouco_rodado");
  const [operacao, setOperacao] = useState<string>("");
  const [tipoColaborador, setTipoColaborador] = useState<string>("");
  const [dataAnotacao, setDataAnotacao] = useState<string>("");
  const [sequencia, setSequencia] = useState<string>("");
  const [tipoAnotacao, setTipoAnotacao] = useState<string>("");
  const [codigoTreinamento, setCodigoTreinamento] = useState<string>("");
  const [numeroDocumento, setNumeroDocumento] = useState<string>("");
  const [empresaResponsavel, setEmpresaResponsavel] = useState<string>("");
  const [tipoResponsavel, setTipoResponsavel] = useState<string>("");
  const [responsavelAnotacao, setResponsavelAnotacao] = useState<string>("");

  // Buscar operações disponíveis
  const { data: operacoes = [] } = trpc.dashboard.getAllOperations.useQuery();

  // Query para buscar todos os motoristas ociosos no dialog
  const { data: idleDriversData } = trpc.dashboard.getIdleDriversForWarning.useQuery(
    {},
    {
      enabled: true,
      staleTime: 0,
    }
  );

  const selectedConductorData = idleDriversData && Array.isArray(idleDriversData)
    ? idleDriversData.find((d: any) => d.conductorName === selectedConductor)
    : null;

  const createWarningMutation = trpc.dashboard.createWarning.useMutation({
    onSuccess: () => {
      toast.success("Advertência registrada com sucesso");
      setSelectedConductor("");
      setWarningLevel("1");
      setWarningReason("");
      setWarningNote("");
      setLicensePlate("");
      setInfrationDays("");
      setOperacao("");
      setDialogOpen(false);
    },
    onError: (error) => {
      toast.error(`Erro: ${error.message}`);
    },
  });

  const handleCreateWarning = () => {
    if (!selectedConductor || !licensePlate || !operacao || !warningReason) {
      toast.error("Preencha todos os campos obrigatórios");
      return;
    }

    createWarningMutation.mutate({
      conductorName: selectedConductor,
      placa: licensePlate,
      operacao: operacao,
      nivelAdvertencia: parseInt(warningLevel),
      motivo: warningReason,
      observacoes: warningNote,
      tipo: dialogWarningType,
      tipoColaborador: tipoColaborador || "",
      dataAnotacao: dataAnotacao || "",
      sequencia: sequencia || "",
      tipoAnotacao: tipoAnotacao || "",
      codigoTreinamento: codigoTreinamento || "",
      numeroDocumento: numeroDocumento || "",
      empresaResponsavel: empresaResponsavel || "",
      tipoResponsavel: tipoResponsavel || "",
      responsavelAnotacao: responsavelAnotacao || "",
    });
  };

  const handleConductorChange = (conductorName: string) => {
    setSelectedConductor(conductorName);
    const conductor = idleDriversData?.find((d: any) => d.conductorName === conductorName);
    if (conductor) {
      setLicensePlate(conductor.placa || "");
      setOperacao(conductor.operacao || "");
    }
  };

  const handleCopyEmail = () => {
    if (!selectedConductor || !licensePlate || !infrationDays || !warningReason) {
      toast.error("Preencha os campos obrigatórios");
      return;
    }

    const emailTemplate = `
Prezado(a),

Informamos que você recebeu uma advertência conforme detalhes abaixo:

DADOS DA ADVERTÊNCIA:
- Motorista: ${selectedConductor}
- Placa: ${licensePlate}
- Operação: ${operacao}
- Tipo: ${dialogWarningType === "pouco_rodado" ? "Pouco Rodado" : "Horas Extras"}
- Nível: Aviso ${warningLevel}
- Dias de Infração: ${infrationDays}
- Motivo: ${warningReason}
${warningNote ? `- Observações: ${warningNote}` : ""}

Favor tomar as devidas providências.

Atenciosamente,
Departamento de Pessoal
    `.trim();

    navigator.clipboard.writeText(emailTemplate);
    toast.success("Email copiado para a área de transferência");
  };

  return (
    <div className="p-8 space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold text-slate-900">
          Cadastro de Advertências
        </h1>
        <p className="text-slate-600 mt-2">
          Registre novas advertências para motoristas
        </p>
      </div>

      {/* Botão para abrir dialog */}
      <div>
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogTrigger asChild>
            <Button className="bg-red-600 hover:bg-red-700" size="lg">
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
                      <SelectValue placeholder="Selecione um motorista" />
                    </SelectTrigger>
                    <SelectContent>
                      {Array.isArray(idleDriversData) && idleDriversData.map((driver: any) => (
                        <SelectItem key={driver.conductorName} value={driver.conductorName}>
                          {driver.conductorName}
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
                    readOnly
                    placeholder="Preenchida automaticamente"
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg bg-slate-50"
                  />
                </div>

                <div>
                  <label className="text-sm font-medium text-slate-700 block mb-2">
                    Operação: *
                  </label>
                  <input
                    type="text"
                    value={operacao}
                    readOnly
                    placeholder="Preenchida automaticamente"
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg bg-slate-50"
                  />
                </div>

                <div>
                  <label className="text-sm font-medium text-slate-700 block mb-2">
                    Data da Infração (DD/MM/YYYY): *
                  </label>
                  <DateMaskInput
                    value={infrationDays}
                    onChange={setInfrationDays}
                    placeholder="DD/MM/YYYY"
                  />
                </div>

                <div>
                  <label className="text-sm font-medium text-slate-700 block mb-2">
                    Tipo:
                  </label>
                  <Select value={dialogWarningType} onValueChange={(v: any) => setDialogWarningType(v)}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="pouco_rodado">Advertência</SelectItem>
                      <SelectItem value="horas_extras">Suspensão</SelectItem>
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

                <div className="space-y-2">
                  <Button
                    onClick={handleCreateWarning}
                    disabled={createWarningMutation.isPending}
                    className="w-full bg-red-600 hover:bg-red-700"
                  >
                    {createWarningMutation.isPending ? "Registrando..." : "Registrar Advertência"}
                  </Button>
                  <WarningPDFButton
                    conductorName={selectedConductor}
                    licensePlate={licensePlate}
                    operacao={operacao}
                    warningLevel={warningLevel}
                    warningType={dialogWarningType}
                    warningReason={warningReason}
                    warningNote={warningNote}
                    infrationDays={infrationDays}
                    disabled={!selectedConductor || !licensePlate || !operacao}
                  />
                </div>
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
                    </div>
                  ) : (
                    <p className="text-sm text-slate-500">Selecione um motorista para ver detalhes</p>
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

      {/* Card informativo */}
      <Card>
        <CardHeader>
          <CardTitle>Como usar</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-slate-600">
            Clique no botão "+ Nova Advertência" para registrar uma nova advertência. 
            Selecione um motorista e preencha os campos obrigatórios. A placa e operação 
            serão preenchidas automaticamente.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
