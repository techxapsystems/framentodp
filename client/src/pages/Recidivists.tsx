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
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { BookOpen, ExternalLink, Search, X, Upload } from "lucide-react";
import { WarningPDFButton } from "@/components/WarningPDFGenerator";
import { toast } from "sonner";
import { DateMaskInput } from "@/components/DateMaskInput";
import { OperacaoCombobox } from "@/components/OperacaoCombobox";
import { BulkImportSection } from "@/components/BulkImportSection";

export default function Recidivists() {
  const [selectedConductor, setSelectedConductor] = useState<string>("");
  const [warningType, setWarningType] = useState<"advertencia" | "suspensao">("advertencia");
  const [infrationDate, setInfrationDate] = useState("");
  const [warningContent, setWarningContent] = useState("");
  const [licensePlate, setLicensePlate] = useState("");
  const [operacao, setOperacao] = useState<string>("");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [dataInicio, setDataInicio] = useState("");
  const [dataFim, setDataFim] = useState("");
  const [dataRetorno, setDataRetorno] = useState("");
  
  // Novo: Estados para busca controlada
  const [searchInput, setSearchInput] = useState("");
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [showResults, setShowResults] = useState(false);

  // Buscar operações disponíveis
  const { data: operacoes = [] } = trpc.dashboard.getAllOperations.useQuery();
  
  // Diagnóstico
  useEffect(() => {
    console.log('[Recidivists] operacoes data:', operacoes);
    if (operacoes.length > 0) {
      console.log('[Recidivists] First operacao:', operacoes[0]);
      console.log('[Recidivists] First operacao.id type:', typeof operacoes[0].id);
      console.log('[Recidivists] First operacao.nome type:', typeof operacoes[0].nome);
    }
  }, [operacoes]);

  // Query para buscar todos os motoristas
  const { data: queryResult = [], error: queryError, isError } = trpc.dashboard.getIdleDriversForWarning.useQuery(
    undefined,
    {
      enabled: true,
    }
  );

  const allConductors = Array.isArray(queryResult) ? queryResult : [];

  // Buscar dados do motorista selecionado
  const { data: conductorData } = trpc.dashboard.getIdleDriversForWarning.useQuery(
    undefined,
    { enabled: !!selectedConductor }
  );
  
  const selectedConductorData = conductorData?.find((c: any) => c.id === selectedConductor);

  // Mutation para criar advertência
  const createWarningMutation = trpc.dashboard.createWarning.useMutation({
    onSuccess: () => {
      toast.success("Advertência criada com sucesso!");
      setSelectedConductor("");
      setWarningContent("");
      setInfrationDate("");
      setLicensePlate("");
      setOperacao("");
      setDataInicio("");
      setDataFim("");
      setDataRetorno("");
      setDialogOpen(false);
    },
    onError: (error) => {
      toast.error(`Erro ao criar advertência: ${error.message}`);
    },
  });

  // Atualizar dados do motorista quando selecionado
  useEffect(() => {
    if (selectedConductorData) {
      setOperacao(selectedConductorData.operacao || "");
      setLicensePlate(selectedConductorData.placa || "");
    }
  }, [selectedConductorData]);

  // Busca controlada
  useEffect(() => {
    if (searchInput.trim()) {
      const filtered = allConductors.filter(
        (conductor: any) =>
          (conductor.conductorName || "").toLowerCase().includes(searchInput.toLowerCase()) ||
          (conductor.cpf || "").includes(searchInput)
      );
      setSearchResults(filtered);
      setShowResults(true);
    } else {
      setSearchResults([]);
      setShowResults(false);
    }
  }, [searchInput, allConductors]);

  const handleCreateWarning = async () => {
    if (!selectedConductor || !warningContent || !infrationDate) {
      toast.error("Preencha todos os campos obrigatórios");
      return;
    }

    createWarningMutation.mutate({
      conductorName: selectedConductor,
      tipo: warningType,
      motivo: warningContent,
      nivelAdvertencia: warningType === 'advertencia' ? 1 : 0,
      dataInfracao: infrationDate,
      dataInicio: dataInicio || undefined,
      dataFim: dataFim || undefined,
      dataRetorno: dataRetorno || undefined,
    });
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Cadastro de Advertências</h1>
          <p className="text-muted-foreground mt-1">
            Gerencie advertências e suspensões de motoristas
          </p>
        </div>
      </div>

      <Tabs defaultValue="manual" className="w-full">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="manual">Cadastro Manual</TabsTrigger>
          <TabsTrigger value="importacao">
            <Upload className="w-4 h-4 mr-2" />
            Importação em Massa
          </TabsTrigger>
        </TabsList>

        {/* TAB 1: CADASTRO MANUAL */}
        <TabsContent value="manual" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Criar Nova Advertência</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Seleção de Motorista */}
              <div className="space-y-2">
                <label className="text-sm font-medium">Motorista *</label>
                <div className="relative">
                  <div className="flex gap-2">
                    <div className="relative flex-1">
                      <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-4 h-4" />
                      <input
                        type="text"
                        placeholder="Buscar por nome ou CPF..."
                        value={searchInput}
                        onChange={(e) => setSearchInput(e.target.value)}
                        className="w-full pl-10 pr-3 py-2 border rounded-md"
                      />
                    </div>
                    {selectedConductor && (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => {
                          setSelectedConductor("");
                          setSearchInput("");
                          setOperacao("");
                          setLicensePlate("");
                        }}
                      >
                        <X className="w-4 h-4" />
                      </Button>
                    )}
                  </div>

                  {showResults && searchResults.length > 0 && (
                    <div className="absolute top-full left-0 right-0 mt-1 border rounded-md bg-white shadow-lg z-50 max-h-48 overflow-y-auto">
                      {searchResults.map((conductor: any) => (
                        <button
                          key={conductor.id}
                          onClick={() => {
                            setSelectedConductor(conductor.id);
                            setSearchInput("");
                            setShowResults(false);
                          }}
                          className="w-full text-left px-3 py-2 hover:bg-gray-100 border-b last:border-b-0"
                        >
                          <div className="font-medium">{conductor.conductorName || conductor.nome || ""}</div>
                          <div className="text-sm text-muted-foreground">{typeof conductor.cpf === 'string' ? conductor.cpf : String(conductor.cpf || "")}</div>
                        </button>
                      ))}
                    </div>
                  )}
                </div>
                {selectedConductor && (
                  <div className="mt-2 p-2 bg-blue-50 rounded text-sm">
                    ✓ Motorista selecionado: {allConductors.find((c: any) => c.id === selectedConductor)?.conductorName}
                  </div>
                )}
              </div>

              {/* Tipo de Advertência */}
              <div className="space-y-2">
                <label className="text-sm font-medium">Tipo de Advertência *</label>
                <Select value={warningType} onValueChange={(value: any) => setWarningType(value)}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="advertencia">Advertência</SelectItem>
                    <SelectItem value="suspensao">Suspensão</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Data da Infração */}
              <div className="space-y-2">
                <label className="text-sm font-medium">Data da Infração *</label>
                <DateMaskInput value={infrationDate} onChange={setInfrationDate} />
              </div>

              {/* Operação */}
              <div className="space-y-2">
                <label className="text-sm font-medium">Operação</label>
                <OperacaoCombobox
                  value={operacao}
                  onChange={setOperacao}
                  operacoes={operacoes}
                />
              </div>

              {/* Placa */}
              <div className="space-y-2">
                <label className="text-sm font-medium">Placa</label>
                <input
                  type="text"
                  value={licensePlate}
                  onChange={(e) => setLicensePlate(e.target.value)}
                  placeholder="ABC-1234"
                  className="w-full px-3 py-2 border rounded-md"
                />
              </div>

              {/* Conteúdo da Advertência */}
              <div className="space-y-2">
                <label className="text-sm font-medium">Descrição da Advertência *</label>
                <textarea
                  value={warningContent}
                  onChange={(e) => setWarningContent(e.target.value)}
                  placeholder="Descreva o motivo da advertência..."
                  className="w-full px-3 py-2 border rounded-md min-h-24"
                />
              </div>

              {/* Campos de Suspensão */}
              {warningType === "suspensao" && (
                <>
                  <div className="space-y-2">
                    <label className="text-sm font-medium">Data de Início da Suspensão</label>
                    <DateMaskInput value={dataInicio} onChange={setDataInicio} />
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-medium">Data de Fim da Suspensão</label>
                    <DateMaskInput value={dataFim} onChange={setDataFim} />
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-medium">Data de Retorno</label>
                    <DateMaskInput value={dataRetorno} onChange={setDataRetorno} />
                  </div>
                </>
              )}

              {/* Botões */}
              <div className="flex gap-2 pt-4">
                <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
                  <DialogTrigger asChild>
                    <Button className="flex-1">Criar Advertência</Button>
                  </DialogTrigger>
                  <DialogContent>
                    <DialogHeader>
                      <DialogTitle>Confirmar Criação</DialogTitle>
                    </DialogHeader>
                    <div className="space-y-4">
                      <p>Tem certeza que deseja criar esta advertência?</p>
                      <div className="flex gap-2">
                        <Button
                          variant="outline"
                          onClick={() => setDialogOpen(false)}
                          className="flex-1"
                        >
                          Cancelar
                        </Button>
                        <Button
                          onClick={handleCreateWarning}
                          disabled={createWarningMutation.isPending}
                          className="flex-1"
                        >
                          {createWarningMutation.isPending ? "Criando..." : "Confirmar"}
                        </Button>
                      </div>
                    </div>
                  </DialogContent>
                </Dialog>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* TAB 2: IMPORTAÇÃO EM MASSA */}
        <TabsContent value="importacao" className="space-y-6">
          <BulkImportSection />
        </TabsContent>
      </Tabs>
    </div>
  );
}
