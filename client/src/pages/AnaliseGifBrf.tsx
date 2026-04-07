import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { DropZone } from '@/components/DropZone';
import { FileSpreadsheet, Package, Download, Trash2, Plus } from 'lucide-react';
import * as XLSX from 'xlsx';
import { trpc } from '@/lib/trpc';

interface AnalysisResult {
  placa: string;
  carreta: string;
  origem: string;
  destino: string;
  inicioViagem: string;
  fimViagem: string;
  faixa: string;
  rangeMin: number | null;
  rangeMax: number | null;
  eficiencia: number;
  status: string;
  tempMedia: number;
  tempMin: number;
  tempMax: number;
  tempMediana: number;
  totalRegistros: number;
  registrosComTemp: number;
}

export default function AnaliseGifBrf() {
  const [masterFile, setMasterFile] = useState<File | undefined>(undefined);
  const [zipFiles, setZipFiles] = useState<File[]>([]);
  const [clientFile, setClientFile] = useState<File | undefined>(undefined);
  const [results, setResults] = useState<AnalysisResult[]>([]);
  const [kpis, setKpis] = useState<any>(null);
  const [error, setError] = useState<string>('');
  const [progress, setProgress] = useState<number>(0);

  const { mutate: analyzeData, isPending } = trpc.txtemp.analyze.useMutation({
    onSuccess: (response) => {
      if (response.success) {
        const formattedResults = response.results.map((r: any) => ({
          ...r,
          inicioViagem: new Date(r.inicioViagem).toLocaleString('pt-BR'),
          fimViagem: new Date(r.fimViagem).toLocaleString('pt-BR'),
        }));

        setResults(formattedResults);
        setKpis(response.kpis);
        setProgress(100);
      } else {
        setError(response.error || 'Erro ao analisar dados');
        setProgress(0);
      }
    },
    onError: (err) => {
      setError(`Erro: ${err.message}`);
      setProgress(0);
    },
  });

  const handleAddZip = (file: File | undefined) => {
    if (file) {
      setZipFiles([...zipFiles, file]);
    }
  };

  const handleRemoveZip = (index: number) => {
    setZipFiles(zipFiles.filter((_, i) => i !== index));
  };

  const handleAnalyze = async () => {
    if (!masterFile || zipFiles.length === 0) {
      setError('Por favor, selecione a Planilha Mestre e pelo menos um ZIP de Telemetria');
      return;
    }

    setError('');
    setProgress(10);

    try {
      // Convert files to base64
      const masterBase64 = await new Promise<string>((resolve) => {
        const reader = new FileReader();
        reader.onload = () => resolve((reader.result as string).split(',')[1]);
        reader.readAsDataURL(masterFile);
      });

      setProgress(30);

      const zipsBase64 = await Promise.all(
        zipFiles.map(
          (file) =>
            new Promise<string>((resolve) => {
              const reader = new FileReader();
              reader.onload = () => resolve((reader.result as string).split(',')[1]);
              reader.readAsDataURL(file);
            })
        )
      );

      setProgress(50);

      // Call backend analysis
      analyzeData({
        masterFile: masterBase64,
        zipFiles: zipsBase64,
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro desconhecido');
      setProgress(0);
    }
  };

  const handleExportExcel = () => {
    if (results.length === 0) {
      alert('Nenhum resultado para exportar');
      return;
    }

    const exportData = results.map((r) => ({
      Placa: r.placa,
      Carreta: r.carreta,
      Origem: r.origem,
      Destino: r.destino,
      Início: r.inicioViagem,
      Fim: r.fimViagem,
      Faixa: r.faixa,
      'Temp. Média': r.tempMedia !== null ? r.tempMedia.toFixed(1) : 'N/A',
      'Temp. Mín': r.tempMin !== null ? r.tempMin.toFixed(1) : 'N/A',
      'Temp. Máx': r.tempMax !== null ? r.tempMax.toFixed(1) : 'N/A',
      Eficiência: r.eficiencia !== null ? r.eficiencia.toFixed(1) : 'N/A',
      Status: r.status,
      Registros: r.totalRegistros,
    }));

    const wb = XLSX.utils.book_new();
    const ws = XLSX.utils.json_to_sheet(exportData);
    XLSX.utils.book_append_sheet(wb, ws, 'Análise TXTEMP');
    XLSX.writeFile(wb, `TXTEMP_Analise_${new Date().toISOString().split('T')[0]}.xlsx`);
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Análise TXTEMP</h1>
        <p className="text-muted-foreground mt-2">Análise de eficiência térmica baseada em temperatura e tempo</p>
      </div>

      {/* Upload Section */}
      <Card>
        <CardHeader>
          <CardTitle>Carregar Dados</CardTitle>
          <CardDescription>Selecione os arquivos para análise de eficiência térmica</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <DropZone
            icon={<FileSpreadsheet className="w-8 h-8" />}
            title="Planilha Mestre"
            subtitle="Arquivo Excel com dados de viagens"
            accept=".xlsx,.xls"
            onFile={setMasterFile}
            file={masterFile}
            disabled={isPending}
          />

          {/* Multiple ZIP files */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <label className="text-sm font-medium">ZIPs de Telemetria ({zipFiles.length})</label>
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  const input = document.createElement('input');
                  input.type = 'file';
                  input.accept = '.zip';
                  input.onchange = (e) => {
                    const file = (e.target as HTMLInputElement).files?.[0];
                    if (file) handleAddZip(file);
                  };
                  input.click();
                }}
                disabled={isPending}
              >
                <Plus className="w-4 h-4 mr-2" />
                Adicionar ZIP
              </Button>
            </div>

            {zipFiles.length === 0 ? (
              <div className="border-2 border-dashed rounded-lg p-8 text-center">
                <Package className="w-8 h-8 mx-auto mb-2 text-muted-foreground" />
                <p className="text-sm text-muted-foreground">Clique em "Adicionar ZIP" para selecionar arquivos</p>
              </div>
            ) : (
              <div className="space-y-2">
                {zipFiles.map((file, idx) => (
                  <div key={idx} className="flex items-center justify-between p-3 bg-secondary rounded-lg">
                    <div className="flex items-center gap-2">
                      <Package className="w-4 h-4" />
                      <span className="text-sm">{file.name}</span>
                      <span className="text-xs text-muted-foreground">({(file.size / 1024 / 1024).toFixed(2)} MB)</span>
                    </div>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleRemoveZip(idx)}
                      disabled={isPending}
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                ))}
              </div>
            )}
          </div>

          <DropZone
            icon={<FileSpreadsheet className="w-8 h-8" />}
            title="Planilha do Cliente (Opcional)"
            subtitle="Arquivo Excel com eficiência do cliente"
            accept=".xlsx,.xls"
            onFile={setClientFile}
            file={clientFile}
            disabled={isPending}
          />

          {error && <div className="p-3 bg-red-100 text-red-800 rounded-lg text-sm">{error}</div>}

          {/* Progress Bar */}
          {isPending && (
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium">Analisando dados...</span>
                <span className="text-sm text-muted-foreground">{progress}%</span>
              </div>
              <div className="w-full bg-secondary rounded-full h-2">
                <div
                  className="bg-blue-500 h-2 rounded-full transition-all duration-300"
                  style={{ width: `${progress}%` }}
                />
              </div>
            </div>
          )}

          <Button
            onClick={handleAnalyze}
            disabled={!masterFile || zipFiles.length === 0 || isPending}
            className="w-full"
            size="lg"
          >
            {isPending ? 'Analisando...' : 'Analisar Dados'}
          </Button>
        </CardContent>
      </Card>

      {/* KPIs Section */}
      {kpis && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <Card>
            <CardContent className="pt-6">
              <div className="space-y-2">
                <p className="text-sm font-medium text-muted-foreground">Total de Viagens</p>
                <p className="text-2xl font-bold">{kpis.totalTrips}</p>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-6">
              <div className="space-y-2">
                <p className="text-sm font-medium text-muted-foreground">Viagens Within</p>
                <p className="text-2xl font-bold text-green-600">{kpis.tripsWithin}</p>
                <p className="text-xs text-muted-foreground">({kpis.totalTrips > 0 ? ((kpis.tripsWithin / kpis.totalTrips) * 100).toFixed(1) : '0'}%)</p>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-6">
              <div className="space-y-2">
                <p className="text-sm font-medium text-muted-foreground">Viagens Partial</p>
                <p className="text-2xl font-bold text-yellow-600">{kpis.tripsPartial}</p>
                <p className="text-xs text-muted-foreground">({kpis.totalTrips > 0 ? ((kpis.tripsPartial / kpis.totalTrips) * 100).toFixed(1) : '0'}%)</p>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-6">
              <div className="space-y-2">
                <p className="text-sm font-medium text-muted-foreground">Eficiência Média</p>
                <p className="text-2xl font-bold">{kpis.averageEfficiency !== null && kpis.averageEfficiency !== undefined ? kpis.averageEfficiency.toFixed(1) : '0'}%</p>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Results Table */}
      {results.length > 0 && (
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle>Resultados da Análise</CardTitle>
                <CardDescription>{results.length} viagens analisadas</CardDescription>
              </div>
              <Button onClick={handleExportExcel} variant="outline" size="sm">
                <Download className="w-4 h-4 mr-2" />
                Exportar
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b">
                    <th className="text-left py-3 px-4 font-semibold">Placa</th>
                    <th className="text-left py-3 px-4 font-semibold">Origem → Destino</th>
                    <th className="text-left py-3 px-4 font-semibold">Faixa</th>
                    <th className="text-left py-3 px-4 font-semibold">Temp. Média</th>
                    <th className="text-left py-3 px-4 font-semibold">Eficiência</th>
                    <th className="text-left py-3 px-4 font-semibold">Status</th>
                    <th className="text-left py-3 px-4 font-semibold">Registros</th>
                  </tr>
                </thead>
                <tbody>
                  {results.map((result, idx) => (
                    <tr key={idx} className="border-b hover:bg-secondary/50">
                      <td className="py-3 px-4 font-mono text-xs">{result.placa}</td>
                      <td className="py-3 px-4 text-xs">
                        {result.origem} → {result.destino}
                      </td>
                      <td className="py-3 px-4 text-xs">{result.faixa}</td>
                      <td className="py-3 px-4">{result.tempMedia !== null && result.tempMedia !== undefined ? result.tempMedia.toFixed(1) : 'N/A'}°C</td>
                      <td className="py-3 px-4">
                        <span
                          className={`px-2 py-1 rounded text-xs font-semibold ${
                            result.eficiencia >= 90
                              ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200'
                              : result.eficiencia >= 70
                              ? 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200'
                              : result.eficiencia >= 50
                              ? 'bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-200'
                              : 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200'
                          }`}
                        >
                          {result.eficiencia !== null && result.eficiencia !== undefined ? result.eficiencia.toFixed(1) : 'N/A'}%
                        </span>
                      </td>
                      <td className="py-3 px-4 text-xs">{result.status}</td>
                      <td className="py-3 px-4">{result.totalRegistros}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
