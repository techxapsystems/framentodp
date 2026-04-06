import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { DropZone } from '@/components/DropZone';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { FileSpreadsheet, Package, Download, TrendingUp, AlertCircle } from 'lucide-react';
import * as XLSX from 'xlsx';
import JSZip from 'jszip';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';

interface KPI {
  label: string;
  value: string | number;
  unit?: string;
  color: string;
}

interface AnalysisResult {
  placa: string;
  carreta: string;
  origem: string;
  destino: string;
  inicio: Date;
  fim: Date;
  faixa: string;
  tempMedia: number;
  tempMin: number;
  tempMax: number;
  eficiencia: number;
  status: 'within' | 'partial' | 'outside' | 'S/ ARQUIVO' | 'S/ DADOS' | 'S/ FAIXA';
  tempoWithin: number;
  tempoTotal: number;
  registros: number;
  eficienciaCliente?: number;
}

interface TemperatureDataPoint {
  tempo: string;
  temperatura: number;
}

export default function AnaliseGifBrf() {
  const [masterFile, setMasterFile] = useState<File | undefined>(undefined);
  const [reportsZip, setReportsZip] = useState<File | undefined>(undefined);
  const [clientFile, setClientFile] = useState<File | undefined>(undefined);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [results, setResults] = useState<AnalysisResult[]>([]);
  const [kpis, setKpis] = useState<KPI[]>([]);
  const [showTemperatureChart, setShowTemperatureChart] = useState(false);
  const [selectedResult, setSelectedResult] = useState<AnalysisResult | null>(null);
  const [temperatureData, setTemperatureData] = useState<TemperatureDataPoint[]>([]);

  // Parse flexible date format
  const parseFlexDate = (dateVal: any): Date | null => {
    if (dateVal instanceof Date) return dateVal;
    if (typeof dateVal === 'number') {
      // Excel serial date
      return new Date((dateVal - 25569) * 86400 * 1000);
    }
    if (typeof dateVal === 'string') {
      // Try DD/MM/YYYY HH:MM
      const match = dateVal.match(/(\d{1,2})\/(\d{1,2})\/(\d{4})\s+(\d{1,2}):(\d{2})/);
      if (match) {
        const [, day, month, year, hour, minute] = match;
        return new Date(parseInt(year), parseInt(month) - 1, parseInt(day), parseInt(hour), parseInt(minute));
      }
      // Try ISO format
      try {
        return new Date(dateVal);
      } catch {
        return null;
      }
    }
    return null;
  };

  // Extract temperature range from text
  const extractTemperatureRange = (rangeText: string): { min: number; max: number } | null => {
    if (!rangeText) return null;

    // Ignore invalid texts
    const invalidTexts = ['NÃO ACHEI', 'SEM CONTROLE', 'SEM CTRL', 'SEM FAIXA'];
    if (invalidTexts.some((text) => rangeText.toUpperCase().includes(text))) {
      return null;
    }

    // Clean text
    let cleaned = rangeText.toUpperCase();
    cleaned = cleaned.replace(/[\*°C°FRAMENTO TIROLEZ RESFRIADO CONGELADO CONTINUO MISTA]/g, '');

    // Extract all numbers
    const numbers = cleaned.match(/-?\d+(\.\d+)?/g);
    if (!numbers || numbers.length < 2) return null;

    const temps = numbers.map((n) => parseFloat(n)).sort((a, b) => a - b);
    return { min: temps[0], max: temps[temps.length - 1] };
  };

  // Analyze trip efficiency based on temperature
  const analyzeTrip = (
    inicio: Date,
    fim: Date,
    faixa: string,
    telemetryData: Array<{ timestamp: Date; temperatura: number }>
  ): {
    eficiencia: number;
    status: 'within' | 'partial' | 'outside' | 'S/ DADOS' | 'S/ FAIXA';
    tempoWithin: number;
    tempoTotal: number;
    tempMedia: number;
    tempMin: number;
    tempMax: number;
  } => {
    // Check faixa
    const range = extractTemperatureRange(faixa);
    if (!range) {
      return {
        eficiencia: 0,
        status: 'S/ FAIXA',
        tempoWithin: 0,
        tempoTotal: 0,
        tempMedia: 0,
        tempMin: 0,
        tempMax: 0,
      };
    }

    // Apply ±1 hour tolerance
    const toleranceMs = 60 * 60 * 1000;
    const windowStart = new Date(inicio.getTime() - toleranceMs);
    const windowEnd = new Date(fim.getTime() + toleranceMs);

    // Filter records within window with valid temperature
    const validRecords = telemetryData
      .filter((r) => r.timestamp >= windowStart && r.timestamp <= windowEnd && typeof r.temperatura === 'number')
      .sort((a, b) => a.timestamp.getTime() - b.timestamp.getTime());

    if (validRecords.length === 0) {
      return {
        eficiencia: 0,
        status: 'S/ DADOS',
        tempoWithin: 0,
        tempoTotal: 0,
        tempMedia: 0,
        tempMin: 0,
        tempMax: 0,
      };
    }

    // Calculate efficiency
    let tempoWithin = 0;
    let tempoTotal = 0;

    for (let i = 0; i < validRecords.length - 1; i++) {
      const current = validRecords[i];
      const next = validRecords[i + 1];

      const intervalMs = next.timestamp.getTime() - current.timestamp.getTime();
      if (intervalMs <= 0) continue;

      const intervalMin = intervalMs / (1000 * 60);
      tempoTotal += intervalMin;

      // Both points must be within range
      const currentWithin = current.temperatura >= range.min && current.temperatura <= range.max;
      const nextWithin = next.temperatura >= range.min && next.temperatura <= range.max;

      if (currentWithin && nextWithin) {
        tempoWithin += intervalMin;
      }
    }

    const eficiencia = tempoTotal > 0 ? (tempoWithin / tempoTotal) * 100 : 0;
    const status = eficiencia >= 100 ? 'within' : eficiencia >= 50 ? 'partial' : 'outside';

    // Calculate temperature statistics
    const temps = validRecords.map((r) => r.temperatura);
    const tempMedia = temps.reduce((a, b) => a + b, 0) / temps.length;
    const tempMin = Math.min(...temps);
    const tempMax = Math.max(...temps);

    return {
      eficiencia,
      status,
      tempoWithin,
      tempoTotal,
      tempMedia,
      tempMin,
      tempMax,
    };
  };

  const handleAnalyze = async () => {
    if (!masterFile || !reportsZip) {
      alert('Por favor, selecione a Planilha Mestre e o ZIP de Relatórios');
      return;
    }

    setIsAnalyzing(true);
    try {
      // Read master file
      const masterArrayBuffer = await masterFile.arrayBuffer();
      const masterWorkbook = XLSX.read(masterArrayBuffer);
      const masterSheet = masterWorkbook.Sheets[masterWorkbook.SheetNames[0]];
      const masterData: any[] = XLSX.utils.sheet_to_json(masterSheet);

      // Read ZIP
      const zipArrayBuffer = await reportsZip.arrayBuffer();
      const zip = new JSZip();
      await zip.loadAsync(zipArrayBuffer);

      // Parse telemetry files from ZIP
      const telemetryByPlaca: { [key: string]: Array<{ timestamp: Date; temperatura: number }> } = {};

      for (const filename in zip.files) {
        if (zip.files[filename].dir) continue;

        try {
          const fileBuffer = await zip.files[filename].async('arraybuffer');
          const workbook = XLSX.read(fileBuffer);
          const sheet = workbook.Sheets[workbook.SheetNames[0]];
          const data: any[] = XLSX.utils.sheet_to_json(sheet);

          // Extract placa from filename
          const placaMatch = filename.match(/([A-Z]{3}[0-9]{4}|[A-Z]{3}[0-9]{1}[A-Z]{1}[0-9]{2})/);
          if (!placaMatch) continue;

          const placa = placaMatch[0];

          // Parse telemetry
          const records: Array<{ timestamp: Date; temperatura: number }> = [];
          for (const row of data) {
            // Find date column
            let dateVal = row['Data/Hora'] || row['data'] || row['DATA'] || Object.values(row)[0];
            const timestamp = parseFlexDate(dateVal);
            if (!timestamp) continue;

            // Find temperature column
            let tempVal = row['Temperatura 1'] || row['temperatura'] || row['TEMPERATURA'] || row['temp'];
            if (typeof tempVal === 'string') {
              tempVal = parseFloat(tempVal.replace(/[°º]/g, '').replace(',', '.'));
            }
            if (typeof tempVal === 'number') {
              records.push({ timestamp, temperatura: tempVal });
            }
          }

          if (records.length > 0) {
            if (!telemetryByPlaca[placa]) {
              telemetryByPlaca[placa] = [];
            }
            telemetryByPlaca[placa].push(...records);
          }
        } catch (e) {
          console.error(`Erro ao processar ${filename}:`, e);
        }
      }

      // Analyze each journey
      const analysisResults: AnalysisResult[] = [];

      for (const journey of masterData) {
        const placa = journey['PlacaCavalo'] || journey['placa_cavalo'];
        const carreta = journey['PlacaCarreta'] || journey['placa_carreta'];
        const origem = journey['Origem'] || journey['origem'];
        const destino = journey['Destino'] || journey['destino'];
        const inicioVal = journey['Inicio Viagem'] || journey['inicio_viagem'];
        const fimVal = journey['Fim Viagem'] || journey['fim_viagem'];
        const faixa = journey['Faixa de Temperatura cadastrada Autorização embarque'] || journey['faixa'];

        if (!placa || !carreta || !inicioVal || !fimVal) continue;

        const inicio = parseFlexDate(inicioVal);
        const fim = parseFlexDate(fimVal);
        if (!inicio || !fim) continue;

        // Get telemetry for this placa
        const telemetry = telemetryByPlaca[placa] || [];

        let analysis;
        if (telemetry.length === 0) {
          analysis = {
            eficiencia: 0,
            status: 'S/ ARQUIVO' as const,
            tempoWithin: 0,
            tempoTotal: 0,
            tempMedia: 0,
            tempMin: 0,
            tempMax: 0,
          };
        } else {
          analysis = analyzeTrip(inicio, fim, faixa || '', telemetry);
        }

        analysisResults.push({
          placa,
          carreta,
          origem,
          destino,
          inicio,
          fim,
          faixa: faixa || 'N/A',
          tempMedia: analysis.tempMedia,
          tempMin: analysis.tempMin,
          tempMax: analysis.tempMax,
          eficiencia: analysis.eficiencia,
          status: analysis.status,
          tempoWithin: analysis.tempoWithin,
          tempoTotal: analysis.tempoTotal,
          registros: telemetry.length,
        });
      }

      setResults(analysisResults);

      // Calculate KPIs
      if (analysisResults.length > 0) {
        const withinCount = analysisResults.filter((r) => r.status === 'within').length;
        const partialCount = analysisResults.filter((r) => r.status === 'partial').length;
        const outsideCount = analysisResults.filter((r) => r.status === 'outside').length;
        const avgEfficiency =
          analysisResults.filter((r) => r.status !== 'S/ ARQUIVO' && r.status !== 'S/ DADOS' && r.status !== 'S/ FAIXA').reduce((sum, r) => sum + r.eficiencia, 0) /
          analysisResults.filter((r) => r.status !== 'S/ ARQUIVO' && r.status !== 'S/ DADOS' && r.status !== 'S/ FAIXA').length;

        setKpis([
          {
            label: 'Total de Viagens',
            value: analysisResults.length,
            color: 'bg-blue-500',
          },
          {
            label: 'Viagens Within',
            value: withinCount,
            unit: `(${((withinCount / analysisResults.length) * 100).toFixed(1)}%)`,
            color: 'bg-green-500',
          },
          {
            label: 'Viagens Partial',
            value: partialCount,
            unit: `(${((partialCount / analysisResults.length) * 100).toFixed(1)}%)`,
            color: 'bg-yellow-500',
          },
          {
            label: 'Eficiência Média',
            value: avgEfficiency.toFixed(1),
            unit: '%',
            color: 'bg-purple-500',
          },
        ]);
      }
    } catch (error) {
      console.error('Erro na análise:', error);
      alert('Erro ao analisar dados: ' + (error instanceof Error ? error.message : 'Desconhecido'));
    } finally {
      setIsAnalyzing(false);
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
      Início: r.inicio.toLocaleString('pt-BR'),
      Fim: r.fim.toLocaleString('pt-BR'),
      Faixa: r.faixa,
      'Temp. Média': r.tempMedia.toFixed(1),
      'Temp. Mín': r.tempMin.toFixed(1),
      'Temp. Máx': r.tempMax.toFixed(1),
      Eficiência: r.eficiencia.toFixed(1),
      Status: r.status,
      Registros: r.registros,
    }));

    const wb = XLSX.utils.book_new();
    const ws = XLSX.utils.json_to_sheet(exportData);
    XLSX.utils.book_append_sheet(wb, ws, 'Análise GIF BRF');
    XLSX.writeFile(wb, `analise_gif_brf_${new Date().toISOString().split('T')[0]}.xlsx`);
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Análise GIF BRF</h1>
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
            disabled={isAnalyzing}
          />

          <DropZone
            icon={<Package className="w-8 h-8" />}
            title="ZIP de Telemetria"
            subtitle="Arquivo ZIP com dados de temperatura"
            accept=".zip"
            onFile={setReportsZip}
            file={reportsZip}
            disabled={isAnalyzing}
          />

          <DropZone
            icon={<FileSpreadsheet className="w-8 h-8" />}
            title="Planilha do Cliente (Opcional)"
            subtitle="Arquivo Excel com eficiência do cliente"
            accept=".xlsx,.xls"
            onFile={setClientFile}
            file={clientFile}
            disabled={isAnalyzing}
          />

          <Button onClick={handleAnalyze} disabled={!masterFile || !reportsZip || isAnalyzing} className="w-full" size="lg">
            {isAnalyzing ? 'Analisando...' : 'Analisar Dados'}
          </Button>
        </CardContent>
      </Card>

      {/* KPIs Section */}
      {kpis.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {kpis.map((kpi, idx) => (
            <Card key={idx}>
              <CardContent className="pt-6">
                <div className="space-y-2">
                  <p className="text-sm font-medium text-muted-foreground">{kpi.label}</p>
                  <div className="flex items-baseline gap-2">
                    <span className="text-2xl font-bold">{kpi.value}</span>
                    {kpi.unit && <span className="text-sm text-muted-foreground">{kpi.unit}</span>}
                  </div>
                  <div className={`h-1 w-full ${kpi.color} rounded-full opacity-50`} />
                </div>
              </CardContent>
            </Card>
          ))}
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
                      <td className="py-3 px-4">{result.tempMedia.toFixed(1)}°C</td>
                      <td className="py-3 px-4">
                        <span
                          className={`px-2 py-1 rounded text-xs font-semibold ${
                            result.status === 'within'
                              ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200'
                              : result.status === 'partial'
                              ? 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200'
                              : result.status === 'outside'
                              ? 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200'
                              : 'bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-200'
                          }`}
                        >
                          {result.eficiencia.toFixed(1)}%
                        </span>
                      </td>
                      <td className="py-3 px-4 text-xs">{result.status}</td>
                      <td className="py-3 px-4">{result.registros}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Temperature Chart Dialog */}
      <Dialog open={showTemperatureChart} onOpenChange={setShowTemperatureChart}>
        <DialogContent className="max-w-4xl">
          <DialogHeader>
            <DialogTitle>Gráfico de Temperatura - {selectedResult?.placa}</DialogTitle>
          </DialogHeader>
          {temperatureData.length > 0 && (
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={temperatureData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="tempo" />
                <YAxis />
                <Tooltip />
                <Legend />
                <Line type="monotone" dataKey="temperatura" stroke="#ff7300" name="Temperatura (°C)" />
              </LineChart>
            </ResponsiveContainer>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
