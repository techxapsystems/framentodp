import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { DropZone } from '@/components/DropZone';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { FileSpreadsheet, Package, Download, TrendingUp } from 'lucide-react';
import * as XLSX from 'xlsx';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';

interface KPI {
  label: string;
  value: string | number;
  unit?: string;
  color: string;
}

interface AnalysisResult {
  viagem: string;
  tempMedia: number;
  tempMin: number;
  tempMax: number;
  eficiencia: string;
  duracao: number;
}

interface TemperatureDataPoint {
  tempo: string;
  temperatura: number;
  umidade: number;
}

export default function AnaliseGifBrf() {
  const [masterFile, setMasterFile] = useState<File | undefined>(undefined);
  const [reportsZip, setReportsZip] = useState<File | undefined>(undefined);
  const [clientFile, setClientFile] = useState<File | undefined>(undefined);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [results, setResults] = useState<AnalysisResult[]>([]);
  const [kpis, setKpis] = useState<KPI[]>([]);
  const [showTemperatureChart, setShowTemperatureChart] = useState(false);
  const [selectedViajem, setSelectedViajem] = useState<AnalysisResult | null>(null);
  const [temperatureData, setTemperatureData] = useState<TemperatureDataPoint[]>([]);

  const handleAnalyze = async () => {
    if (!masterFile || !reportsZip) {
      alert('Por favor, selecione a Planilha Mestre e o ZIP de Relatórios');
      return;
    }

    setIsAnalyzing(true);
    try {
      // Simular análise - em produção, isso seria enviado para o servidor
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      // Mock data para demonstração
      const mockResults: AnalysisResult[] = [
        {
          viagem: 'Viagem 001',
          tempMedia: 32.5,
          tempMin: 28.0,
          tempMax: 38.2,
          eficiencia: 'Excelente',
          duracao: 4.5,
        },
        {
          viagem: 'Viagem 002',
          tempMedia: 35.2,
          tempMin: 30.1,
          tempMax: 41.5,
          eficiencia: 'Bom',
          duracao: 5.2,
        },
        {
          viagem: 'Viagem 003',
          tempMedia: 38.9,
          tempMin: 32.5,
          tempMax: 45.3,
          eficiencia: 'Regular',
          duracao: 6.1,
        },
      ];

      setResults(mockResults);

      // Calcular KPIs
      const avgTemp = mockResults.reduce((sum, r) => sum + r.tempMedia, 0) / mockResults.length;
      const excellentCount = mockResults.filter(r => r.eficiencia === 'Excelente').length;
      const goodCount = mockResults.filter(r => r.eficiencia === 'Bom').length;

      setKpis([
        {
          label: 'Temperatura Média',
          value: avgTemp.toFixed(1),
          unit: '°C',
          color: 'bg-blue-500',
        },
        {
          label: 'Viagens Excelentes',
          value: excellentCount,
          unit: 'de ' + mockResults.length,
          color: 'bg-green-500',
        },
        {
          label: 'Viagens Boas',
          value: goodCount,
          unit: 'de ' + mockResults.length,
          color: 'bg-yellow-500',
        },
        {
          label: 'Taxa de Eficiência',
          value: (((excellentCount + goodCount) / mockResults.length) * 100).toFixed(0),
          unit: '%',
          color: 'bg-purple-500',
        },
      ]);
    } catch (error) {
      console.error('Erro na análise:', error);
      alert('Erro ao analisar dados');
    } finally {
      setIsAnalyzing(false);
    }
  };

  const handleExportExcel = () => {
    if (results.length === 0) {
      alert('Nenhum resultado para exportar');
      return;
    }

    const wb = XLSX.utils.book_new();
    const ws = XLSX.utils.json_to_sheet(results);
    XLSX.utils.book_append_sheet(wb, ws, 'Análise GIF BRF');
    XLSX.writeFile(wb, 'analise_gif_brf.xlsx');
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Análise GIF BRF</h1>
        <p className="text-muted-foreground mt-2">
          Análise de eficiência térmica de viagens
        </p>
      </div>

      {/* Upload Section */}
      <Card>
        <CardHeader>
          <CardTitle>Carregar Dados</CardTitle>
          <CardDescription>
            Selecione os arquivos para análise de eficiência térmica
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <DropZone
            icon={<FileSpreadsheet className="w-8 h-8" />}
            title="Planilha Mestre"
            subtitle="Arquivo Excel com dados mestres"
            accept=".xlsx,.xls"
            onFile={setMasterFile}
            file={masterFile}
            disabled={isAnalyzing}
          />

          <DropZone
            icon={<Package className="w-8 h-8" />}
            title="ZIP de Relatórios"
            subtitle="Arquivo ZIP com relatórios de temperatura"
            accept=".zip"
            onFile={setReportsZip}
            file={reportsZip}
            disabled={isAnalyzing}
          />

          <DropZone
            icon={<FileSpreadsheet className="w-8 h-8" />}
            title="Planilha do Cliente (Opcional)"
            subtitle="Arquivo Excel com dados adicionais"
            accept=".xlsx,.xls"
            onFile={setClientFile}
            file={clientFile}
            disabled={isAnalyzing}
          />

          <Button
            onClick={handleAnalyze}
            disabled={!masterFile || !reportsZip || isAnalyzing}
            className="w-full"
            size="lg"
          >
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
                  {results.length} viagens analisadas
                </CardDescription>
              </div>
              <Button
                onClick={handleExportExcel}
                variant="outline"
                size="sm"
              >
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
                    <th className="text-left py-3 px-4 font-semibold">Viagem</th>
                    <th className="text-left py-3 px-4 font-semibold">Temp. Média</th>
                    <th className="text-left py-3 px-4 font-semibold">Temp. Mín</th>
                    <th className="text-left py-3 px-4 font-semibold">Temp. Máx</th>
                    <th className="text-left py-3 px-4 font-semibold">Eficiência</th>
                    <th className="text-left py-3 px-4 font-semibold">Duração (h)</th>
                    <th className="text-left py-3 px-4 font-semibold">Análise</th>
                  </tr>
                </thead>
                <tbody>
                  {results.map((result, idx) => (
                    <tr key={idx} className="border-b hover:bg-secondary/50">
                      <td className="py-3 px-4">{result.viagem}</td>
                      <td className="py-3 px-4">{result.tempMedia.toFixed(1)}°C</td>
                      <td className="py-3 px-4">{result.tempMin.toFixed(1)}°C</td>
                      <td className="py-3 px-4">{result.tempMax.toFixed(1)}°C</td>
                      <td className="py-3 px-4">
                        <span
                          className={`px-2 py-1 rounded text-xs font-semibold ${
                            result.eficiencia === 'Excelente'
                              ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200'
                              : result.eficiencia === 'Bom'
                              ? 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200'
                              : 'bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-200'
                          }`}
                        >
                          {result.eficiencia}
                        </span>
                      </td>
                      <td className="py-3 px-4">{result.duracao.toFixed(1)}</td>
                      <td className="py-3 px-4">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => {
                            setSelectedViajem(result);
                            // Gerar dados fictícios de temperatura
                            const chartData: TemperatureDataPoint[] = [];
                            const startTemp = result.tempMin;
                            const tempRange = result.tempMax - result.tempMin;
                            const steps = Math.floor(result.duracao * 12); // 5 minutos por ponto
                            
                            for (let i = 0; i < steps; i++) {
                              const progress = i / (steps - 1);
                              const sine = Math.sin(progress * Math.PI * 2);
                              const temp = startTemp + (tempRange / 2) + (tempRange / 2) * sine * 0.8 + (Math.random() - 0.5) * 2;
                              const humidity = 60 + Math.sin(progress * Math.PI) * 20 + (Math.random() - 0.5) * 5;
                              const hours = Math.floor((i * 5) / 60);
                              const minutes = (i * 5) % 60;
                              chartData.push({
                                tempo: `${hours}:${minutes.toString().padStart(2, '0')}`,
                                temperatura: parseFloat(temp.toFixed(1)),
                                umidade: parseFloat(humidity.toFixed(1)),
                              });
                            }
                            setTemperatureData(chartData);
                            setShowTemperatureChart(true);
                          }}
                          className="gap-2"
                        >
                          <TrendingUp className="w-4 h-4" />
                          Gráfico
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

      {/* Empty State */}
      {results.length === 0 && (
        <Card>
          <CardContent className="pt-12 text-center">
            <div className="space-y-2">
              <p className="text-muted-foreground">
                Carregue os arquivos e clique em "Analisar Dados" para começar
              </p>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Temperature Chart Dialog */}
      <Dialog open={showTemperatureChart} onOpenChange={setShowTemperatureChart}>
        <DialogContent className="max-w-4xl">
          <DialogHeader>
            <DialogTitle>
              Analise de Temperatura - {selectedViajem?.viagem}
            </DialogTitle>
          </DialogHeader>
          {selectedViajem && temperatureData.length > 0 && (
            <div className="space-y-6">
              {/* Resumo */}
              <div className="grid grid-cols-4 gap-4">
                <div className="bg-blue-50 dark:bg-blue-900/20 p-3 rounded-lg">
                  <p className="text-sm text-gray-600 dark:text-gray-400">Temp. Media</p>
                  <p className="text-xl font-bold">{selectedViajem.tempMedia.toFixed(1)}°C</p>
                </div>
                <div className="bg-green-50 dark:bg-green-900/20 p-3 rounded-lg">
                  <p className="text-sm text-gray-600 dark:text-gray-400">Temp. Min</p>
                  <p className="text-xl font-bold">{selectedViajem.tempMin.toFixed(1)}°C</p>
                </div>
                <div className="bg-red-50 dark:bg-red-900/20 p-3 rounded-lg">
                  <p className="text-sm text-gray-600 dark:text-gray-400">Temp. Max</p>
                  <p className="text-xl font-bold">{selectedViajem.tempMax.toFixed(1)}°C</p>
                </div>
                <div className="bg-purple-50 dark:bg-purple-900/20 p-3 rounded-lg">
                  <p className="text-sm text-gray-600 dark:text-gray-400">Duracao</p>
                  <p className="text-xl font-bold">{selectedViajem.duracao.toFixed(1)}h</p>
                </div>
              </div>

              {/* Grafico de Temperatura */}
              <div className="bg-gray-50 dark:bg-gray-900/20 p-4 rounded-lg">
                <h3 className="text-sm font-semibold mb-4">Evolucao de Temperatura e Umidade</h3>
                <ResponsiveContainer width="100%" height={400}>
                  <LineChart data={temperatureData}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis 
                      dataKey="tempo" 
                      angle={-45} 
                      textAnchor="end" 
                      height={80}
                      tick={{ fontSize: 12 }}
                    />
                    <YAxis yAxisId="left" label={{ value: 'Temperatura (°C)', angle: -90, position: 'insideLeft' }} />
                    <YAxis 
                      yAxisId="right" 
                      orientation="right" 
                      label={{ value: 'Umidade (%)', angle: 90, position: 'insideRight' }} 
                    />
                    <Tooltip 
                      formatter={(value: any) => value.toFixed(1)}
                      labelFormatter={(label) => `Tempo: ${label}`}
                    />
                    <Legend />
                    <Line 
                      yAxisId="left"
                      type="monotone" 
                      dataKey="temperatura" 
                      stroke="#ef4444" 
                      name="Temperatura (°C)"
                      dot={false}
                      isAnimationActive={false}
                    />
                    <Line 
                      yAxisId="right"
                      type="monotone" 
                      dataKey="umidade" 
                      stroke="#3b82f6" 
                      name="Umidade (%)"
                      dot={false}
                      isAnimationActive={false}
                    />
                  </LineChart>
                </ResponsiveContainer>
              </div>

              {/* Detalhes */}
              <div className="bg-gray-50 dark:bg-gray-900/20 p-4 rounded-lg">
                <h3 className="text-sm font-semibold mb-3">Detalhes da Viagem</h3>
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <p className="text-gray-600 dark:text-gray-400">Eficiencia</p>
                    <p className="font-semibold">{selectedViajem.eficiencia}</p>
                  </div>
                  <div>
                    <p className="text-gray-600 dark:text-gray-400">Pontos de Dados</p>
                    <p className="font-semibold">{temperatureData.length}</p>
                  </div>
                  <div>
                    <p className="text-gray-600 dark:text-gray-400">Variacao de Temperatura</p>
                    <p className="font-semibold">{(selectedViajem.tempMax - selectedViajem.tempMin).toFixed(1)}°C</p>
                  </div>
                  <div>
                    <p className="text-gray-600 dark:text-gray-400">Intervalo de Medicao</p>
                    <p className="font-semibold">5 minutos</p>
                  </div>
                </div>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
