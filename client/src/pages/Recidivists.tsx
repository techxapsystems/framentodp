"use client";
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
import { BookOpen, ExternalLink, Search, X } from "lucide-react";
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
  const [dataInicio, setDataInicio] = useState("");
  const [dataFim, setDataFim] = useState("");
  const [dataRetorno, setDataRetorno] = useState("");
  
  // Novo: Estados para busca controlada
  const [searchInput, setSearchInput] = useState("");
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [showResults, setShowResults] = useState(false);

  // Buscar operações disponíveis
  const { data: operacoes = [] } = trpc.dashboard.getAllOperations.useQuery();

  // Query para buscar todos os motoristas
  const { data: queryResult, error: queryError, isError } = trpc.dashboard.getIdleDriversForWarning.useQuery(
    undefined,
    {
      enabled: true,
      staleTime: 0,
    }
  );

  // Log errors for debugging
  useEffect(() => {
    if (isError && queryError) {
      console.error('Error loading motoristas:', queryError);
    }
  }, [isError, queryError]);

  // Extrair o array de motoristas do resultado da query
  const idleDriversData = Array.isArray(queryResult) ? queryResult : (queryResult as any)?.json || [];

  const selectedConductorData = idleDriversData && Array.isArray(idleDriversData)
    ? idleDriversData.find((d: any) => d.conductorName === selectedConductor)
    : null;

  const utils = trpc.useUtils();

  const createWarningMutation = trpc.dashboard.createWarning.useMutation({
    onSuccess: (data: any) => {
      if (!data?.success) {
        toast.error(data?.message || "Falha ao registrar advertência");
        return;
      }
      
      toast.success("Advertência registrada com sucesso");
      toast.info("Clique em 'Imprimir PDF' para gerar o documento");
      
      // Invalidar todas as queries para forçar refresh dos dashboards
      utils.dashboard.getIdleDriversForWarning.invalidate();
      utils.dashboard.getWarningsStatsByDriver.invalidate();
      utils.dashboard.getWarningsStatsByOperation.invalidate();
      utils.dashboard.getWarningsReport.invalidate();
      
      // Disparar evento para o dashboard se atualizar automaticamente
      window.dispatchEvent(new CustomEvent('dashboardRefresh'));
      // Limpar formulário
      setSelectedConductor("");
      setWarningType("advertencia");
      setInfrationDate("");
      setWarningContent("");
      setLicensePlate("");
      setOperacao("");
      setDataInicio("");
      setDataFim("");
      setDataRetorno("");
      setSearchInput("");
      setShowResults(false);
      setDialogOpen(false);
    },
    onError: (error: any) => {
      toast.error(error?.message || "Erro ao registrar advertência");
    },
  });

  // Função de busca controlada
  const handleSearch = () => {
    if (searchInput.trim().length === 0) {
      setSearchResults([]);
      setShowResults(false);
      return;
    }

    const searchTerm = searchInput.toLowerCase();
    const results = idleDriversData.filter((driver: any) => {
      const name = (driver.conductorName || "").toLowerCase();
      const cpf = (driver.cpf || "").toLowerCase();
      const matricula = (driver.matricula || "").toLowerCase();
      
      return name.includes(searchTerm) || cpf.includes(searchTerm) || matricula.includes(searchTerm);
    });

    setSearchResults(results);
    setShowResults(true);

    if (results.length === 0) {
      toast.info("Nenhum motorista encontrado com esse termo");
    }
  };

  // Função para selecionar motorista
  const handleSelectConductor = (conductor: any) => {
    setSelectedConductor(conductor.conductorName);
    setLicensePlate(conductor.placa || "");
    setOperacao(conductor.operacao || "");
    setSearchInput(conductor.conductorName);
    setShowResults(false);
  };

  // Limpar busca
  const handleClearSearch = () => {
    setSearchInput("");
    setSearchResults([]);
    setShowResults(false);
    setSelectedConductor("");
    setLicensePlate("");
    setOperacao("");
  };

  const handleConductorChange = (conductorName: string) => {
    setSelectedConductor(conductorName);
    const conductor = idleDriversData?.find((d: any) => d.conductorName === conductorName);
    if (conductor) {
      setLicensePlate(conductor.placa || "");
      setOperacao(conductor.operacao || "");
      setSearchInput(conductor.conductorName);
    }
  };

  const handleCreateWarning = () => {
    if (!selectedConductor || !operacao || !infrationDate || !warningContent) {
      toast.error("Preencha todos os campos obrigatórios");
      return;
    }

    if (warningType === "suspensao" && (!dataInicio || !dataFim || !dataRetorno)) {
      toast.error("Preencha todos os campos de suspensão");
      return;
    }

    // Converter data DD/MM ou DD/MM/YYYY para formato completo
    let formattedDate = infrationDate;
    if (infrationDate.length === 5) {
      // Se for DD/MM, adicionar ano atual
      const currentYear = new Date().getFullYear();
      formattedDate = `${infrationDate}/${currentYear}`;
    }

    createWarningMutation.mutate({
      conductorName: selectedConductor,
      nivelAdvertencia: 1,
      motivo: warningContent,
      observacao: "",
      tipo: warningType,
      categoria: "outro",
      dataInfracao: formattedDate, // Adicionar data da infração
      dataInicio: warningType === "suspensao" ? dataInicio : undefined,
      dataFim: warningType === "suspensao" ? dataFim : undefined,
      dataRetorno: warningType === "suspensao" ? dataRetorno : undefined,
    });
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <BookOpen className="h-5 w-5" />
            Cadastro de Advertências e Suspensões
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <p className="text-sm text-slate-600 mb-4">
              Use esta seção para registrar advertências e suspensões de motoristas. Os dados são preenchidos automaticamente quando você seleciona um motorista.
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
                  {/* Busca de Motorista - CORRIGIDA */}
                  <div>
                    <label className="text-sm font-medium text-slate-700 block mb-2">
                      Motorista: *
                    </label>
                    <div className="space-y-2">
                      <div className="flex gap-2">
                        <input
                          type="text"
                          placeholder="Digite nome, CPF ou matrícula..."
                          value={searchInput}
                          onChange={(e) => setSearchInput(e.target.value)}
                          onKeyPress={(e) => {
                            if (e.key === "Enter") {
                              handleSearch();
                            }
                          }}
                          className="flex-1 px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-yellow-500"
                        />
                        <Button
                          onClick={handleSearch}
                          variant="outline"
                          size="sm"
                          className="gap-2"
                        >
                          <Search className="h-4 w-4" />
                          Buscar
                        </Button>
                        {selectedConductor && (
                          <Button
                            onClick={handleClearSearch}
                            variant="ghost"
                            size="sm"
                          >
                            <X className="h-4 w-4" />
                          </Button>
                        )}
                      </div>

                      {/* Mostrar motorista selecionado */}
                      {selectedConductor && !showResults && (
                        <div className="p-3 bg-green-50 border border-green-200 rounded-lg">
                          <p className="text-sm font-medium text-green-900">
                            ✓ Motorista selecionado: <strong>{selectedConductor}</strong>
                          </p>
                          {selectedConductorData?.cpf && (
                            <p className="text-xs text-green-700 mt-1">
                              CPF: {selectedConductorData.cpf} | Matrícula: {selectedConductorData.matricula}
                            </p>
                          )}
                        </div>
                      )}

                      {/* Mostrar resultados da busca */}
                      {showResults && searchResults.length > 0 && (
                        <div className="border border-slate-300 rounded-lg max-h-64 overflow-y-auto">
                          {searchResults.map((driver: any, idx: number) => (
                            <button
                              key={idx}
                              onClick={() => handleSelectConductor(driver)}
                              className="w-full text-left px-3 py-2 hover:bg-yellow-50 border-b border-slate-200 last:border-b-0 transition"
                            >
                              <div className="font-medium text-slate-900">{driver.conductorName}</div>
                              <div className="text-xs text-slate-500">
                                {driver.cpf && `CPF: ${driver.cpf}`}
                                {driver.matricula && ` | Matrícula: ${driver.matricula}`}
                              </div>
                            </button>
                          ))}
                        </div>
                      )}

                      {/* Mensagem quando nenhum resultado */}
                      {showResults && searchResults.length === 0 && (
                        <div className="p-3 bg-red-50 border border-red-200 rounded-lg">
                          <p className="text-sm text-red-900">
                            Nenhum motorista encontrado com "{searchInput}"
                          </p>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Placa do Veículo */}
                  <div>
                    <label className="text-sm font-medium text-slate-700 block mb-2">
                      Placa do Veículo:
                    </label>
                    <input
                      type="text"
                      value={licensePlate}
                      onChange={(e) => setLicensePlate(e.target.value)}
                      readOnly={licensePlate !== "" && selectedConductorData?.placa}
                      placeholder={licensePlate ? "Preenchida automaticamente" : "Digite a placa do veículo"}
                      className={`w-full px-3 py-2 border border-slate-300 rounded-lg ${
                        licensePlate && selectedConductorData?.placa ? "bg-slate-50" : "bg-white"
                      }`}
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
                      Data da Infração: *
                    </label>
                    <DateMaskInput
                      value={infrationDate}
                      onChange={setInfrationDate}
                      placeholder="DD/MM/YYYY"
                    />
                  </div>

                  {/* Tipo de Advertência */}
                  <div>
                    <label className="text-sm font-medium text-slate-700 block mb-2">
                      Tipo: *
                    </label>
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

                  {/* Campos de Suspensão - Aparecem apenas quando tipo = suspensão */}
                  {warningType === "suspensao" && (
                    <>
                      <div>
                        <label className="text-sm font-medium text-slate-700 block mb-2">
                          Data de Início: *
                        </label>
                        <DateMaskInput
                          value={dataInicio}
                          onChange={setDataInicio}
                          placeholder="DD/MM/YYYY"
                        />
                      </div>

                      <div>
                        <label className="text-sm font-medium text-slate-700 block mb-2">
                          Data de Fim: *
                        </label>
                        <DateMaskInput
                          value={dataFim}
                          onChange={setDataFim}
                          placeholder="DD/MM/YYYY"
                        />
                      </div>

                      <div>
                        <label className="text-sm font-medium text-slate-700 block mb-2">
                          Data de Retorno: *
                        </label>
                        <DateMaskInput
                          value={dataRetorno}
                          onChange={setDataRetorno}
                          placeholder="DD/MM/YYYY"
                        />
                      </div>
                    </>
                  )}

                  {/* Texto da Advertência */}
                  <div>
                    <label className="text-sm font-medium text-slate-700 block mb-2">
                      Texto da Advertência/Suspensão: *
                    </label>
                    <textarea
                      value={warningContent}
                      onChange={(e) => setWarningContent(e.target.value)}
                      placeholder="Digite o motivo e descrição completa da advertência ou suspensão"
                      rows={5}
                      className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-yellow-500"
                    />
                  </div>

                  {/* Botões de Ação */}
                  <div className="flex gap-2 justify-end pt-4">
                    <Button
                      variant="outline"
                      onClick={() => setDialogOpen(false)}
                    >
                      Cancelar
                    </Button>
                    <Button
                      onClick={handleCreateWarning}
                      disabled={createWarningMutation.isPending}
                      className="bg-yellow-500 hover:bg-yellow-600 text-slate-900"
                    >
                      {createWarningMutation.isPending ? "Registrando..." : "Registrar Advertência"}
                    </Button>
                  </div>
                </div>
              </DialogContent>
            </Dialog>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
