import { useState, useEffect, useRef } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { AlertCircle, CheckCircle2, List, Download, Grid3x3 } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';

interface Warning {
  id: number;
  conductorName: string;
  categoria: string;
  criadoEm: string;
  assinada: boolean;
  motivo?: string;
  observacao?: string;
  nivelAdvertencia?: number;
}

export default function WarningSignOff() {
  const startDateRef = useRef<HTMLInputElement>(null);
  const endDateRef = useRef<HTMLInputElement>(null);

  const [pendingWarnings, setPendingWarnings] = useState<Warning[]>([]);
  const [signedWarnings, setSignedWarnings] = useState<Warning[]>([]);
  const [selectedWarning, setSelectedWarning] = useState<Warning | null>(null);
  const [showConfirmDialog, setShowConfirmDialog] = useState(false);
  const [showDetailDialog, setShowDetailDialog] = useState(false);
  const [loading, setLoading] = useState(false);
  const [viewMode, setViewMode] = useState<'grid' | 'table'>('grid');
  const [signOffNote, setSignOffNote] = useState('');

  // Inicializar datas e carregar dados
  useEffect(() => {
    if (startDateRef.current && endDateRef.current) {
      const startDate = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
      const endDate = new Date().toISOString().split('T')[0];
      startDateRef.current.value = startDate;
      endDateRef.current.value = endDate;
      loadWarnings();
    }
  }, []);

  const loadWarnings = async () => {
    try {
      setLoading(true);
      const startDate = startDateRef.current?.value;
      const endDate = endDateRef.current?.value;

      const params = new URLSearchParams();
      if (startDate) params.append('startDate', startDate);
      if (endDate) params.append('endDate', endDate);

      const response = await fetch(`/api/auth/warnings-stats?${params.toString()}`);
      const result = await response.json();
      const stats = result.result?.data?.json || {};
      const allWarnings = stats.warnings || [];

      // Separar assinadas e não assinadas
      const pending = allWarnings.filter((w: any) => !w.advertenciaAplicada);
      const signed = allWarnings.filter((w: any) => w.advertenciaAplicada);

      setPendingWarnings(pending);
      setSignedWarnings(signed);
    } catch (error) {
      console.error('Erro ao carregar advertências:', error);
      toast.error('Erro ao carregar advertências');
    } finally {
      setLoading(false);
    }
  };

  const handleSignOff = async () => {
    if (!selectedWarning) return;

    setLoading(true);
    try {
      const response = await fetch('/api/auth/sign-off-warning', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          warningId: selectedWarning.id,
          conductorId: selectedWarning.conductorName,
          signOffNote,
        }),
      });

      if (response.ok) {
        toast.success('Advertência marcada como assinada!');
        setShowConfirmDialog(false);
        setSignOffNote('');
        setSelectedWarning(null);
        loadWarnings();
      } else {
        toast.error('Erro ao marcar advertência como assinada');
      }
    } catch (error) {
      console.error('Erro:', error);
      toast.error('Erro ao processar solicitação');
    } finally {
      setLoading(false);
    }
  };

  const getWarningTypeLabel = (categoria: string) => {
    const labels: Record<string, string> = {
      pouco_rodado: 'Pouco Rodado',
      horas_extras: 'Horas Extras',
      outro: 'Outro',
    };
    return labels[categoria] || categoria;
  };

  const getWarningLevelLabel = (nivel: number) => {
    const labels: Record<number, string> = {
      1: 'Aviso 1',
      2: 'Aviso 2',
      3: 'Aviso 3 (Crítico)',
    };
    return labels[nivel] || `Aviso ${nivel}`;
  };

  return (
    <div className="p-8 space-y-8">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold">Baixa de Advertências</h1>
        <p className="text-muted-foreground mt-2">
          Registre o recebimento de advertências assinadas pelos motoristas
        </p>
      </div>

      {/* Filtros */}
      <Card>
        <CardHeader>
          <CardTitle>Filtros</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="space-y-2">
              <Label htmlFor="start-date">Data Inicial</Label>
              <Input
                id="start-date"
                type="date"
                ref={startDateRef}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="end-date">Data Final</Label>
              <Input
                id="end-date"
                type="date"
                ref={endDateRef}
              />
            </div>
            <div className="flex items-end gap-2">
              <Button onClick={loadWarnings} className="w-full">
                Aplicar Filtros
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Advertências Pendentes */}
      {loading ? (
        <div className="text-center py-8">Carregando...</div>
      ) : (
        <>
          {pendingWarnings.length > 0 && (
            <Card>
              <CardHeader>
                <div className="flex justify-between items-center">
                  <CardTitle className="flex items-center gap-2">
                    <AlertCircle className="w-5 h-5 text-red-600" />
                    Advertências Pendentes ({pendingWarnings.length})
                  </CardTitle>
                  <div className="flex gap-2">
                    <Button
                      variant={viewMode === 'grid' ? 'default' : 'outline'}
                      size="sm"
                      onClick={() => setViewMode('grid')}
                      className="gap-2"
                    >
                      <Grid3x3 className="w-4 h-4" />
                      Grade
                    </Button>
                    <Button
                      variant={viewMode === 'table' ? 'default' : 'outline'}
                      size="sm"
                      onClick={() => setViewMode('table')}
                      className="gap-2"
                    >
                      <List className="w-4 h-4" />
                      Tabela
                    </Button>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                {viewMode === 'grid' ? (
                  <div className="space-y-2">
                    {pendingWarnings.map((warning) => (
                      <div
                        key={warning.id}
                        className="border rounded-lg p-3 hover:shadow-md transition-shadow cursor-pointer flex items-center justify-between gap-4"
                        onClick={() => {
                          setSelectedWarning(warning);
                          setShowDetailDialog(true);
                        }}
                      >
                        <div className="flex-1 grid grid-cols-4 gap-4 items-center text-sm">
                          <div className="font-semibold">{warning.conductorName}</div>
                          <div>{new Date(warning.criadoEm).toLocaleDateString('pt-BR')}</div>
                          <div>{getWarningTypeLabel(warning.categoria)}</div>
                          <div className="flex items-center gap-2">
                            {warning.nivelAdvertencia && (
                              <Badge variant="outline" className="text-xs">
                                {getWarningLevelLabel(warning.nivelAdvertencia)}
                              </Badge>
                            )}
                            <Badge variant="destructive" className="text-xs">Pendente</Badge>
                          </div>
                        </div>
                        <Button
                          size="sm"
                          className="bg-green-600 hover:bg-green-700 whitespace-nowrap"
                          onClick={(e) => {
                            e.stopPropagation();
                            setSelectedWarning(warning);
                            setShowConfirmDialog(true);
                          }}
                        >
                          Dar Baixa
                        </Button>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Motorista</TableHead>
                          <TableHead>Data de Cadastro</TableHead>
                          <TableHead>Tipo</TableHead>
                          <TableHead>Nível</TableHead>
                          <TableHead>Status</TableHead>
                          <TableHead>Ação</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {pendingWarnings.map((warning) => (
                          <TableRow key={warning.id}>
                            <TableCell className="font-medium">{warning.conductorName}</TableCell>
                            <TableCell>
                              {new Date(warning.criadoEm).toLocaleDateString('pt-BR')}
                            </TableCell>
                            <TableCell>{getWarningTypeLabel(warning.categoria)}</TableCell>
                            <TableCell>
                              {warning.nivelAdvertencia
                                ? getWarningLevelLabel(warning.nivelAdvertencia)
                                : '-'}
                            </TableCell>
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
                )}
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
                  <Table className="text-sm">
                    <TableHeader>
                      <TableRow className="bg-gray-100">
                        <TableHead className="py-2 px-2">Motorista</TableHead>
                        <TableHead className="py-2 px-2">Data</TableHead>
                        <TableHead className="py-2 px-2">Tipo</TableHead>
                        <TableHead className="py-2 px-2">Nível</TableHead>
                        <TableHead className="py-2 px-2">Status</TableHead>
                        <TableHead className="py-2 px-2">Ação</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {signedWarnings.map((warning) => (
                        <TableRow key={warning.id} className="hover:bg-gray-50">
                          <TableCell className="font-medium py-2 px-2 whitespace-nowrap">{warning.conductorName}</TableCell>
                          <TableCell className="py-2 px-2 whitespace-nowrap">
                            {new Date(warning.criadoEm).toLocaleDateString('pt-BR')}
                          </TableCell>
                          <TableCell className="py-2 px-2 whitespace-nowrap">{getWarningTypeLabel(warning.categoria)}</TableCell>
                          <TableCell className="py-2 px-2 whitespace-nowrap">
                            {warning.nivelAdvertencia
                              ? getWarningLevelLabel(warning.nivelAdvertencia)
                              : '-'}
                          </TableCell>
                          <TableCell className="py-2 px-2 whitespace-nowrap">
                            <Badge variant="default" className="text-xs">Assinada</Badge>
                          </TableCell>
                          <TableCell className="py-2 px-2 whitespace-nowrap">
                            <Button
                              size="xs"
                              variant="outline"
                              className="text-xs h-7"
                              onClick={async () => {
                                try {
                                  const response = await fetch('/api/auth/download-warning-pdf', {
                                    method: 'POST',
                                    headers: { 'Content-Type': 'application/json' },
                                    body: JSON.stringify({
                                      warningId: warning.id,
                                      conductorName: warning.conductorName,
                                      warningDate: new Date(warning.criadoEm).toLocaleDateString('pt-BR'),
                                      warningType: warning.categoria,
                                      warningLevel: warning.nivelAdvertencia,
                                    }),
                                  });
                                  if (response.ok) {
                                    const blob = await response.blob();
                                    const url = window.URL.createObjectURL(blob);
                                    const a = document.createElement('a');
                                    a.href = url;
                                    a.download = `Advertencia_${warning.conductorName.replace(/\s+/g, '_')}.pdf`;
                                    document.body.appendChild(a);
                                    a.click();
                                    window.URL.revokeObjectURL(url);
                                    document.body.removeChild(a);
                                    toast.success('PDF baixado com sucesso!');
                                  } else {
                                    toast.error('Erro ao gerar PDF');
                                  }
                                } catch (error) {
                                  console.error('Erro:', error);
                                  toast.error('Erro ao baixar PDF');
                                }
                              }}
                            >
                              Baixar PDF
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

          {pendingWarnings.length === 0 && signedWarnings.length === 0 && (
            <Card>
              <CardContent className="py-8">
                <div className="text-center text-gray-500">
                  Nenhuma advertência encontrada no período selecionado
                </div>
              </CardContent>
            </Card>
          )}
        </>
      )}

      {/* Dialog de Detalhes */}
      <Dialog open={showDetailDialog} onOpenChange={setShowDetailDialog}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Detalhes da Advertência</DialogTitle>
          </DialogHeader>
          {selectedWarning && (
            <div className="space-y-4">
              <div>
                <div className="text-sm text-gray-600">Motorista</div>
                <div className="font-semibold">{selectedWarning.conductorName}</div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <div className="text-sm text-gray-600">Data de Cadastro</div>
                  <div className="font-semibold">
                    {new Date(selectedWarning.criadoEm).toLocaleDateString('pt-BR')}
                  </div>
                </div>
                <div>
                  <div className="text-sm text-gray-600">Tipo</div>
                  <div className="font-semibold">{getWarningTypeLabel(selectedWarning.categoria)}</div>
                </div>
              </div>
              {selectedWarning.nivelAdvertencia && (
                <div>
                  <div className="text-sm text-gray-600">Nível</div>
                  <div className="font-semibold">
                    {getWarningLevelLabel(selectedWarning.nivelAdvertencia)}
                  </div>
                </div>
              )}
              {selectedWarning.motivo && (
                <div>
                  <div className="text-sm text-gray-600">Motivo</div>
                  <div className="font-semibold">{selectedWarning.motivo}</div>
                </div>
              )}
              {selectedWarning.observacao && (
                <div>
                  <div className="text-sm text-gray-600">Observação</div>
                  <div className="font-semibold">{selectedWarning.observacao}</div>
                </div>
              )}
            </div>
          )}
          <DialogFooter>
            <Button
              variant="outline"
              onClick={async () => {
                if (!selectedWarning) return;
                try {
                  const response = await fetch('/api/auth/download-warning-pdf', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                      warningId: selectedWarning.id,
                      conductorName: selectedWarning.conductorName,
                      warningDate: new Date(selectedWarning.criadoEm).toLocaleDateString('pt-BR'),
                      warningType: selectedWarning.categoria,
                      warningLevel: selectedWarning.nivelAdvertencia,
                    }),
                  });
                  if (response.ok) {
                    const blob = await response.blob();
                    const url = window.URL.createObjectURL(blob);
                    const a = document.createElement('a');
                    a.href = url;
                    a.download = `Advertencia_${selectedWarning.conductorName.replace(/\s+/g, '_')}.pdf`;
                    document.body.appendChild(a);
                    a.click();
                    window.URL.revokeObjectURL(url);
                    document.body.removeChild(a);
                    toast.success('PDF baixado com sucesso!');
                  } else {
                    toast.error('Erro ao gerar PDF');
                  }
                } catch (error) {
                  console.error('Erro:', error);
                  toast.error('Erro ao baixar PDF');
                }
              }}
            >
              Baixar PDF
            </Button>
            <Button variant="outline" onClick={() => setShowDetailDialog(false)}>
              Fechar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Dialog de Confirmação */}
      <AlertDialog open={showConfirmDialog} onOpenChange={setShowConfirmDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirmar Baixa de Advertência</AlertDialogTitle>
            <AlertDialogDescription>
              Você tem certeza que deseja marcar a advertência de {selectedWarning?.conductorName} como assinada?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <div className="space-y-4">
            <div>
              <Label htmlFor="sign-off-note">Observação (opcional)</Label>
              <Textarea
                id="sign-off-note"
                placeholder="Adicione uma observação sobre a assinatura..."
                value={signOffNote}
                onChange={(e) => setSignOffNote(e.target.value)}
                className="mt-2"
              />
            </div>
          </div>
          <AlertDialogAction
            onClick={handleSignOff}
            disabled={loading}
            className="bg-green-600 hover:bg-green-700"
          >
            {loading ? 'Processando...' : 'Confirmar'}
          </AlertDialogAction>
          <AlertDialogCancel>Cancelar</AlertDialogCancel>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
