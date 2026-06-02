import { useState, useRef } from 'react';
import { trpc } from '@/lib/trpc';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { toast } from 'sonner';
import { Upload, FileX, CheckCircle, AlertCircle } from 'lucide-react';
import * as XLSX from 'xlsx';

interface ParsedRecord {
  condutor: string;
  cpf: string;
  matricula?: string;
  operacao: string;
  cargo?: string;
  placa: string;
  motivo: string;
  dataInfracao: string;
  tipo: 'advertencia' | 'suspensao';
  errors?: string[];
}

export function BulkWarningsImport() {
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [parsedRecords, setParsedRecords] = useState<ParsedRecord[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [importProgress, setImportProgress] = useState(0);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const utils = trpc.useUtils();
  const bulkCreateMutation = trpc.dashboard.bulkCreateWarnings.useMutation({
    onSuccess: (data: any) => {
      toast.success(data?.message || 'Importação concluída');
      
      // Invalidate related queries
      utils.dashboard.getIdleDriversForWarning.invalidate();
      utils.dashboard.getWarningsStatsByDriver.invalidate();
      utils.dashboard.getWarningsStatsByOperation.invalidate();
      utils.dashboard.getWarningsReport.invalidate();
      
      // Reset form
      setSelectedFile(null);
      setParsedRecords([]);
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
      const worksheet = workbook.Sheets[workbook.SheetNames[0]];

      if (!worksheet) {
        toast.error('Nenhuma aba encontrada no arquivo');
        setIsLoading(false);
        return;
      }

      const rows = XLSX.utils.sheet_to_json(worksheet, { defval: '' });

      if (rows.length === 0) {
        toast.error('Arquivo Excel vazio');
        setIsLoading(false);
        return;
      }

      // Parse and validate records
      const records: ParsedRecord[] = rows.map((row: any, index: number) => {
        const errors: string[] = [];

        const condutor = (row['Condutor'] || row['condutor'] || '').toString().trim();
        const cpf = (row['CPF'] || row['cpf'] || '').toString().replace(/\D/g, '').trim();
        const matricula = (row['Matrícula'] || row['matricula'] || '').toString().trim();
        const operacao = (row['Operação'] || row['operacao'] || '').toString().trim();
        const cargo = (row['Cargo'] || row['cargo'] || '').toString().trim();
        const placa = (row['Placa'] || row['placa'] || '').toString().trim();
        const motivo = (row['Motivo'] || row['motivo'] || '').toString().trim();
        let dataInfracao = (row['Data da Infração'] || row['data_infracao'] || '').toString().trim();

        // Validate required fields
        if (!condutor) errors.push('Condutor não informado');
        if (!cpf || cpf.length !== 11) errors.push('CPF inválido');
        if (!operacao) errors.push('Operação não informada');
        if (!placa) errors.push('Placa não informada');
        if (!dataInfracao) errors.push('Data da infração não informada');

        // Normalize date
        if (dataInfracao && !/^\d{2}\/\d{2}\/\d{4}$/.test(dataInfracao)) {
          if (/^\d{4}-\d{2}-\d{2}$/.test(dataInfracao)) {
            const [year, month, day] = dataInfracao.split('-');
            dataInfracao = `${day}/${month}/${year}`;
          }
        }

        // Determine warning type based on motivo
        let tipo: 'advertencia' | 'suspensao' = 'advertencia';
        const motivoLower = motivo.toLowerCase();
        if (motivoLower.includes('fumar') || motivoLower.includes('suspensão')) {
          tipo = 'suspensao';
        }

        return {
          condutor,
          cpf,
          matricula,
          operacao,
          cargo,
          placa,
          motivo,
          dataInfracao,
          tipo,
          errors: errors.length > 0 ? errors : undefined,
        };
      });

      setParsedRecords(records);

      const validCount = records.filter(r => !r.errors).length;
      const invalidCount = records.length - validCount;

      toast.info(
        `${validCount} registros válidos, ${invalidCount} com erros`,
        { duration: 5000 }
      );
    } catch (error) {
      toast.error(`Erro ao processar arquivo: ${error instanceof Error ? error.message : 'Erro desconhecido'}`);
    } finally {
      setIsLoading(false);
    }
  };

  const handleImport = async () => {
    const validRecords = parsedRecords.filter(r => !r.errors);

    if (validRecords.length === 0) {
      toast.error('Nenhum registro válido para importar');
      return;
    }

    setIsLoading(true);
    setImportProgress(0);

    // Convert records to the format expected by the backend
    const recordsToImport = validRecords.map(r => ({
      conductorName: r.condutor,
      cpf: r.cpf,
      matricula: r.matricula,
      operacao: r.operacao,
      placa: r.placa,
      motivo: r.motivo,
      dataInfracao: r.dataInfracao,
      tipo: r.tipo,
      categoria: 'outro',
    }));

    try {
      await bulkCreateMutation.mutateAsync({
        records: recordsToImport,
      });
      setIsLoading(false);
    } catch (error) {
      setIsLoading(false);
      console.error('Erro na importação:', error);
    }
  };

  const validRecords = parsedRecords.filter(r => !r.errors);
  const invalidRecords = parsedRecords.filter(r => r.errors);

  return (
    <div className="space-y-6">
      {/* Upload Area */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Upload className="w-5 h-5" />
            Upload de Arquivo
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="border-2 border-dashed border-gray-300 rounded-lg p-8 text-center hover:border-gray-400 transition">
              <input
                ref={fileInputRef}
                type="file"
                accept=".xlsx,.xls"
                onChange={handleFileSelect}
                disabled={isLoading}
                className="hidden"
              />
              <button
                onClick={() => fileInputRef.current?.click()}
                disabled={isLoading}
                className="text-gray-600 hover:text-gray-900 disabled:opacity-50"
              >
                <div className="flex flex-col items-center gap-2">
                  <Upload className="w-8 h-8" />
                  <p className="text-sm font-medium">
                    {selectedFile ? selectedFile.name : 'Clique para selecionar um arquivo Excel'}
                  </p>
                  <p className="text-xs text-gray-500">ou arraste um arquivo aqui</p>
                </div>
              </button>
            </div>

            {selectedFile && (
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                <p className="text-sm text-blue-900">
                  Arquivo selecionado: <strong>{selectedFile.name}</strong>
                </p>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Preview */}
      {parsedRecords.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center justify-between">
              <span>Preview dos Dados</span>
              <span className="text-sm font-normal text-gray-600">
                {validRecords.length} válidos, {invalidRecords.length} com erros
              </span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {/* Valid Records */}
              {validRecords.length > 0 && (
                <div>
                  <h3 className="flex items-center gap-2 text-sm font-semibold text-green-900 mb-3">
                    <CheckCircle className="w-4 h-4" />
                    Registros Válidos ({validRecords.length})
                  </h3>
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="border-b">
                          <th className="text-left py-2 px-3">Condutor</th>
                          <th className="text-left py-2 px-3">CPF</th>
                          <th className="text-left py-2 px-3">Operação</th>
                          <th className="text-left py-2 px-3">Placa</th>
                          <th className="text-left py-2 px-3">Tipo</th>
                        </tr>
                      </thead>
                      <tbody>
                        {validRecords.slice(0, 5).map((record, idx) => (
                          <tr key={idx} className="border-b hover:bg-gray-50">
                            <td className="py-2 px-3">{record.condutor}</td>
                            <td className="py-2 px-3">{record.cpf}</td>
                            <td className="py-2 px-3">{record.operacao}</td>
                            <td className="py-2 px-3">{record.placa}</td>
                            <td className="py-2 px-3">
                              <span className={`px-2 py-1 rounded text-xs font-medium ${
                                record.tipo === 'suspensao'
                                  ? 'bg-red-100 text-red-800'
                                  : 'bg-yellow-100 text-yellow-800'
                              }`}>
                                {record.tipo === 'suspensao' ? 'Suspensão' : 'Advertência'}
                              </span>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                  {validRecords.length > 5 && (
                    <p className="text-xs text-gray-600 mt-2">
                      ... e mais {validRecords.length - 5} registros
                    </p>
                  )}
                </div>
              )}

              {/* Invalid Records */}
              {invalidRecords.length > 0 && (
                <div>
                  <h3 className="flex items-center gap-2 text-sm font-semibold text-red-900 mb-3">
                    <AlertCircle className="w-4 h-4" />
                    Registros com Erros ({invalidRecords.length})
                  </h3>
                  <div className="space-y-2">
                    {invalidRecords.slice(0, 3).map((record, idx) => (
                      <div key={idx} className="bg-red-50 border border-red-200 rounded p-3 text-sm">
                        <p className="font-medium text-red-900">{record.condutor || 'Sem nome'}</p>
                        <ul className="text-red-700 text-xs mt-1 space-y-1">
                          {record.errors?.map((error, errorIdx) => (
                            <li key={errorIdx}>• {error}</li>
                          ))}
                        </ul>
                      </div>
                    ))}
                  </div>
                  {invalidRecords.length > 3 && (
                    <p className="text-xs text-gray-600 mt-2">
                      ... e mais {invalidRecords.length - 3} registros com erros
                    </p>
                  )}
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Import Button */}
      {parsedRecords.length > 0 && (
        <div className="flex gap-3">
          <Button
            onClick={handleImport}
            disabled={isLoading || validRecords.length === 0}
            className="flex-1"
            size="lg"
          >
            {isLoading ? (
              <>
                <div className="animate-spin mr-2 w-4 h-4 border-2 border-white border-t-transparent rounded-full" />
                Importando...
              </>
            ) : (
              `Importar ${validRecords.length} Advertência${validRecords.length !== 1 ? 's' : ''}`
            )}
          </Button>
          <Button
            onClick={() => {
              setSelectedFile(null);
              setParsedRecords([]);
              setImportProgress(0);
              if (fileInputRef.current) {
                fileInputRef.current.value = '';
              }
            }}
            variant="outline"
            disabled={isLoading}
          >
            Limpar
          </Button>
        </div>
      )}

      {/* Progress Bar */}
      {isLoading && importProgress > 0 && (
        <div className="w-full bg-gray-200 rounded-full h-2">
          <div
            className="bg-blue-600 h-2 rounded-full transition-all duration-300"
            style={{ width: `${importProgress}%` }}
          />
        </div>
      )}
    </div>
  );
}
