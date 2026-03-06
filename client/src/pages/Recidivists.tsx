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
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { BookOpen, ExternalLink } from "lucide-react";
import { WarningPDFButton } from "@/components/WarningPDFGenerator";
import { toast } from "sonner";
import { DateMaskInput } from "@/components/DateMaskInput";

export default function Recidivists() {
  const [selectedConductor, setSelectedConductor] = useState<string>("");
  const [warningType, setWarningType] = useState<"advertencia" | "suspensao">("advertencia");
  const [infrationDate, setInfrationDate] = useState("");
  const [warningContent, setWarningContent] = useState("");
  const [licensePlate, setLicensePlate] = useState("");
  const [operacao, setOperacao] = useState<string>("");
  const [dialogOpen, setDialogOpen] = useState(false);

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

  const utils = trpc.useUtils();

  const createWarningMutation = trpc.dashboard.createWarning.useMutation({
    onSuccess: (data: any) => {
      toast.success("Advertência registrada com sucesso");
      // Gerar PDF automaticamente se houver ID
      if (data?.id) {
        setTimeout(() => {
          const pdfButton = document.querySelector('[data-pdf-trigger]') as HTMLButtonElement;
          if (pdfButton) {
            pdfButton.click();
            toast.success("PDF gerado automaticamente");
          }
        }, 300);
      }
      // Invalidar queries para forçar refresh
      utils.dashboard.getIdleDriversForWarning.invalidate();
      // Limpar formulário
      setSelectedConductor("");
      setWarningType("advertencia");
      setWarningContent("");
      setLicensePlate("");
      setInfrationDate("");
      setOperacao("");
      setDialogOpen(false);
    },
    onError: (error) => {
      toast.error(`Erro: ${error.message}`);
    },
  });

  const handleCreateWarning = () => {
    if (!selectedConductor || !licensePlate || !operacao || !infrationDate || !warningContent) {
      toast.error("Preencha todos os campos obrigatórios");
      return;
    }

    createWarningMutation.mutate({
      conductorName: selectedConductor,
      nivelAdvertencia: 1,
      motivo: warningContent,
      observacao: "",
      tipo: warningType === "advertencia" ? "pouco_rodado" : "horas_extras",
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

  const openTemplateLibrary = () => {
    window.open("/biblioteca-modelos", "_blank");
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
            <Button className="bg-yellow-500 hover:bg-yellow-600 text-slate-900 font-semibold" size="lg">
              + Nova Advertência
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Registrar Nova Advertência</DialogTitle>
            </DialogHeader>

            <div className="space-y-4">
              {/* Motorista */}
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

              {/* Placa do Veículo */}
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

              {/* Operação */}
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

              {/* Data da Infração */}
              <div>
                <label className="text-sm font-medium text-slate-700 block mb-2">
                  Data da Infração (DD/MM/YYYY): *
                </label>
                <DateMaskInput
                  value={infrationDate}
                  onChange={setInfrationDate}
                  placeholder="DD/MM/YYYY"
                />
              </div>

              {/* Tipo */}
              <div>
                <label className="text-sm font-medium text-slate-700 block mb-2">
                  Tipo: *
                </label>
                <Select value={warningType} onValueChange={(v: any) => setWarningType(v)}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="advertencia">Advertência</SelectItem>
                    <SelectItem value="suspensao">Suspensão</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Conteúdo da Advertência */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <label className="text-sm font-medium text-slate-700">
                    Texto da Advertência/Suspensão: *
                  </label>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={openTemplateLibrary}
                    className="gap-2"
                  >
                    <BookOpen className="w-4 h-4" />
                    Abrir Biblioteca
                    <ExternalLink className="w-3 h-3" />
                  </Button>
                </div>
                <textarea
                  value={warningContent}
                  onChange={(e) => setWarningContent(e.target.value)}
                  placeholder="Cole aqui o texto do modelo de advertência ou suspensão"
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-yellow-500 font-mono text-sm resize-none overflow-y-auto"
                  rows={16}
                  style={{ maxHeight: '400px' }}
                />
                <p className="text-xs text-slate-500 mt-2">
                  💡 Clique em "Abrir Biblioteca" para copiar um modelo padrão
                </p>
              </div>

              {/* Botões de ação */}
              <div className="flex gap-3">
                <Button
                  onClick={handleCreateWarning}
                  disabled={createWarningMutation.isPending}
                  className="flex-1 bg-yellow-500 hover:bg-yellow-600 text-slate-900 font-semibold"
                >
                  {createWarningMutation.isPending ? "Registrando..." : "Registrar Advertência"}
                </Button>
              </div>

              {/* Botão PDF sempre visível quando há dados */}
              {selectedConductor && licensePlate && operacao && warningContent && (
                <div className="pt-4 border-t border-slate-200">
                  <p className="text-sm font-medium text-slate-700 mb-3">Gerar Documento:</p>
                  <WarningPDFButton
                    conductorName={selectedConductor}
                    licensePlate={licensePlate}
                    operacao={operacao}
                    warningLevel="1"
                    warningType={warningType === "advertencia" ? "pouco_rodado" : "horas_extras"}
                    warningReason={warningContent}
                    warningNote=""
                    infrationDays={infrationDate}
                    disabled={false}
                  />
                </div>
              )}
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {/* Card informativo */}
      <Card>
        <CardHeader>
          <CardTitle>Como usar</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3 text-sm text-slate-600">
          <div>
            <p className="font-medium text-slate-900">1. Selecione o motorista</p>
            <p>A placa do veículo e operação serão preenchidas automaticamente</p>
          </div>
          <div>
            <p className="font-medium text-slate-900">2. Preencha a data da infração</p>
            <p>Use o formato DD/MM/YYYY (ex: 23/02/2026)</p>
          </div>
          <div>
            <p className="font-medium text-slate-900">3. Escolha o tipo</p>
            <p>Selecione entre Advertência ou Suspensão</p>
          </div>
          <div>
            <p className="font-medium text-slate-900">4. Cole o texto do modelo</p>
            <p>Clique em "Abrir Biblioteca" para acessar os modelos padrão em uma nova aba. Copie o modelo desejado e cole no campo de texto.</p>
          </div>
          <div>
            <p className="font-medium text-slate-900">5. Registre e gere o PDF</p>
            <p>Clique em "Registrar Advertência" para salvar. O botão "Gerar PDF" aparecerá para criar o documento com branding da empresa</p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
