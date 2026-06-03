import { useState, useRef } from 'react';
import { trpc } from '@/lib/trpc';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { toast } from 'sonner';
import { Upload, FileX, CheckCircle, AlertCircle } from 'lucide-react';
import * as XLSX from 'xlsx';

interface ProcessedWarning {
  id: number;
  condutor: string;
  cpf: string;
  operacao: string;
  placa: string;
  dataJornada: string;
  diaSemana: string;
  status: 'ADVERTENCIA' | 'EM_REVISAO' | 'CONFERENCIA_MANUAL';
  infractions: string[];
  warningText?: string;
  errors: string[];
  valid: boolean;
}

export function BulkWarningsImport() {
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [processedWarnings, setProcessedWarnings] = useState<ProcessedWarning[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [importProgress, setImportProgress] = useState(0);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const utils = trpc.useUtils();
  const bulkCreateMutation = trpc.dashboard.bulkCreateWarnings.useMutation({
    onSuccess: (data: any) => {
      toast.success(data?.message || 'Importação concluída');
      
      utils.dashboard.getIdleDriversForWarning.invalidate();
      utils.dashboard.getWarningsStatsByDriver.invalidate();
      utils.dashboard.getWarningsStatsByOperation.invalidate();
      utils.dashboard.getWarningsReport.invalidate();
      
      setSelectedFile(null);
      setProcessedWarnings([]);
      setImportProgress(0);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    },
    onError: (error: any) => {
      toast.error(`Erro na importação: ${error.message}`);
      setImportProgress(0);
    },
  });

  const handleFileSelect = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    if (!file.name.endsWith('.xlsx') && !file.name.endsWith('.xls')) {
      toast.error('Por favor, selecione um arquivo Excel (.xlsx ou .xls)');
      return;
    }

    setSelectedFile(file);
    setIsLoading(true);

    try {
      const buffer = await file.arrayBuffer();
      const workbook = XLSX.read(buffer, { type: 'buffer' });
      
      // Find the last "advert" sheet (following the rules)
      let targetSheetName: string | null = null;
      let maxWeekNumber = -1;

      for (const sheetName of workbook.SheetNames) {
        const normalized = sheetName.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
        
        if (normalized.includes('advert')) {
          // Extract week number if present
          const weekMatch = sheetName.match(/(\d+)/);
          const weekNumber = weekMatch ? parseInt(weekMatch[1], 10) : -1;
          
          if (weekNumber > maxWeekNumber) {
            maxWeekNumber = weekNumber;
            targetSheetName = sheetName;
          } else if (weekNumber === maxWeekNumber && targetSheetName) {
            // If same week, use the rightmost (last) one
            targetSheetName = sheetName;
          }
        }
      }

      // Fallback to last sheet if no "advert" sheet found
      if (!targetSheetName) {
        targetSheetName = workbook.SheetNames[workbook.SheetNames.length - 1];
      }

      const worksheet = workbook.Sheets[targetSheetName];

      if (!worksheet) {
        toast.error('Nenhuma aba encontrada no arquivo');
        setIsLoading(false);
        return;
      }
      
      toast.info(`Importando aba: ${targetSheetName}`);

      const rows = XLSX.utils.sheet_to_json(worksheet, { defval: '' });

      if (rows.length === 0) {
        toast.error('Arquivo Excel vazio');
        setIsLoading(false);
        return;
      }

      // Get headers from first row
      const headers = Object.keys(rows[0] || {});

      // Process records using Rules Engine
      const warnings: ProcessedWarning[] = [];
      
      for (let i = 0; i < rows.length; i++) {
        const row = rows[i] as any;
        
        // Normalize column names for matching
        const normalizeCol = (name: string) => 
          name.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').trim();
        
        const normalizedHeaders = headers.map(normalizeCol);

        // Find columns
        const findCol = (synonyms: string[]) => {
          const idx = normalizedHeaders.findIndex(h => 
            synonyms.some(syn => normalizeCol(syn) === h)
          );
          return idx >= 0 ? headers[idx] : null;
        };

        // Extract data
        const conductorCol = findCol(['condutor']);
        const cpfCol = findCol(['cpf']);
        const operacaoCol = findCol(['operacao', 'operação']);
        const placaCol = findCol(['placa']);
        const journeyCol = findCol(['tempo jornada s/ refeicao', 'tempo jornada sem refeicao', 'tempo jornada s/ refeição']);
        const inicioCol = findCol(['inicio jornada', 'início jornada']);

        const errors: string[] = [];
        
        if (!conductorCol) errors.push('Coluna "Condutor" não encontrada');
        if (!cpfCol) errors.push('Coluna "CPF" não encontrada');
        if (!operacaoCol) errors.push('Coluna "Operação" não encontrada');
        if (!placaCol) errors.push('Coluna "Placa" não encontrada');
        if (!journeyCol) errors.push('Coluna "Tempo Jornada" não encontrada');
        if (!inicioCol) errors.push('Coluna "Início Jornada" não encontrada');

        if (errors.length > 0) {
          warnings.push({
            id: i,
            condutor: '',
            cpf: '',
            operacao: '',
            placa: '',
            dataJornada: '',
            diaSemana: '',
            status: 'CONFERENCIA_MANUAL',
            infractions: [],
            errors,
            valid: false,
          });
          continue;
        }

        // Extract and normalize data
        const condutor = String(row[conductorCol!] || '').trim();
        let cpf = String(row[cpfCol!] || '').trim().replace(/[\s.\-]/g, '');
        const operacao = String(row[operacaoCol!] || '').trim();
        let placa = String(row[placaCol!] || '').trim().replace(/[\s\-]/g, '').toUpperCase();
        const journeyStr = String(row[journeyCol!] || '').trim();
        const inicioStr = String(row[inicioCol!] || '').trim();

        // Extract date
        const dateMatch = inicioStr.match(/(\d{2})\/(\d{2})\/(\d{4})/);
        let dataJornada = '';
        let diaSemana = '';

        if (dateMatch) {
          const day = parseInt(dateMatch[1], 10);
          const month = parseInt(dateMatch[2], 10);
          const year = parseInt(dateMatch[3], 10);
          const date = new Date(year, month - 1, day);
          
          if (!isNaN(date.getTime())) {
            dataJornada = date.toLocaleDateString('pt-BR');
            const days = ['domingo', 'segunda', 'terça', 'quarta', 'quinta', 'sexta', 'sábado'];
            diaSemana = days[date.getDay()];
          }
        }

        // Validate CPF
        if (cpf.length !== 11 || !/^\d{11}$/.test(cpf)) {
          errors.push(`CPF inválido: ${cpf}`);
        }

        // Parse journey time
        const journeyMatch = journeyStr.match(/^(\d{1,2}):(\d{2})$/);
        const journeyMinutes = journeyMatch 
          ? parseInt(journeyMatch[1], 10) * 60 + parseInt(journeyMatch[2], 10)
          : null;

        // Detect infractions
        const infractions: string[] = [];
        const limit = diaSemana === 'sábado' ? 240 : (diaSemana === 'domingo' ? 0 : 480);

        if (journeyMinutes !== null) {
          if (diaSemana === 'domingo' && journeyMinutes > 0) {
            infractions.push(`Trabalho em dia de descanso (${diaSemana})`);
          } else if (journeyMinutes > limit) {
            const excess = journeyMinutes - limit;
            const hours = Math.floor(excess / 60);
            const mins = excess % 60;
            infractions.push(`Excesso de jornada: ${hours}h${String(mins).padStart(2, '0')}`);
          }
        }

        const status = infractions.length === 0 ? 'CONFERENCIA_MANUAL' : 'ADVERTENCIA';

        warnings.push({
          id: i,
          condutor,
          cpf,
          operacao,
          placa,
          dataJornada,
          diaSemana,
          status: status as any,
          infractions,
          errors: errors.length > 0 ? errors : [],
          valid: errors.length === 0 && infractions.length > 0,
        });
      }

      setProcessedWarnings(warnings);
      toast.success(`${warnings.length} registros processados`);
    } catch (error) {
      console.error('Erro ao processar arquivo:', error);
      toast.error('Erro ao processar arquivo Excel');
    } finally {
      setIsLoading(false);
    }
  };

  const handleImport = async () => {
    const validWarnings = processedWarnings.filter(w => w.valid && w.status === 'ADVERTENCIA');
    
    if (validWarnings.length === 0) {
      toast.error('Nenhuma advertência válida para importar');
      return;
    }

    setImportProgress(0);
    bulkCreateMutation.mutate({
      records: validWarnings.map(w => ({
        conductorName: w.condutor,
        cpf: w.cpf,
        operacao: w.operacao,
        placa: w.placa,
        dataInfracao: w.dataJornada,
        motivo: w.infractions.join(' | '),
        tipo: 'advertencia' as const,
      })),
    });
  };

  const stats = {
    total: processedWarnings.length,
    advertencia: processedWarnings.filter(w => w.status === 'ADVERTENCIA').length,
    revisao: processedWarnings.filter(w => w.status === 'EM_REVISAO').length,
    manual: processedWarnings.filter(w => w.status === 'CONFERENCIA_MANUAL').length,
  };

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Upload className="w-5 h-5" />
            Importação em Massa
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div
            onClick={() => fileInputRef.current?.click()}
            className="border-2 border-dashed border-border rounded-lg p-8 text-center cursor-pointer hover:bg-muted/50 transition-colors"
          >
            <input
              ref={fileInputRef}
              type="file"
              accept=".xlsx,.xls"
              onChange={handleFileSelect}
              className="hidden"
            />
            <Upload className="w-12 h-12 mx-auto mb-2 text-muted-foreground" />
            <p className="text-sm font-medium">Clique para selecionar um arquivo Excel</p>
            <p className="text-xs text-muted-foreground">ou arraste um arquivo aqui</p>
          </div>

          {selectedFile && (
            <div className="text-sm text-muted-foreground">
              Arquivo selecionado: {selectedFile.name}
            </div>
          )}

          {processedWarnings.length > 0 && (
            <div className="space-y-4">
              <div className="grid grid-cols-4 gap-2 text-sm">
                <div className="bg-blue-50 dark:bg-blue-950 p-3 rounded">
                  <div className="font-semibold text-blue-900 dark:text-blue-100">{stats.total}</div>
                  <div className="text-xs text-blue-700 dark:text-blue-300">Total</div>
                </div>
                <div className="bg-green-50 dark:bg-green-950 p-3 rounded">
                  <div className="font-semibold text-green-900 dark:text-green-100">{stats.advertencia}</div>
                  <div className="text-xs text-green-700 dark:text-green-300">Advertências</div>
                </div>
                <div className="bg-yellow-50 dark:bg-yellow-950 p-3 rounded">
                  <div className="font-semibold text-yellow-900 dark:text-yellow-100">{stats.revisao}</div>
                  <div className="text-xs text-yellow-700 dark:text-yellow-300">Em Revisão</div>
                </div>
                <div className="bg-orange-50 dark:bg-orange-950 p-3 rounded">
                  <div className="font-semibold text-orange-900 dark:text-orange-100">{stats.manual}</div>
                  <div className="text-xs text-orange-700 dark:text-orange-300">Manual</div>
                </div>
              </div>

              <div className="max-h-96 overflow-y-auto border rounded-lg">
                <table className="w-full text-sm">
                  <thead className="sticky top-0 bg-muted">
                    <tr>
                      <th className="px-4 py-2 text-left font-semibold">Condutor</th>
                      <th className="px-4 py-2 text-left font-semibold">CPF</th>
                      <th className="px-4 py-2 text-left font-semibold">Operação</th>
                      <th className="px-4 py-2 text-left font-semibold">Status</th>
                      <th className="px-4 py-2 text-left font-semibold">Infrações</th>
                    </tr>
                  </thead>
                  <tbody>
                    {processedWarnings.map((warning) => (
                      <tr key={warning.id} className={warning.errors.length > 0 ? 'bg-red-50 dark:bg-red-950' : ''}>
                        <td className="px-4 py-2">{warning.condutor}</td>
                        <td className="px-4 py-2 font-mono text-xs">{warning.cpf}</td>
                        <td className="px-4 py-2 text-xs">{warning.operacao}</td>
                        <td className="px-4 py-2">
                          <span className={`inline-block px-2 py-1 rounded text-xs font-medium ${
                            warning.status === 'ADVERTENCIA' ? 'bg-green-100 dark:bg-green-900 text-green-800 dark:text-green-100' :
                            warning.status === 'EM_REVISAO' ? 'bg-yellow-100 dark:bg-yellow-900 text-yellow-800 dark:text-yellow-100' :
                            'bg-orange-100 dark:bg-orange-900 text-orange-800 dark:text-orange-100'
                          }`}>
                            {warning.status}
                          </span>
                        </td>
                        <td className="px-4 py-2 text-xs">
                          {warning.errors.length > 0 ? (
                            <span className="text-red-600 dark:text-red-400">{warning.errors[0]}</span>
                          ) : (
                            <span className="text-green-600 dark:text-green-400">{warning.infractions.length} infração(ões)</span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              <Button
                onClick={handleImport}
                disabled={bulkCreateMutation.isPending || stats.advertencia === 0}
                className="w-full"
              >
                {bulkCreateMutation.isPending ? 'Importando...' : `Importar ${stats.advertencia} Advertências`}
              </Button>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
