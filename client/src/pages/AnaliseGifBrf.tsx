import React, { useState, useRef } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { DropZone } from '@/components/DropZone';
import { FileSpreadsheet, Package, Download } from 'lucide-react';
import * as XLSX from 'xlsx';

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

export function AnaliseGifBrf() {
  const [masterFile, setMasterFile] = useState<File | null>(null);
  const [reportsZip, setReportsZip] = useState<File | null>(null);
  const [clientFile, setClientFile] = useState<File | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [results, setResults] = useState<AnalysisResult[]>([]);
  const [kpis, setKpis] = useState<KPI[]>([]);

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
    </div>
  );
}
