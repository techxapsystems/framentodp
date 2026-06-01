'use client';
import React, { useState, useRef, useEffect } from 'react';
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
import { trpc } from '@/lib/trpc';
import { generateWarningPDF } from '@/components/WarningPDFGenerator';

interface Warning {
  id: number;
  conductorName: string;
  tipo: 'advertencia' | 'suspensao';
  categoria?: string;
  criadoEm: string;
  assinada: boolean;
  motivo?: string;
  observacao?: string;
  nivelAdvertencia?: number;
  placa?: string;
  operacao?: string;
  cpf?: string;
  ctps?: string;
  dataInicio?: string;
  dataFim?: string;
  dataRetorno?: string;
}

export default function WarningSignOff() {
  const startDateRef = useRef<HTMLInputElement>(null);
  const endDateRef = useRef<HTMLInputElement>(null);

  const [pendingAdvertencias, setPendingAdvertencias] = useState<Warning[]>([]);
  const [pendingSuspensoes, setPendingSuspensoes] = useState<Warning[]>([]);
  const [signedAdvertencias, setSignedAdvertencias] = useState<Warning[]>([]);
  const [signedSuspensoes, setSignedSuspensoes] = useState<Warning[]>([]);
  const [selectedWarning, setSelectedWarning] = useState<Warning | null>(null);
  const [showConfirmDialog, setShowConfirmDialog] = useState(false);
  const [showDetailDialog, setShowDetailDialog] = useState(false);
  const [loading, setLoading] = useState(false);
  const [viewMode, setViewMode] = useState<'grid' | 'table'>('grid');
  const [signOffNote, setSignOffNote] = useState('');
  const [confirmAction, setConfirmAction] = useState<'signoff' | 'delete'>('signoff');
  const [deleteReason, setDeleteReason] = useState('');
  const [filterName, setFilterName] = useState('');
  const [filterOperation, setFilterOperation] = useState('');
  const [operations, setOperations] = useState<string[]>([]);
  const [filteredWarnings, setFilteredWarnings] = useState<Warning[]>([]);
  
  const deleteWarningMutation = trpc.dashboard.deleteWarning.useMutation();

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
      let allWarnings = stats.warnings || [];

      // Extrair operacoes unicas
      const uniqueOps = Array.from(new Set(allWarnings.map((w: any) => w.operacao).filter(Boolean)));
      setOperations(uniqueOps as string[]);

      // Aplicar filtros de NOME e OPERACAO
      if (filterName.trim()) {
        allWarnings = allWarnings.filter((w: any) => 
          w.conductorName.toLowerCase().includes(filterName.toLowerCase())
        );
      }
      if (filterOperation) {
        allWarnings = allWarnings.filter((w: any) => w.operacao === filterOperation);
      }

      // Separar por tipo e status
      const pendingAdv = allWarnings.filter((w: any) => !w.advertenciaAplicada && w.tipo === 'advertencia');
      const pendingSusp = allWarnings.filter((w: any) => !w.advertenciaAplicada && w.tipo === 'suspensao');
      const signedAdv = allWarnings.filter((w: any) => w.advertenciaAplicada && w.tipo === 'advertencia');
      const signedSusp = allWarnings.filter((w: any) => w.advertenciaAplicada && w.tipo === 'suspensao');

      setPendingAdvertencias(pendingAdv);
      setPendingSuspensoes(pendingSusp);
      setSignedAdvertencias(signedAdv);
      setSignedSuspensoes(signedSusp);
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

  const handleDeleteWarning = async () => {
    if (!selectedWarning) return;
    
    if (!deleteReason.trim()) {
      toast.error('Por favor, informe o motivo da exclusão');
      return;
    }

    setLoading(true);
    try {
      const response = await fetch(`/api/auth/warnings/${selectedWarning.id}`, {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ motivo: deleteReason }),
      });

      if (response.ok) {
        toast.success('Advertência deletada com sucesso!');
        setShowConfirmDialog(false);
        setSelectedWarning(null);
        setDeleteReason('');
        loadWarnings();
      } else {
        toast.error('Erro ao deletar advertência');
      }
    } catch (error) {
      console.error('Erro:', error);
      toast.error('Erro ao processar solicitação');
    } finally {
      setLoading(false);
    }
  };

  const handleUpdateWarning = async () => {
    if (!selectedWarning) return;

    setLoading(true);
    try {
      const response = await fetch(`/api/auth/warnings/${selectedWarning.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          motivo: selectedWarning.motivo,
          observacao: signOffNote,
        }),
      });

      if (response.ok) {
        toast.success('Advertência atualizada com sucesso!');
        setShowDetailDialog(false);
        setSignOffNote('');
        setSelectedWarning(null);
        loadWarnings();
      } else {
        toast.error('Erro ao atualizar advertência');
      }
    } catch (error) {
      console.error('Erro:', error);
      toast.error('Erro ao processar solicitação');
    } finally {
      setLoading(false);
    }
  };

  const getWarningTypeLabel = (tipo: 'advertencia' | 'suspensao') => {
    return tipo === 'advertencia' ? 'Advertência' : 'Suspensão';
  };

  const getWarningLevelLabel = (nivel: number) => {
    const labels: Record<number, string> = {
      1: 'Aviso 1',
      2: 'Aviso 2',
      3: 'Aviso 3 (Crítico)',
    };
    return labels[nivel] || `Aviso ${nivel}`;
  };

  const renderPendingWarningsGrid = () => (
    <div className="space-y-4">
      {/* Advertências Pendentes */}
      {pendingAdvertencias.length > 0 && (
        <div>
          <h3 className="font-semibold text-sm mb-2 text-blue-600">Advertências Pendentes ({pendingAdvertencias.length})</h3>
          <div className="space-y-2">
            {pendingAdvertencias.map((warning) => (
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
                  <div>
                    <div>{new Date(warning.criadoEm).toLocaleDateString('pt-BR')}</div>
                    <div className="text-xs text-muted-foreground">
                      {new Date(warning.criadoEm).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge variant="default">
                      {getWarningTypeLabel(warning.tipo)}
                    </Badge>
                  </div>
                  <div className="flex items-center gap-2">
                    {warning.nivelAdvertencia && (
                      <Badge variant="outline" className="text-xs">
                        {getWarningLevelLabel(warning.nivelAdvertencia)}
                      </Badge>
                    )}
                    <Badge variant="destructive" className="text-xs">Pendente</Badge>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Button
                    size="sm"
                    variant="outline"
                    className="whitespace-nowrap"
                    onClick={(e) => {
                      e.stopPropagation();
                      setSelectedWarning(warning);
                      setShowDetailDialog(true);
                    }}
                  >
                    Editar
                  </Button>
                  <Button
                    size="sm"
                    variant="destructive"
                    className="whitespace-nowrap"
                    onClick={(e) => {
                      e.stopPropagation();
                      setSelectedWarning(warning);
                      setConfirmAction('delete');
                      setShowConfirmDialog(true);
                    }}
                  >
                    Excluir
                  </Button>
                  <Button
                    size="sm"
                    className="bg-green-600 hover:bg-green-700 whitespace-nowrap"
                    onClick={(e) => {
                      e.stopPropagation();
                      setSelectedWarning(warning);
                      setConfirmAction('signoff');
                      setShowConfirmDialog(true);
                    }}
                  >
                    Dar Baixa
                  </Button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Suspensões Pendentes */}
      {pendingSuspensoes.length > 0 && (
        <div>
          <h3 className="font-semibold text-sm mb-2 text-red-600">Suspensões Pendentes ({pendingSuspensoes.length})</h3>
          <div className="space-y-2">
            {pendingSuspensoes.map((warning) => (
              <div
                key={warning.id}
                className="border rounded-lg p-3 hover:shadow-md transition-shadow cursor-pointer flex items-center justify-between gap-4 border-red-300 bg-red-50"
                onClick={() => {
                  setSelectedWarning(warning);
                  setShowDetailDialog(true);
                }}
              >
                <div className="flex-1 grid grid-cols-4 gap-4 items-center text-sm">
                  <div className="font-semibold">{warning.conductorName}</div>
                  <div>
                    <div>{new Date(warning.criadoEm).toLocaleDateString('pt-BR')}</div>
                    <div className="text-xs text-muted-foreground">
                      {new Date(warning.criadoEm).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge variant="destructive">
                      {getWarningTypeLabel(warning.tipo)}
                    </Badge>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge variant="destructive" className="text-xs">Pendente</Badge>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Button
                    size="sm"
                    variant="outline"
                    className="whitespace-nowrap"
                    onClick={(e) => {
                      e.stopPropagation();
                      setSelectedWarning(warning);
                      setShowDetailDialog(true);
                    }}
                  >
                    Editar
                  </Button>
                  <Button
                    size="sm"
                    variant="destructive"
                    className="whitespace-nowrap"
                    onClick={(e) => {
                      e.stopPropagation();
                      setSelectedWarning(warning);
                      setConfirmAction('delete');
                      setShowConfirmDialog(true);
                    }}
                  >
                    Excluir
                  </Button>
                  <Button
                    size="sm"
                    className="bg-green-600 hover:bg-green-700 whitespace-nowrap"
                    onClick={(e) => {
                      e.stopPropagation();
                      setSelectedWarning(warning);
                      setConfirmAction('signoff');
                      setShowConfirmDialog(true);
                    }}
                  >
                    Dar Baixa
                  </Button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );

  const renderPendingWarningsTable = () => (
    <div className="overflow-x-auto space-y-6">
      {/* Tabela de Advertências Pendentes */}
      {pendingAdvertencias.length > 0 && (
        <div>
          <h3 className="font-semibold text-sm mb-2 text-blue-600">Advertências Pendentes ({pendingAdvertencias.length})</h3>
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
              {pendingAdvertencias.map((warning) => (
                <TableRow key={warning.id}>
                  <TableCell className="font-medium">{warning.conductorName}</TableCell>
                  <TableCell>
                    <div className="text-sm">
                      <div>{new Date(warning.criadoEm).toLocaleDateString('pt-BR')}</div>
                      <div className="text-xs text-muted-foreground">
                        {new Date(warning.criadoEm).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
                      </div>
                    </div>
                  </TableCell>
                  <TableCell>
                    <Badge variant="default">
                      {getWarningTypeLabel(warning.tipo)}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    {warning.nivelAdvertencia
                      ? getWarningLevelLabel(warning.nivelAdvertencia)
                      : '-'}
                  </TableCell>
                  <TableCell>
                    <Badge variant="destructive">Pendente</Badge>
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => {
                          setSelectedWarning(warning);
                          setShowDetailDialog(true);
                        }}
                      >
                        Editar
                      </Button>
                      <Button
                        size="sm"
                        variant="destructive"
                        onClick={() => {
                          setSelectedWarning(warning);
                          setConfirmAction('delete');
                          setShowConfirmDialog(true);
                        }}
                      >
                        Excluir
                      </Button>
                      <Button
                        size="sm"
                        className="bg-green-600 hover:bg-green-700"
                        onClick={() => {
                          setSelectedWarning(warning);
                          setConfirmAction('signoff');
                          setShowConfirmDialog(true);
                        }}
                      >
                        Dar Baixa
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}

      {/* Tabela de Suspensões Pendentes */}
      {pendingSuspensoes.length > 0 && (
        <div>
          <h3 className="font-semibold text-sm mb-2 text-red-600">Suspensões Pendentes ({pendingSuspensoes.length})</h3>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Motorista</TableHead>
                <TableHead>Data de Cadastro</TableHead>
                <TableHead>Tipo</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Ação</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {pendingSuspensoes.map((warning) => (
                <TableRow key={warning.id} className="bg-red-50">
                  <TableCell className="font-medium">{warning.conductorName}</TableCell>
                  <TableCell>
                    <div className="text-sm">
                      <div>{new Date(warning.criadoEm).toLocaleDateString('pt-BR')}</div>
                      <div className="text-xs text-muted-foreground">
                        {new Date(warning.criadoEm).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
                      </div>
                    </div>
                  </TableCell>
                  <TableCell>
                    <Badge variant="destructive">
                      {getWarningTypeLabel(warning.tipo)}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <Badge variant="destructive">Pendente</Badge>
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => {
                          setSelectedWarning(warning);
                          setShowDetailDialog(true);
                        }}
                      >
                        Editar
                      </Button>
                      <Button
                        size="sm"
                        variant="destructive"
                        onClick={() => {
                          setSelectedWarning(warning);
                          setConfirmAction('delete');
                          setShowConfirmDialog(true);
                        }}
                      >
                        Excluir
                      </Button>
                      <Button
                        size="sm"
                        className="bg-green-600 hover:bg-green-700"
                        onClick={() => {
                          setSelectedWarning(warning);
                          setConfirmAction('signoff');
                          setShowConfirmDialog(true);
                        }}
                      >
                        Dar Baixa
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}
    </div>
  );

  const renderSignedWarningsTable = () => (
    <div className="overflow-x-auto space-y-6">
      {/* Tabela de Advertências Assinadas */}
      {signedAdvertencias.length > 0 && (
        <div>
          <h3 className="font-semibold text-sm mb-2 text-blue-600">Advertências Assinadas ({signedAdvertencias.length})</h3>
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
              {signedAdvertencias.map((warning) => (
                <TableRow key={warning.id} className="hover:bg-gray-50">
                  <TableCell className="font-medium py-2 px-2 whitespace-nowrap">{warning.conductorName}</TableCell>
                  <TableCell className="py-2 px-2 whitespace-nowrap">
                    {new Date(warning.criadoEm).toLocaleDateString('pt-BR')}
                  </TableCell>
                  <TableCell className="py-2 px-2 whitespace-nowrap">
                    <Badge variant="default">
                      {getWarningTypeLabel(warning.tipo)}
                    </Badge>
                  </TableCell>
                  <TableCell className="py-2 px-2 whitespace-nowrap">
                    {warning.nivelAdvertencia
                      ? getWarningLevelLabel(warning.nivelAdvertencia)
                      : '-'}
                  </TableCell>
                  <TableCell className="py-2 px-2 whitespace-nowrap">
                    <Badge variant="default" className="text-xs">Assinada</Badge>
                  </TableCell>
                  <TableCell className="py-2 px-2 whitespace-nowrap">
                    <div className="flex gap-2">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => {
                          setSelectedWarning(warning);
                          setShowDetailDialog(true);
                        }}
                      >
                        Ver
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => {
                          setSelectedWarning(warning);
                          setConfirmAction('delete');
                          setShowConfirmDialog(true);
                        }}
                      >
                        Remover
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}

      {/* Tabela de Suspensões Assinadas */}
      {signedSuspensoes.length > 0 && (
        <div>
          <h3 className="font-semibold text-sm mb-2 text-red-600">Suspensões Assinadas ({signedSuspensoes.length})</h3>
          <Table className="text-sm">
            <TableHeader>
              <TableRow className="bg-gray-100">
                <TableHead className="py-2 px-2">Motorista</TableHead>
                <TableHead className="py-2 px-2">Data</TableHead>
                <TableHead className="py-2 px-2">Tipo</TableHead>
                <TableHead className="py-2 px-2">Status</TableHead>
                <TableHead className="py-2 px-2">Ação</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {signedSuspensoes.map((warning) => (
                <TableRow key={warning.id} className="hover:bg-gray-50 bg-red-50">
                  <TableCell className="font-medium py-2 px-2 whitespace-nowrap">{warning.conductorName}</TableCell>
                  <TableCell className="py-2 px-2 whitespace-nowrap">
                    {new Date(warning.criadoEm).toLocaleDateString('pt-BR')}
                  </TableCell>
                  <TableCell className="py-2 px-2 whitespace-nowrap">
                    <Badge variant="destructive">
                      {getWarningTypeLabel(warning.tipo)}
                    </Badge>
                  </TableCell>
                  <TableCell className="py-2 px-2 whitespace-nowrap">
                    <Badge variant="default" className="text-xs">Assinada</Badge>
                  </TableCell>
                  <TableCell className="py-2 px-2 whitespace-nowrap">
                    <div className="flex gap-2">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => {
                          setSelectedWarning(warning);
                          setShowDetailDialog(true);
                        }}
                      >
                        Ver
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => {
                          setSelectedWarning(warning);
                          setConfirmAction('delete');
                          setShowConfirmDialog(true);
                        }}
                      >
                        Remover
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}
    </div>
  );

  return (
    <div className="p-8 space-y-8">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold">Baixa de Advertências e Suspensões</h1>
        <p className="text-muted-foreground mt-2">
          Registre o recebimento de advertências e suspensões assinadas pelos motoristas
        </p>
      </div>

      {/* Filtros */}
      <Card>
        <CardHeader>
          <CardTitle>Filtros</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
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
            <div className="space-y-2">
              <Label htmlFor="filter-name">Nome do Motorista</Label>
              <Input
                id="filter-name"
                placeholder="Buscar por nome..."
                value={filterName}
                onChange={(e) => setFilterName(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="filter-operation">Operacao</Label>
              <select
                id="filter-operation"
                value={filterOperation}
                onChange={(e) => setFilterOperation(e.target.value)}
                className="w-full px-3 py-2 border border-input rounded-md bg-background"
              >
                <option value="">Todas</option>
                {operations.map((op) => (
                  <option key={op} value={op}>{op}</option>
                ))}
              </select>
            </div>
            <div className="flex items-end gap-2">
              <Button onClick={loadWarnings} className="w-full">
                Aplicar Filtros
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Medidas Pendentes */}
      {loading ? (
        <div className="text-center py-8">Carregando...</div>
      ) : (
        <>
          {(pendingAdvertencias.length > 0 || pendingSuspensoes.length > 0) && (
            <Card>
              <CardHeader>
                <div className="flex justify-between items-center">
                  <CardTitle className="flex items-center gap-2">
                    <AlertCircle className="w-5 h-5 text-red-600" />
                    Medidas Pendentes ({pendingAdvertencias.length + pendingSuspensoes.length})
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
                {viewMode === 'grid' ? renderPendingWarningsGrid() : renderPendingWarningsTable()}
              </CardContent>
            </Card>
          )}

          {/* Medidas Assinadas */}
          {(signedAdvertencias.length > 0 || signedSuspensoes.length > 0) && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <CheckCircle2 className="w-5 h-5 text-green-600" />
                  Medidas Assinadas ({signedAdvertencias.length + signedSuspensoes.length})
                </CardTitle>
              </CardHeader>
              <CardContent>
                {renderSignedWarningsTable()}
              </CardContent>
            </Card>
          )}

          {!pendingAdvertencias.length && !pendingSuspensoes.length && !signedAdvertencias.length && !signedSuspensoes.length && !loading && (
            <Card>
              <CardContent className="py-8 text-center text-muted-foreground">
                Nenhuma medida encontrada no período selecionado
              </CardContent>
            </Card>
          )}
        </>
      )}

      {/* Diálogos */}
      {/* Dialog de Confirmação */}
      <AlertDialog open={showConfirmDialog} onOpenChange={setShowConfirmDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {confirmAction === 'signoff' ? 'Confirmar Baixa' : 'Confirmar Remoção'}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {confirmAction === 'signoff'
                ? `Deseja marcar a ${selectedWarning?.tipo === 'advertencia' ? 'advertência' : 'suspensão'} como assinada?`
                : 'Deseja remover este registro?'}
            </AlertDialogDescription>
          </AlertDialogHeader>
          {confirmAction === 'signoff' && (
            <div className="space-y-2">
              <Label htmlFor="signoff-note">Observação (opcional)</Label>
              <Textarea
                id="signoff-note"
                placeholder="Digite uma observação..."
                value={signOffNote}
                onChange={(e) => setSignOffNote(e.target.value)}
              />
            </div>
          )}
          {confirmAction === 'delete' && (
            <div className="space-y-2">
              <Label htmlFor="delete-reason">Motivo da Exclusão (obrigatório)</Label>
              <Textarea
                id="delete-reason"
                placeholder="Informe o motivo da exclusão..."
                value={deleteReason}
                onChange={(e) => setDeleteReason(e.target.value)}
                className="min-h-24"
              />
            </div>
          )}
          <div className="flex gap-2 justify-end">
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                if (confirmAction === 'signoff') {
                  handleSignOff();
                } else if (confirmAction === 'delete') {
                  if (!deleteReason.trim()) {
                    toast.error('Por favor, informe o motivo da exclusão');
                    return;
                  }
                  handleDeleteWarning();
                }
              }}
              disabled={confirmAction === 'delete' && !deleteReason.trim()}
            >
              Confirmar
            </AlertDialogAction>
          </div>
        </AlertDialogContent>
      </AlertDialog>

      {/* Dialog de Detalhes */}
      {selectedWarning && (
        <Dialog open={showDetailDialog} onOpenChange={setShowDetailDialog}>
          <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>
                Detalhes da {selectedWarning.tipo === 'advertencia' ? 'Advertência' : 'Suspensão'}
              </DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label className="text-xs text-muted-foreground">Motorista</Label>
                  <p className="font-semibold">{selectedWarning.conductorName}</p>
                </div>
                <div>
                  <Label className="text-xs text-muted-foreground">Tipo</Label>
                  <p className="font-semibold">
                    {selectedWarning.tipo === 'advertencia' ? 'Advertência' : 'Suspensão'}
                  </p>
                </div>
                <div>
                  <Label className="text-xs text-muted-foreground">Data de Cadastro</Label>
                  <p className="font-semibold">
                    {new Date(selectedWarning.criadoEm).toLocaleDateString('pt-BR')}
                  </p>
                </div>
                {selectedWarning.nivelAdvertencia && (
                  <div>
                    <Label className="text-xs text-muted-foreground">Nível</Label>
                    <p className="font-semibold">
                      {getWarningLevelLabel(selectedWarning.nivelAdvertencia)}
                    </p>
                  </div>
                )}
              </div>
              <div>
                <Label className="text-xs text-muted-foreground">Motivo</Label>
                <Textarea
                  value={selectedWarning.motivo || ''}
                  onChange={(e) => setSelectedWarning({ ...selectedWarning, motivo: e.target.value })}
                  placeholder="Digite o motivo da advertência"
                  className="mt-2"
                />
              </div>
              <div>
                <Label className="text-xs text-muted-foreground">Observação</Label>
                <Textarea
                  value={signOffNote || selectedWarning.observacao || ''}
                  onChange={(e) => setSignOffNote(e.target.value)}
                  placeholder="Digite observações adicionais"
                  className="mt-2"
                />
              </div>
            </div>
            <DialogFooter className="flex gap-2 justify-between">
              <Button
                variant="outline"
                onClick={() => {
                  if (selectedWarning) {
                    generateWarningPDF({
                      conductorName: String(selectedWarning.conductorName || ''),
                      licensePlate: String((selectedWarning as any).placa || ''),
                      operacao: String((selectedWarning as any).operacao || ''),
                      warningLevel: String(selectedWarning.nivelAdvertencia) || 'Aviso 1',
                      warningType: String(selectedWarning.tipo || 'advertencia'),
                      warningReason: String(selectedWarning.motivo || ''),
                      warningNote: selectedWarning.observacao ? String(selectedWarning.observacao) : undefined,
                      createdDate: new Date(String(selectedWarning.criadoEm)),
                      cpf: String((selectedWarning as any).cpf || ''),
                      ctps: String((selectedWarning as any).ctps || ''),
                      dataInicio: String((selectedWarning as any).dataInicio || ''),
                      dataFim: String((selectedWarning as any).dataFim || ''),
                      dataRetorno: String((selectedWarning as any).dataRetorno || ''),
                    });
                  }
                }}
              >
                Imprimir PDF
              </Button>
              <div className="flex gap-2">
                <Button 
                  className="bg-blue-600 hover:bg-blue-700"
                  onClick={handleUpdateWarning}
                  disabled={loading}
                >
                  Salvar Alterações
                </Button>
                <Button 
                  variant="outline" 
                  onClick={() => {
                    setShowDetailDialog(false);
                    setSelectedWarning(null);
                  }}
                  disabled={loading}
                >
                  Fechar
                </Button>
              </div>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}
