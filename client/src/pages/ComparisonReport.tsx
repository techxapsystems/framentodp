import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, ScatterChart, Scatter } from 'recharts';
import { Download, TrendingUp, AlertCircle } from 'lucide-react';
import * as XLSX from 'xlsx';

interface ComparisonData {
  placa: string;
  brfEfficiency: number;
  systemEfficiency: number;
  difference: number;
  percentDifference: number;
  status: 'match' | 'higher' | 'lower';
}

interface ComparisonStats {
  totalTrips: number;
  perfectMatch: number;
  systemHigher: number;
  brfHigher: number;
  avgDifference: number;
  maxDifference: number;
  minDifference: number;
  correlationCoefficient: number;
}

export default function ComparisonReport() {
  const [comparisonData, setComparisonData] = useState<ComparisonData[]>([]);
  const [stats, setStats] = useState<ComparisonStats | null>(null);
  const [showChart, setShowChart] = useState(false);

  // Calculate comparison statistics
  const calculateStats = (data: ComparisonData[]): ComparisonStats => {
    if (data.length === 0) {
      return {
        totalTrips: 0,
        perfectMatch: 0,
        systemHigher: 0,
        brfHigher: 0,
        avgDifference: 0,
        maxDifference: 0,
        minDifference: 0,
        correlationCoefficient: 0,
      };
    }

    const perfectMatch = data.filter(d => Math.abs(d.difference) < 1).length;
    const systemHigher = data.filter(d => d.difference > 1).length;
    const brfHigher = data.filter(d => d.difference < -1).length;

    const differences = data.map(d => Math.abs(d.difference));
    const avgDifference = differences.reduce((a, b) => a + b, 0) / data.length;
    const maxDifference = Math.max(...differences);
    const minDifference = Math.min(...differences);

    // Calculate Pearson correlation coefficient
    const brfValues = data.map(d => d.brfEfficiency);
    const systemValues = data.map(d => d.systemEfficiency);
    
    const brfMean = brfValues.reduce((a, b) => a + b, 0) / data.length;
    const systemMean = systemValues.reduce((a, b) => a + b, 0) / data.length;

    let numerator = 0;
    let brfDenom = 0;
    let systemDenom = 0;

    for (let i = 0; i < data.length; i++) {
      const brfDiff = brfValues[i] - brfMean;
      const systemDiff = systemValues[i] - systemMean;
      numerator += brfDiff * systemDiff;
      brfDenom += brfDiff * brfDiff;
      systemDenom += systemDiff * systemDiff;
    }

    const correlationCoefficient = numerator / Math.sqrt(brfDenom * systemDenom);

    return {
      totalTrips: data.length,
      perfectMatch,
      systemHigher,
      brfHigher,
      avgDifference: Math.round(avgDifference * 100) / 100,
      maxDifference: Math.round(maxDifference * 100) / 100,
      minDifference: Math.round(minDifference * 100) / 100,
      correlationCoefficient: Math.round(correlationCoefficient * 10000) / 10000,
    };
  };

  // Mock data for demonstration
  const mockData: ComparisonData[] = [
    {
      placa: 'ABC1234',
      brfEfficiency: 85,
      systemEfficiency: 87,
      difference: 2,
      percentDifference: 2.35,
      status: 'higher',
    },
    {
      placa: 'XYZ5678',
      brfEfficiency: 92,
      systemEfficiency: 91,
      difference: -1,
      percentDifference: -1.09,
      status: 'lower',
    },
    {
      placa: 'DEF9012',
      brfEfficiency: 78,
      systemEfficiency: 78,
      difference: 0,
      percentDifference: 0,
      status: 'match',
    },
  ];

  const handleLoadComparison = () => {
    setComparisonData(mockData);
    const calculatedStats = calculateStats(mockData);
    setStats(calculatedStats);
    setShowChart(true);
  };

  const handleExportReport = () => {
    if (comparisonData.length === 0) return;

    const exportData = comparisonData.map(d => ({
      'Placa': d.placa,
      'Eficiência BRF (%)': d.brfEfficiency,
      'Eficiência Sistema (%)': d.systemEfficiency,
      'Diferença (%)': d.difference,
      '% Diferença': d.percentDifference.toFixed(2),
      'Status': d.status === 'match' ? 'Coincide' : d.status === 'higher' ? 'Sistema Maior' : 'BRF Maior',
    }));

    const wb = XLSX.utils.book_new();
    const ws = XLSX.utils.json_to_sheet(exportData);
    ws['!cols'] = [
      { wch: 15 },
      { wch: 18 },
      { wch: 18 },
      { wch: 15 },
      { wch: 15 },
      { wch: 18 },
    ];
    XLSX.utils.book_append_sheet(wb, ws, 'Comparação');
    XLSX.writeFile(wb, `Comparacao_Eficiencia_${new Date().toISOString().split('T')[0]}.xlsx`);
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Relatório Comparativo de Eficiência</h1>
        <p className="text-muted-foreground mt-2">Compare a eficiência calculada pelo sistema com a EFICIÊNCIA_FINAL da BRF</p>
      </div>

      {/* Control Section */}
      <Card>
        <CardHeader>
          <CardTitle>Carregar Dados</CardTitle>
          <CardDescription>Carregue os dados de comparação entre BRF e Sistema</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <Button onClick={handleLoadComparison} className="w-full">
            Carregar Dados de Comparação
          </Button>
        </CardContent>
      </Card>

      {/* Statistics Section */}
      {stats && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <Card>
            <CardContent className="pt-6">
              <div className="space-y-2">
                <p className="text-sm font-medium text-muted-foreground">Total de Viagens</p>
                <p className="text-2xl font-bold">{stats.totalTrips}</p>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-6">
              <div className="space-y-2">
                <p className="text-sm font-medium text-muted-foreground">Coincidência Perfeita</p>
                <p className="text-2xl font-bold text-green-600">{stats.perfectMatch}</p>
                <p className="text-xs text-muted-foreground">({stats.totalTrips > 0 ? ((stats.perfectMatch / stats.totalTrips) * 100).toFixed(1) : '0'}%)</p>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-6">
              <div className="space-y-2">
                <p className="text-sm font-medium text-muted-foreground">Diferença Média</p>
                <p className="text-2xl font-bold">{stats.avgDifference}%</p>
                <p className="text-xs text-muted-foreground">Valor absoluto</p>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-6">
              <div className="space-y-2">
                <p className="text-sm font-medium text-muted-foreground">Correlação</p>
                <p className="text-2xl font-bold">{stats.correlationCoefficient}</p>
                <p className="text-xs text-muted-foreground">Coeficiente de Pearson</p>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Detailed Statistics */}
      {stats && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <TrendingUp className="w-5 h-5" />
              Análise Detalhada
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="p-4 bg-blue-50 dark:bg-blue-950/20 rounded-lg border border-blue-200 dark:border-blue-800">
                <p className="text-sm font-medium text-blue-900 dark:text-blue-200">Sistema com Eficiência Maior</p>
                <p className="text-2xl font-bold text-blue-600">{stats.systemHigher}</p>
                <p className="text-xs text-blue-700 dark:text-blue-300 mt-1">
                  {stats.totalTrips > 0 ? ((stats.systemHigher / stats.totalTrips) * 100).toFixed(1) : '0'}% das viagens
                </p>
              </div>

              <div className="p-4 bg-orange-50 dark:bg-orange-950/20 rounded-lg border border-orange-200 dark:border-orange-800">
                <p className="text-sm font-medium text-orange-900 dark:text-orange-200">BRF com Eficiência Maior</p>
                <p className="text-2xl font-bold text-orange-600">{stats.brfHigher}</p>
                <p className="text-xs text-orange-700 dark:text-orange-300 mt-1">
                  {stats.totalTrips > 0 ? ((stats.brfHigher / stats.totalTrips) * 100).toFixed(1) : '0'}% das viagens
                </p>
              </div>

              <div className="p-4 bg-purple-50 dark:bg-purple-950/20 rounded-lg border border-purple-200 dark:border-purple-800">
                <p className="text-sm font-medium text-purple-900 dark:text-purple-200">Variação Máxima</p>
                <p className="text-2xl font-bold text-purple-600">{stats.maxDifference}%</p>
                <p className="text-xs text-purple-700 dark:text-purple-300 mt-1">
                  Mínima: {stats.minDifference}%
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Charts Section */}
      {showChart && comparisonData.length > 0 && (
        <>
          {/* Bar Chart */}
          <Card>
            <CardHeader>
              <CardTitle>Comparação por Placa</CardTitle>
              <CardDescription>Eficiência BRF vs Eficiência do Sistema</CardDescription>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={comparisonData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="placa" />
                  <YAxis />
                  <Tooltip />
                  <Legend />
                  <Bar dataKey="brfEfficiency" fill="#8b5cf6" name="Eficiência BRF (%)" />
                  <Bar dataKey="systemEfficiency" fill="#3b82f6" name="Eficiência Sistema (%)" />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          {/* Scatter Chart */}
          <Card>
            <CardHeader>
              <CardTitle>Dispersão de Valores</CardTitle>
              <CardDescription>Relação entre BRF e Sistema</CardDescription>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={300}>
                <ScatterChart margin={{ top: 20, right: 20, bottom: 20, left: 20 }}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="brfEfficiency" name="Eficiência BRF (%)" />
                  <YAxis dataKey="systemEfficiency" name="Eficiência Sistema (%)" />
                  <Tooltip cursor={{ strokeDasharray: '3 3' }} />
                  <Scatter name="Viagens" data={comparisonData} fill="#8b5cf6" />
                </ScatterChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </>
      )}

      {/* Data Table */}
      {comparisonData.length > 0 && (
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle>Dados Detalhados</CardTitle>
                <CardDescription>Lista completa de comparações</CardDescription>
              </div>
              <Button onClick={handleExportReport} variant="outline" size="sm">
                <Download className="w-4 h-4 mr-2" />
                Exportar
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="border-b">
                  <tr>
                    <th className="text-left py-2 px-4">Placa</th>
                    <th className="text-right py-2 px-4">BRF (%)</th>
                    <th className="text-right py-2 px-4">Sistema (%)</th>
                    <th className="text-right py-2 px-4">Diferença (%)</th>
                    <th className="text-center py-2 px-4">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {comparisonData.map((row, idx) => (
                    <tr key={idx} className="border-b hover:bg-muted/50">
                      <td className="py-2 px-4 font-mono">{row.placa}</td>
                      <td className="text-right py-2 px-4">{row.brfEfficiency}</td>
                      <td className="text-right py-2 px-4">{row.systemEfficiency}</td>
                      <td className={`text-right py-2 px-4 font-medium ${row.difference > 0 ? 'text-blue-600' : row.difference < 0 ? 'text-orange-600' : 'text-green-600'}`}>
                        {row.difference > 0 ? '+' : ''}{row.difference.toFixed(2)}
                      </td>
                      <td className="text-center py-2 px-4">
                        {row.status === 'match' && <span className="inline-block px-2 py-1 bg-green-100 text-green-800 rounded text-xs">Coincide</span>}
                        {row.status === 'higher' && <span className="inline-block px-2 py-1 bg-blue-100 text-blue-800 rounded text-xs">Sistema +</span>}
                        {row.status === 'lower' && <span className="inline-block px-2 py-1 bg-orange-100 text-orange-800 rounded text-xs">BRF +</span>}
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
      {comparisonData.length === 0 && (
        <Card className="border-dashed">
          <CardContent className="pt-12 pb-12 text-center">
            <AlertCircle className="w-12 h-12 mx-auto mb-4 text-muted-foreground" />
            <p className="text-muted-foreground mb-4">Nenhum dado carregado</p>
            <p className="text-sm text-muted-foreground">Clique em "Carregar Dados de Comparação" para começar</p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
