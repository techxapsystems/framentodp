import { useState, useEffect, useMemo } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { toast } from "sonner";
import { CheckCircle2, AlertCircle, Search, Filter } from "lucide-react";

export default function WarningSignOff() {
  const [conductors, setConductors] = useState<any[]>([]);
  const [selectedConductor, setSelectedConductor] = useState<string>("");
  const [searchText, setSearchText] = useState<string>("");
  const [selectedOperation, setSelectedOperation] = useState<string>("");
  const [startDate, setStartDate] = useState<string>("");
  const [endDate, setEndDate] = useState<string>("");
  const [unsignedWarnings, setUnsignedWarnings] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isSigningOff, setIsSigningOff] = useState(false);
  const [showConfirmDialog, setShowConfirmDialog] = useState(false);
  const [selectedWarning, setSelectedWarning] = useState<any>(null);

  // Carregar motoristas
  useEffect(() => {
    const loadConductors = async () => {
      try {
        const response = await fetch("/api/auth/conductors");
        const result = await response.json();
        const list = result.result?.data?.json || [];
        setConductors(list);
      } catch (error) {
        console.error("Erro ao carregar motoristas:", error);
        toast.error("Erro ao carregar motoristas");
      }
    };
    loadConductors();
  }, []);

  // Carregar advertências não assinadas quando motorista é selecionado
  useEffect(() => {
    if (!selectedConductor) {
      setUnsignedWarnings([]);
      return;
    }

    const loadUnsignedWarnings = async () => {
      try {
        setIsLoading(true);
        const response = await fetch(`/api/auth/unsigned-warnings/${encodeURIComponent(selectedConductor)}`);
        const result = await response.json();
        const warnings = result.result?.data?.json || [];
        setUnsignedWarnings(warnings);
      } catch (error) {
        console.error("Erro ao carregar advertências:", error);
        toast.error("Erro ao carregar advertências");
      } finally {
        setIsLoading(false);
      }
    };

    loadUnsignedWarnings();
  }, [selectedConductor]);

  // Filtrar motoristas por busca
  const filteredConductors = useMemo(() => {
    return conductors.filter((conductor) => {
      const matchesSearch = searchText === "" || 
        conductor.nome.toLowerCase().includes(searchText.toLowerCase()) ||
        conductor.cpf.includes(searchText);
      const matchesOperation = selectedOperation === "" || conductor.operacao === selectedOperation;
      return matchesSearch && matchesOperation;
    });
  }, [conductors, searchText, selectedOperation]);

  // Filtrar advertências por data
  const filteredWarnings = useMemo(() => {
    return unsignedWarnings.filter((warning) => {
      const warningDate = new Date(warning.criadoEm);
      const start = startDate ? new Date(startDate) : null;
      const end = endDate ? new Date(endDate) : null;

      if (start && warningDate < start) return false;
      if (end && warningDate > end) return false;
      return true;
    });
  }, [unsignedWarnings, startDate, endDate]);

  // Obter lista de operações únicas
  const operations = useMemo(() => {
    const ops = new Set(conductors.map((c) => c.operacao));
    return Array.from(ops).sort();
  }, [conductors]);

  const handleSignOff = async (warning: any) => {
    setSelectedWarning(warning);
    setShowConfirmDialog(true);
  };

  const confirmSignOff = async () => {
    if (!selectedWarning) return;

    try {
      setIsSigningOff(true);
      const response = await fetch("/api/auth/mark-warning-signed", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ warningId: selectedWarning.id }),
      });

      if (!response.ok) {
        throw new Error("Erro ao marcar advertência como assinada");
      }

      toast.success("Advertência marcada como assinada!");
      setShowConfirmDialog(false);
      setSelectedWarning(null);

      // Recarregar advertências
      if (selectedConductor) {
        const response = await fetch(`/api/auth/unsigned-warnings/${encodeURIComponent(selectedConductor)}`);
        const result = await response.json();
        const warnings = result.result?.data?.json || [];
        setUnsignedWarnings(warnings);
      }
    } catch (error) {
      console.error("Erro ao dar baixa:", error);
      toast.error("Erro ao dar baixa na advertência");
    } finally {
      setIsSigningOff(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold">Baixa de Advertências</h1>
        <p className="text-muted-foreground mt-2">
          Registre o retorno de advertências assinadas pelos motoristas
        </p>
      </div>

      {/* Filtros */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Filter className="w-5 h-5" />
            Filtros de Busca
          </CardTitle>
          <CardDescription>Busque motoristas por nome, CPF ou operação</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Busca por Nome/CPF */}
          <div className="relative">
            <Search className="absolute left-3 top-3 w-4 h-4 text-gray-400" />
            <Input
              placeholder="Buscar por nome ou CPF..."
              value={searchText}
              onChange={(e) => setSearchText(e.target.value)}
              className="pl-10"
            />
          </div>

          {/* Filtro por Operação */}
          <Select value={selectedOperation} onValueChange={setSelectedOperation}>
            <SelectTrigger>
              <SelectValue placeholder="Filtrar por operação..." />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="">Todas as operações</SelectItem>
              {operations.map((op) => (
                <SelectItem key={op} value={op}>
                  {op}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          {/* Seleção de Motorista */}
          <Select value={selectedConductor} onValueChange={setSelectedConductor}>
            <SelectTrigger className="w-full">
              <SelectValue placeholder="Selecione um motorista..." />
            </SelectTrigger>
            <SelectContent>
              {filteredConductors.map((conductor) => (
                <SelectItem key={conductor.id} value={conductor.nome}>
                  {conductor.nome} - {conductor.operacao}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </CardContent>
      </Card>

      {/* Filtros de Data */}
      {selectedConductor && (
        <Card>
          <CardHeader>
            <CardTitle>Filtrar por Data</CardTitle>
            <CardDescription>Selecione o período para filtrar as advertências</CardDescription>
          </CardHeader>
          <CardContent className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-sm font-medium">Data Inicial</label>
              <Input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
              />
            </div>
            <div>
              <label className="text-sm font-medium">Data Final</label>
              <Input
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
              />
            </div>
          </CardContent>
        </Card>
      )}

      {/* Advertências Não Assinadas */}
      {selectedConductor && (
        <Card>
          <CardHeader>
            <CardTitle>Advertências Pendentes</CardTitle>
            <CardDescription>
              {isLoading ? "Carregando..." : `${filteredWarnings.length} advertência(s) encontrada(s)`}
            </CardDescription>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="text-center py-8 text-gray-500">Carregando advertências...</div>
            ) : filteredWarnings.length === 0 ? (
              <div className="text-center py-8 text-gray-500">
                <CheckCircle2 className="w-12 h-12 mx-auto mb-2 text-green-600" />
                <p>Nenhuma advertência pendente encontrada</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Tipo</TableHead>
                      <TableHead>Categoria</TableHead>
                      <TableHead>Data de Criação</TableHead>
                      <TableHead>Motivo</TableHead>
                      <TableHead>Ações</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredWarnings.map((warning) => (
                      <TableRow key={warning.id}>
                        <TableCell>
                          <Badge variant="outline">{warning.tipo}</Badge>
                        </TableCell>
                        <TableCell>
                          <Badge variant="secondary">{warning.categoria || "Outro"}</Badge>
                        </TableCell>
                        <TableCell>
                          {new Date(warning.criadoEm).toLocaleDateString("pt-BR")}
                        </TableCell>
                        <TableCell className="max-w-xs truncate">{warning.motivo}</TableCell>
                        <TableCell>
                          <Button
                            size="sm"
                            onClick={() => handleSignOff(warning)}
                            className="bg-green-600 hover:bg-green-700"
                          >
                            <CheckCircle2 className="w-4 h-4 mr-2" />
                            Dar Baixa
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Dialog de Confirmação */}
      <Dialog open={showConfirmDialog} onOpenChange={setShowConfirmDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <AlertCircle className="w-5 h-5 text-yellow-600" />
              Confirmar Baixa de Advertência
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
              <p className="text-sm font-medium text-yellow-900">
                Tem certeza que deseja marcar esta advertência como assinada?
              </p>
              {selectedWarning && (
                <div className="mt-3 space-y-2 text-sm text-yellow-800">
                  <p><strong>Motorista:</strong> {selectedConductor}</p>
                  <p><strong>Tipo:</strong> {selectedWarning.tipo}</p>
                  <p><strong>Motivo:</strong> {selectedWarning.motivo}</p>
                  <p><strong>Data:</strong> {new Date(selectedWarning.criadoEm).toLocaleDateString("pt-BR")}</p>
                </div>
              )}
            </div>
            <div className="flex gap-3 justify-end">
              <Button
                variant="outline"
                onClick={() => setShowConfirmDialog(false)}
                disabled={isSigningOff}
              >
                Cancelar
              </Button>
              <Button
                onClick={confirmSignOff}
                disabled={isSigningOff}
                className="bg-green-600 hover:bg-green-700"
              >
                {isSigningOff ? "Processando..." : "Confirmar Baixa"}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
