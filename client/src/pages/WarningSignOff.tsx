import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { AlertCircle, CheckCircle2, Search } from 'lucide-react';

interface Conductor {
  id: number;
  nome: string;
  cpf: string;
  operacao: string;
  cargo: string;
  placa: string;
}

interface Warning {
  id: number;
  conductorName: string;
  categoria: string;
  criadoEm: string;
  assinada: boolean;
}

export default function WarningSignOff() {
  const [conductors, setConductors] = useState<Conductor[]>([]);
  const [filteredConductors, setFilteredConductors] = useState<Conductor[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedConductor, setSelectedConductor] = useState<Conductor | null>(null);
  const [warnings, setWarnings] = useState<Warning[]>([]);
  const [selectedWarning, setSelectedWarning] = useState<Warning | null>(null);
  const [showConfirmDialog, setShowConfirmDialog] = useState(false);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const fetchConductors = async () => {
      try {
        const response = await fetch('/api/auth/list-conductors');
        const result = await response.json();
        const data = result.result?.data?.json || [];
        setConductors(data);
        setFilteredConductors(data);
      } catch (error) {
        console.error('Erro:', error);
        toast.error('Erro ao carregar motoristas');
      }
    };
    fetchConductors();
  }, []);

  useEffect(() => {
    if (searchTerm.trim() === '') {
      setFilteredConductors(conductors);
    } else {
      const term = searchTerm.toLowerCase();
      setFilteredConductors(
        conductors.filter(c =>
          c.nome.toLowerCase().includes(term) ||
          c.cpf.includes(term) ||
          c.operacao.toLowerCase().includes(term)
        )
      );
    }
  }, [searchTerm, conductors]);

  const handleSelectConductor = async (conductor: Conductor) => {
    setSelectedConductor(conductor);
    setSearchTerm('');
    setFilteredConductors(conductors);

    try {
      const response = await fetch(`/api/auth/conductor-warnings/${conductor.id}`);
      const result = await response.json();
      setWarnings(result.result?.data?.json || []);
    } catch (error) {
      console.error('Erro:', error);
      toast.error('Erro ao carregar advertências');
      setWarnings([]);
    }
  };

  const handleSignOff = async () => {
    if (!selectedWarning || !selectedConductor) return;

    setLoading(true);
    try {
      const response = await fetch('/api/auth/sign-off-warning', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          warningId: selectedWarning.id,
          conductorId: selectedConductor.id,
        }),
      });

      const result = await response.json();
      if (result.success) {
        toast.success('Advertência marcada como assinada!');
        setShowConfirmDialog(false);
        setSelectedWarning(null);
        // Recarregar advertências
        const updatedResponse = await fetch(`/api/auth/conductor-warnings/${selectedConductor.id}`);
        const updatedResult = await updatedResponse.json();
        setWarnings(updatedResult.result?.data?.json || []);
      } else {
        toast.error(result.error || 'Erro ao dar baixa');
      }
    } catch (error) {
      console.error('Erro:', error);
      toast.error('Erro ao dar baixa');
    } finally {
      setLoading(false);
    }
  };

  const pendingWarnings = warnings.filter(w => !w.assinada);
  const signedWarnings = warnings.filter(w => w.assinada);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold">Baixa de Advertências</h1>
        <p className="text-muted-foreground mt-2">
          Registre o recebimento de advertências assinadas pelos motoristas
        </p>
      </div>

      {/* Busca de Motorista */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Search className="w-5 h-5" />
            Buscar Motorista
          </CardTitle>
          <CardDescription>Pesquise por nome, CPF ou operação</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <Label htmlFor="search">Nome, CPF ou Operação</Label>
            <Input
              id="search"
              placeholder="Digite para buscar..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="mt-2"
            />
          </div>

          {/* Lista de Motoristas Filtrados */}
          {searchTerm && filteredConductors.length > 0 && (
            <div className="border rounded-lg max-h-96 overflow-y-auto">
              {filteredConductors.slice(0, 20).map((conductor) => (
                <button
                  key={conductor.id}
                  onClick={() => handleSelectConductor(conductor)}
                  className="w-full text-left px-4 py-3 hover:bg-gray-100 border-b last:border-b-0 transition-colors"
                >
                  <div className="font-semibold">{conductor.nome}</div>
                  <div className="text-sm text-gray-600">
                    CPF: {conductor.cpf} • {conductor.operacao}
                  </div>
                </button>
              ))}
              {filteredConductors.length > 20 && (
                <div className="px-4 py-3 text-sm text-gray-600 bg-gray-50">
                  Mostrando 20 de {filteredConductors.length} resultados
                </div>
              )}
            </div>
          )}

          {searchTerm && filteredConductors.length === 0 && (
            <div className="text-center py-8 text-gray-500">
              Nenhum motorista encontrado
            </div>
          )}

          {/* Motorista Selecionado */}
          {selectedConductor && (
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <div className="flex justify-between items-start">
                <div>
                  <div className="font-semibold text-lg">{selectedConductor.nome}</div>
                  <div className="text-sm text-gray-600 mt-1">
                    CPF: {selectedConductor.cpf}
                  </div>
                  <div className="text-sm text-gray-600">
                    Operação: {selectedConductor.operacao}
                  </div>
                  <div className="text-sm text-gray-600">
                    Placa: {selectedConductor.placa}
                  </div>
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    setSelectedConductor(null);
                    setWarnings([]);
                    setSearchTerm('');
                  }}
                >
                  Alterar
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Advertências */}
      {selectedConductor && (
        <div className="space-y-4">
          {/* Advertências Pendentes */}
          {pendingWarnings.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <AlertCircle className="w-5 h-5 text-red-600" />
                  Advertências Pendentes ({pendingWarnings.length})
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Data</TableHead>
                        <TableHead>Tipo</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead>Ação</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {pendingWarnings.map((warning) => (
                        <TableRow key={warning.id}>
                          <TableCell>
                            {new Date(warning.criadoEm).toLocaleDateString('pt-BR')}
                          </TableCell>
                          <TableCell>{warning.categoria}</TableCell>
                          <TableCell>
                            <Badge variant="destructive">Pendente</Badge>
                          </TableCell>
                          <TableCell>
                            <Button
                              size="sm"
                              className="bg-green-600 hover:bg-green-700"
                              onClick={() => {
                                setSelectedWarning(warning);
                                setShowConfirmDialog(true);
                              }}
                            >
                              Dar Baixa
                            </Button>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Advertências Assinadas */}
          {signedWarnings.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <CheckCircle2 className="w-5 h-5 text-green-600" />
                  Advertências Assinadas ({signedWarnings.length})
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Data</TableHead>
                        <TableHead>Tipo</TableHead>
                        <TableHead>Status</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {signedWarnings.map((warning) => (
                        <TableRow key={warning.id}>
                          <TableCell>
                            {new Date(warning.criadoEm).toLocaleDateString('pt-BR')}
                          </TableCell>
                          <TableCell>{warning.categoria}</TableCell>
                          <TableCell>
                            <Badge variant="default">Assinada</Badge>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              </CardContent>
            </Card>
          )}

          {warnings.length === 0 && (
            <Card>
              <CardContent className="py-8">
                <div className="text-center text-gray-500">
                  Nenhuma advertência encontrada para este motorista
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      )}

      {/* Dialog de Confirmação */}
      <AlertDialog open={showConfirmDialog} onOpenChange={setShowConfirmDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirmar Baixa de Advertência</AlertDialogTitle>
            <AlertDialogDescription>
              Você está marcando esta advertência como assinada pelo motorista
            </AlertDialogDescription>
          </AlertDialogHeader>
          <div className="space-y-3 my-4">
            <div>
              <p className="text-sm text-gray-600">Motorista:</p>
              <p className="font-semibold">{selectedConductor?.nome}</p>
            </div>
            <div>
              <p className="text-sm text-gray-600">Data:</p>
              <p className="font-semibold">
                {selectedWarning && new Date(selectedWarning.criadoEm).toLocaleDateString('pt-BR')}
              </p>
            </div>
            <div>
              <p className="text-sm text-gray-600">Tipo:</p>
              <p className="font-semibold">{selectedWarning?.categoria}</p>
            </div>
          </div>
          <div className="flex justify-end gap-2">
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction 
              onClick={handleSignOff} 
              disabled={loading} 
              className="bg-green-600 hover:bg-green-700"
            >
              {loading ? 'Processando...' : 'Confirmar Baixa'}
            </AlertDialogAction>
          </div>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
