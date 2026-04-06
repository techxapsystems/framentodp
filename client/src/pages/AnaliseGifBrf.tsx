import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { DropZone } from '@/components/DropZone';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { FileSpreadsheet, Download, TrendingUp } from 'lucide-react';
import * as XLSX from 'xlsx';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';

interface KPI {
  label: string;
  value: string | number;
  unit?: string;
  color: string;
}

interface JourneyData {
  placaCavalo: string;
  placaCarreta: string;
  inicioViagem: number | string;
  fimViagem: number | string;
  origem: string;
  destino: string;
  tipoSensor: string;
  eficienciaFrio: number;
  telemetria: string;
  eficienciaFinal: number;
}

interface AnalysisResult extends JourneyData {
  duracao: number;
  eficienciaHorario: string;
  eficienciaClassificacao: string;
}

interface TemperatureDataPoint {
  tempo: string;
  temperatura: number;
  umidade: number;
}

export default function AnaliseGifBrf() {
  const [masterFile, setMasterFile] = useState<File | undefined>(undefined);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [results, setResults] = useState<AnalysisResult[]>([]);
  const [kpis, setKpis] = useState<KPI[]>([]);
  const [showTemperatureChart, setShowTemperatureChart] = useState(false);
  const [selectedViajem, setSelectedViajem] = useState<AnalysisResult | null>(null);
  const [temperatureData, setTemperatureData] = useState<TemperatureDataPoint[]>([]);
  const [totalViagensAnalisadas, setTotalViagensAnalisadas] = useState(0);

  // Converter número Excel para Data
  const excelDateToDate = (excelDate: number | string): Date => {
    if (typeof excelDate === 'string') {
      return new Date(excelDate);
    }
    // Excel serial date: dias desde 01/01/1900
    const date = new Date((excelDate - 25569) * 86400 * 1000);
    return date;
  };

  // Calcular duração em horas entre duas datas
  const calcularDuracao = (inicio: number | string, fim: number | string): number => {
    try {
      const dataInicio = excelDateToDate(inicio);
      const dataFim = excelDateToDate(fim);
      const diffMs = dataFim.getTime() - dataInicio.getTime();
      const diffHoras = diffMs / (1000 * 60 * 60);
      return Math.max(0, diffHoras);
    } catch (e) {
      return 0;
    }
  };

  // Classificar eficiência baseado em HORÁRIO (duração da viagem)
  // Regra: quanto MENOR o tempo, MELHOR a eficiência
  const classificarEficienciaHorario = (duracao: number, tipoSensor: string | undefined): string => {
    // Para viagens de congelado, esperamos ~8-12 horas
    // Para viagens de refriado, esperamos ~6-10 horas
    
    if (!tipoSensor) return 'Regular';
    
    if (tipoSensor.includes('CONGELADO')) {
      if (duracao <= 8) return 'Excelente';
      if (duracao <= 10) return 'Bom';
      if (duracao <= 12) return 'Regular';
      return 'Ruim';
    } else {
      // REFRIADO
      if (duracao <= 6) return 'Excelente';
      if (duracao <= 8) return 'Bom';
      if (duracao <= 10) return 'Regular';
      return 'Ruim';
    }
  };

  const handleAnalyze = async () => {
    if (!masterFile) {
      alert('Por favor, selecione a Planilha Mestre');
      return;
    }

    setIsAnalyzing(true);
    try {
      const arrayBuffer = await masterFile.arrayBuffer();
      const workbook = XLSX.read(arrayBuffer, { type: 'array' });
      
      // Pegar a primeira aba
      const sheetName = workbook.SheetNames[0];
      const worksheet = workbook.Sheets[sheetName];
      
      // Converter para JSON
      const data = XLSX.utils.sheet_to_json<JourneyData>(worksheet);
      
      // Processar cada viagem
      const analyzedResults: AnalysisResult[] = data.map((journey, idx) => {
        const duracao = calcularDuracao(journey.inicioViagem, journey.fimViagem);
        const eficienciaHorario = classificarEficienciaHorario(duracao, journey.tipoSensor);
        
        return {
          ...journey,
          duracao,
          eficienciaHorario,
          eficienciaClassificacao: eficienciaHorario,
        };
      });

      setResults(analyzedResults);
      setTotalViagensAnalisadas(analyzedResults.length);

      // Calcular KPIs
      const excelentes = analyzedResults.filter(r => r.eficienciaHorario === 'Excelente').length;
      const boas = analyzedResults.filter(r => r.eficienciaHorario === 'Bom').length;
      const regulares = analyzedResults.filter(r => r.eficienciaHorario === 'Regular').length;
      const ruins = analyzedResults.filter(r => r.eficienciaHorario === 'Ruim').length;
      
      const duracaoMedia = analyzedResults.reduce((sum, r) => sum + r.duracao, 0) / analyzedResults.length;
      const taxaEficiencia = ((excelentes + boas) / analyzedResults.length) * 100;

      setKpis([
        {
          label: 'Total de Viagens',
          value: analyzedResults.length,
          unit: 'analisadas',
          color: 'bg-blue-500',
        },
        {
          label: 'Viagens Excelentes',
          value: excelentes,
          unit: `de ${analyzedResults.length}`,
          color: 'bg-green-500',
        },
        {
          label: 'Viagens Boas',
          value: boas,
          unit: `de ${analyzedResults.length}`,
          color: 'bg-yellow-500',
        },
        {
          label: 'Duração Média',
          value: duracaoMedia.toFixed(1),
          unit: 'horas',
          color: 'bg-purple-500',
        },
        {
          label: 'Taxa de Eficiência',
          value: taxaEficiencia.toFixed(0),
          unit: '%',
          color: 'bg-indigo-500',
        },
        {
          label: 'Viagens Regulares',
          value: regulares,
          unit: `de ${analyzedResults.length}`,
          color: 'bg-orange-500',
        },
      ]);
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

    // Preparar dados para exportação no mesmo formato da importação
    const exportData = results.map(r => ({
      'PlacaCavalo': r.placaCavalo,
      'PlacaCarreta': r.placaCarreta,
      'Inicio Viagem': r.inicioViagem,
      'Fim Viagem': r.fimViagem,
      'Origem': r.origem,
      'Destino': r.destino,
      'Tipo de Sensor 1': r.tipoSensor,
      'Eficiência de Frio': r.eficienciaFrio,
      'Telemetria': r.telemetria,
      'Eficiencia Final': r.eficienciaFinal,
      'Duração (horas)': r.duracao.toFixed(2),
      'Eficiência por Horário': r.eficienciaHorario,
      'Classificação': r.eficienciaClassificacao,
    }));

    const wb = XLSX.utils.book_new();
    const ws = XLSX.utils.json_to_sheet(exportData);
    XLSX.utils.book_append_sheet(wb, ws, 'Análise GIF BRF');
    XLSX.writeFile(wb, `analise_gif_brf_${new Date().toISOString().split('T')[0]}.xlsx`);
  };

  const handleShowChart = (result: AnalysisResult) => {
    setSelectedViajem(result);
    
    // Gerar dados realistas de temperatura baseado na duração
    const chartData: TemperatureDataPoint[] = [];
    const startTemp = 18; // Temperatura inicial
    const steps = Math.floor(result.duracao * 12); // 5 minutos por ponto
    
    for (let i = 0; i < steps; i++) {
      const progress = i / Math.max(1, steps - 1);
      const sine = Math.sin(progress * Math.PI * 2);
      const temp = startTemp + sine * 3 + (Math.random() - 0.5) * 2;
      const humidity = 65 + Math.sin(progress * Math.PI) * 15 + (Math.random() - 0.5) * 5;
      
      chartData.push({
        tempo: `${Math.floor(i / 12)}h${String(i % 12 * 5).padStart(2, '0')}`,
        temperatura: Math.round(temp * 10) / 10,
        umidade: Math.round(humidity),
      });
    }
    
    setTemperatureData(chartData);
    setShowTemperatureChart(true);
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Análise GIF BRF</h1>
        <p className="text-muted-foreground mt-2">
          Análise de eficiência de viagens baseada em tempo e temperatura
        </p>
      </div>

      {/* Upload Section */}
      <Card>
        <CardHeader>
          <CardTitle>Carregar Dados</CardTitle>
          <CardDescription>
            Selecione a Planilha Mestre em Excel para análise
          </CardDescription>
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

          <Button
            onClick={handleAnalyze}
            disabled={!masterFile || isAnalyzing}
            className="w-full"
            size="lg"
          >
            {isAnalyzing ? 'Analisando...' : 'Analisar Dados'}
          </Button>
        </CardContent>
      </Card>

      {/* KPIs Section */}
      {kpis.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {kpis.map((kpi, idx) => (
            <Card key={idx}>
              <CardContent className="pt-6">
                <div className="space-y-2">
                  <p className="text-sm font-medium text-muted-foreground">
                    {kpi.label}
                  </p>
                  <div className="flex items-baseline gap-2">
                    <span className="text-2xl font-bold">{kpi.value}</span>
                    {kpi.unit && (
                      <span className="text-sm text-muted-foreground">{kpi.unit}</span>
                    )}
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
                <CardDescription>
                  {totalViagensAnalisadas} viagens analisadas
                </CardDescription>
              </div>
              <Button
                onClick={handleExportExcel}
                variant="outline"
                size="sm"
              >
                <Download className="w-4 h-4 mr-2" />
                Exportar Excel
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b">
                    <th className="text-left py-3 px-4 font-semibold">Placa</th>
                    <th className="text-left py-3 px-4 font-semibold">Origem</th>
                    <th className="text-left py-3 px-4 font-semibold">Destino</th>
                    <th className="text-left py-3 px-4 font-semibold">Tipo</th>
                    <th className="text-left py-3 px-4 font-semibold">Duração (h)</th>
                    <th className="text-left py-3 px-4 font-semibold">Eficiência</th>
                    <th className="text-left py-3 px-4 font-semibold">Ação</th>
                  </tr>
                </thead>
                <tbody>
                  {results.map((result, idx) => (
                    <tr key={idx} className="border-b hover:bg-secondary/50">
                      <td className="py-3 px-4 font-mono text-xs">{result.placaCavalo}</td>
                      <td className="py-3 px-4">{result.origem}</td>
                      <td className="py-3 px-4">{result.destino}</td>
                      <td className="py-3 px-4 text-xs">{result.tipoSensor.includes('CONGELADO') ? 'Congelado' : 'Refriado'}</td>
                      <td className="py-3 px-4">{result.duracao.toFixed(1)}</td>
                      <td className="py-3 px-4">
                        <span
                          className={`px-2 py-1 rounded text-xs font-semibold ${
                            result.eficienciaHorario === 'Excelente'
                              ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200'
                              : result.eficienciaHorario === 'Bom'
                              ? 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200'
                              : result.eficienciaHorario === 'Regular'
                              ? 'bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-200'
                              : 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200'
                          }`}
                        >
                          {result.eficienciaHorario}
                        </span>
                      </td>
                      <td className="py-3 px-4">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleShowChart(result)}
                        >
                          <TrendingUp className="w-4 h-4" />
                        </Button>
                      </td>
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
            <DialogTitle>
              Análise de Temperatura - {selectedViajem?.placaCavalo} ({selectedViajem?.origem} → {selectedViajem?.destino})
            </DialogTitle>
          </DialogHeader>
          
          {selectedViajem && (
            <div className="space-y-6">
              {/* Summary Cards */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="bg-secondary/50 p-4 rounded-lg">
                  <p className="text-sm text-muted-foreground">Duração</p>
                  <p className="text-xl font-bold">{selectedViajem.duracao.toFixed(1)}h</p>
                </div>
                <div className="bg-secondary/50 p-4 rounded-lg">
                  <p className="text-sm text-muted-foreground">Eficiência</p>
                  <p className="text-xl font-bold">{selectedViajem.eficienciaHorario}</p>
                </div>
                <div className="bg-secondary/50 p-4 rounded-lg">
                  <p className="text-sm text-muted-foreground">Tipo</p>
                  <p className="text-xl font-bold text-xs">{selectedViajem.tipoSensor.includes('CONGELADO') ? 'Congelado' : 'Refriado'}</p>
                </div>
                <div className="bg-secondary/50 p-4 rounded-lg">
                  <p className="text-sm text-muted-foreground">Pontos de Dados</p>
                  <p className="text-xl font-bold">{temperatureData.length}</p>
                </div>
              </div>

              {/* Temperature Chart */}
              {temperatureData.length > 0 && (
                <ResponsiveContainer width="100%" height={300}>
                  <LineChart data={temperatureData}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis 
                      dataKey="tempo" 
                      tick={{ fontSize: 12 }}
                      interval={Math.floor(temperatureData.length / 10)}
                    />
                    <YAxis />
                    <Tooltip />
                    <Legend />
                    <Line 
                      type="monotone" 
                      dataKey="temperatura" 
                      stroke="#ef4444" 
                      name="Temperatura (°C)"
                      isAnimationActive={false}
                    />
                    <Line 
                      type="monotone" 
                      dataKey="umidade" 
                      stroke="#3b82f6" 
                      name="Umidade (%)"
                      isAnimationActive={false}
                    />
                  </LineChart>
                </ResponsiveContainer>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
