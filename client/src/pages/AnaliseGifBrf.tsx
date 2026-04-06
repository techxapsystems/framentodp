import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { DropZone } from '@/components/DropZone';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { FileSpreadsheet, Package, Download, TrendingUp, AlertCircle, Zap } from 'lucide-react';
import * as XLSX from 'xlsx';
import JSZip from 'jszip';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, PieChart, Pie, Cell, BarChart, Bar } from 'recharts';

// Import TXTEMP utilities
import {
  parseFlexDate,
  parseTemperature,
  parseTemperatureRange,
  isValidPlate,
  extractPlateFromFilename,
  calculateEfficiency,
  calculateTemperatureStats,
  AnalysisResult,
  PositionRecord,
} from '@/lib/txtemp-utils';

interface MasterTrip {
  placa: string;
  carreta: string;
  origem: string;
  destino: string;
  inicioViagem: Date;
  fimViagem: Date;
  faixa: string;
  rangeMin: number | null;
  rangeMax: number | null;
}

interface KPI {
  label: string;
  value: string | number;
  unit?: string;
  color: string;
}

// ============================================================================
// MASTER FILE PARSER
// ============================================================================

function findHeaderRowInMaster(sheet: XLSX.WorkSheet, maxRows: number = 20): number {
  const range = XLSX.utils.decode_range(sheet['!ref'] || 'A1');
  const rows = Math.min(range.e.r + 1, maxRows);

  for (let row = 0; row < rows; row++) {
    let hasPlaca = false;
    let hasInicio = false;

    for (let col = 0; col <= range.e.c; col++) {
      const cellRef = XLSX.utils.encode_cell({ r: row, c: col });
      const cell = sheet[cellRef];
      if (!cell) continue;

      const value = (cell.v || '').toString().toUpperCase();
      if (value.includes('PLACA') && value.includes('CAVALO')) hasPlaca = true;
      if (value.includes('INICIO') || value.includes('INÍCIO')) hasInicio = true;
    }

    if (hasPlaca && hasInicio) {
      return row;
    }
  }

  return 0;
}

function findColumnByPatternInMaster(sheet: XLSX.WorkSheet, headerRow: number, patterns: string[]): number {
  const range = XLSX.utils.decode_range(sheet['!ref'] || 'A1');

  for (let col = 0; col <= range.e.c; col++) {
    const cellRef = XLSX.utils.encode_cell({ r: headerRow, c: col });
    const cell = sheet[cellRef];
    if (!cell) continue;

    const value = (cell.v || '').toString().toUpperCase();
    for (const pattern of patterns) {
      if (value.includes(pattern.toUpperCase())) {
        return col;
      }
    }
  }

  return -1;
}

function parseMasterFileInFrontend(fileBuffer: ArrayBuffer): MasterTrip[] {
  try {
    const workbook = XLSX.read(fileBuffer);
    const sheet = workbook.Sheets[workbook.SheetNames[0]];
    if (!sheet) return [];

    const headerRow = findHeaderRowInMaster(sheet);

    const placaCavalosCol = findColumnByPatternInMaster(sheet, headerRow, ['PLACA', 'CAVALO']);
    const placaCarretaCol = findColumnByPatternInMaster(sheet, headerRow, ['PLACA', 'CARRETA']);
    const origemCol = findColumnByPatternInMaster(sheet, headerRow, ['ORIGEM']);
    const destinoCol = findColumnByPatternInMaster(sheet, headerRow, ['DESTINO']);
    const inicioCol = findColumnByPatternInMaster(sheet, headerRow, ['INICIO', 'INÍCIO', 'VIAGEM']);
    const fimCol = findColumnByPatternInMaster(sheet, headerRow, ['FIM', 'VIAGEM']);
    const faixaCol = findColumnByPatternInMaster(sheet, headerRow, ['FAIXA', 'TEMPERATURA']);

    if (placaCavalosCol === -1 || inicioCol === -1 || fimCol === -1) {
      return [];
    }

    const trips: MasterTrip[] = [];
    const range = XLSX.utils.decode_range(sheet['!ref'] || 'A1');

    for (let row = headerRow + 1; row <= range.e.r; row++) {
      const placaRef = XLSX.utils.encode_cell({ r: row, c: placaCavalosCol });
      const placaCell = sheet[placaRef];
      const placa = (placaCell?.v || '').toString().trim().toUpperCase();

      if (!isValidPlate(placa)) {
        continue;
      }

      const inicioRef = XLSX.utils.encode_cell({ r: row, c: inicioCol });
      const fimRef = XLSX.utils.encode_cell({ r: row, c: fimCol });

      const inicioCell = sheet[inicioRef];
      const fimCell = sheet[fimRef];

      const inicioResult = parseFlexDate(inicioCell?.v);
      const fimResult = parseFlexDate(fimCell?.v);

      if (!inicioResult.valid || !inicioResult.date || !fimResult.valid || !fimResult.date) {
        continue;
      }

      let faixa = '';
      if (faixaCol !== -1) {
        const faixaRef = XLSX.utils.encode_cell({ r: row, c: faixaCol });
        const faixaCell = sheet[faixaRef];
        faixa = (faixaCell?.v || '').toString().trim();
      }

      const faixaRange = parseTemperatureRange(faixa);

      const carreta = placaCarretaCol !== -1 ? (sheet[XLSX.utils.encode_cell({ r: row, c: placaCarretaCol })]?.v || '').toString().trim() : '';
      const origem = origemCol !== -1 ? (sheet[XLSX.utils.encode_cell({ r: row, c: origemCol })]?.v || '').toString().trim() : '';
      const destino = destinoCol !== -1 ? (sheet[XLSX.utils.encode_cell({ r: row, c: destinoCol })]?.v || '').toString().trim() : '';

      trips.push({
        placa,
        carreta,
        origem,
        destino,
        inicioViagem: inicioResult.date,
        fimViagem: fimResult.date,
        faixa,
        rangeMin: faixaRange.min,
        rangeMax: faixaRange.max,
      });
    }

    trips.sort((a, b) => a.placa.localeCompare(b.placa));
    return trips;
  } catch (error) {
    console.error('Error parsing master file:', error);
    return [];
  }
}

// ============================================================================
// ZIP PROCESSOR
// ============================================================================

async function processZipFileInFrontend(zipBuffer: ArrayBuffer): Promise<{ [placa: string]: PositionRecord[] }> {
  const result: { [placa: string]: PositionRecord[] } = {};

  try {
    const zip = new JSZip();
    await zip.loadAsync(zipBuffer);

    for (const filename in zip.files) {
      const file = zip.files[filename];

      if (file.dir) continue;
      if (filename.includes('__MACOSX') || filename.startsWith('.') || filename.includes('~$')) {
        continue;
      }

      const ext = filename.toLowerCase().split('.').pop();
      if (!['xlsx', 'xls', 'csv'].includes(ext || '')) {
        continue;
      }

      const placa = extractPlateFromFilename(filename);
      if (!placa) {
        continue;
      }

      try {
        const fileBuffer = await file.async('arraybuffer');
        let records: PositionRecord[] = [];

        if (ext === 'csv') {
          // Parse CSV
          const text = new TextDecoder().decode(fileBuffer);
          const lines = text.split('\n').filter((line) => line.trim());

          if (lines.length >= 2) {
            const header = lines[0].split(',').map((h) => h.trim().toUpperCase());
            const dateColIdx = header.findIndex((h) => h.includes('DATA') || h.includes('HORA'));
            const tempColIdx = header.findIndex((h) => h.includes('TEMP'));

            if (dateColIdx !== -1 && tempColIdx !== -1) {
              for (let i = 1; i < lines.length; i++) {
                const values = lines[i].split(',').map((v) => v.trim());
                if (values.length <= Math.max(dateColIdx, tempColIdx)) continue;

                const dateVal = values[dateColIdx];
                const tempVal = values[tempColIdx];

                const parsedDateResult = parseFlexDate(dateVal);
                const temperature = parseTemperature(tempVal);

                if (parsedDateResult.valid && parsedDateResult.date) {
                  records.push({
                    parsedDate: parsedDateResult.date,
                    temperature,
                  });
                }
              }
            }
          }
        } else {
          // Parse Excel
          const workbook = XLSX.read(fileBuffer);
          const sheet = workbook.Sheets[workbook.SheetNames[0]];
          if (sheet) {
            const range = XLSX.utils.decode_range(sheet['!ref'] || 'A1');
            const rows = Math.min(range.e.r + 1, 20);

            let dateCol = -1;
            let tempCol = -1;

            for (let row = 0; row < rows; row++) {
              for (let col = 0; col <= range.e.c; col++) {
                const cellRef = XLSX.utils.encode_cell({ r: row, c: col });
                const cell = sheet[cellRef];
                if (!cell) continue;

                const value = (cell.v || '').toString().toUpperCase();
                if (value.includes('TEMP')) tempCol = col;
                if (value.includes('DATA') || value.includes('HORA')) dateCol = col;
              }

              if (dateCol !== -1 && tempCol !== -1) break;
            }

            if (dateCol !== -1 && tempCol !== -1) {
              for (let row = 20; row <= range.e.r; row++) {
                const dateRef = XLSX.utils.encode_cell({ r: row, c: dateCol });
                const tempRef = XLSX.utils.encode_cell({ r: row, c: tempCol });

                const dateCell = sheet[dateRef];
                const tempCell = sheet[tempRef];

                if (!dateCell) continue;

                const parsedDateResult = parseFlexDate(dateCell.v);
                const temperature = parseTemperature(tempCell?.v);

                if (parsedDateResult.valid && parsedDateResult.date) {
                  records.push({
                    parsedDate: parsedDateResult.date,
                    temperature,
                  });
                }
              }
            }
          }
        }

        if (records.length > 0) {
          if (!result[placa]) {
            result[placa] = [];
          }
          result[placa].push(...records);
        } else {
          if (!result[placa]) {
            result[placa] = [];
          }
        }
      } catch (error) {
        console.error(`Error processing file ${filename}:`, error);
        if (!result[placa]) {
          result[placa] = [];
        }
      }
    }

    return result;
  } catch (error) {
    console.error('Error processing ZIP file:', error);
    return result;
  }
}

// ============================================================================
// ANALYSIS ENGINE
// ============================================================================

function filterRecordsByTimeWindow(records: PositionRecord[], startDate: Date, endDate: Date, toleranceMs: number = 60 * 60 * 1000): PositionRecord[] {
  const windowStart = new Date(startDate.getTime() - toleranceMs);
  const windowEnd = new Date(endDate.getTime() + toleranceMs);

  return records.filter((r) => {
    if (!r.parsedDate) return false;
    return r.parsedDate >= windowStart && r.parsedDate <= windowEnd;
  });
}

function mergeAndSortRecords(records: PositionRecord[]): PositionRecord[] {
  return records
    .filter((r) => r.parsedDate !== null)
    .sort((a, b) => (a.parsedDate?.getTime() || 0) - (b.parsedDate?.getTime() || 0));
}

function analyzeTrip(trip: MasterTrip, positionFileMap: { [placa: string]: PositionRecord[] }): AnalysisResult {
  const records = positionFileMap[trip.placa];

  if (!records) {
    return {
      placa: trip.placa,
      carreta: trip.carreta,
      origem: trip.origem,
      destino: trip.destino,
      inicioViagem: trip.inicioViagem,
      fimViagem: trip.fimViagem,
      faixa: trip.faixa,
      rangeMin: trip.rangeMin,
      rangeMax: trip.rangeMax,
      eficiencia: 0,
      status: 'S/ ARQUIVO',
      tempMedia: 0,
      tempMin: 0,
      tempMax: 0,
      tempMediana: 0,
      totalRegistros: 0,
      registrosComTemp: 0,
      timeWithinMs: 0,
      timeOutsideMs: 0,
    };
  }

  if (trip.rangeMin === null || trip.rangeMax === null) {
    return {
      placa: trip.placa,
      carreta: trip.carreta,
      origem: trip.origem,
      destino: trip.destino,
      inicioViagem: trip.inicioViagem,
      fimViagem: trip.fimViagem,
      faixa: trip.faixa,
      rangeMin: trip.rangeMin,
      rangeMax: trip.rangeMax,
      eficiencia: 0,
      status: 'S/ FAIXA',
      tempMedia: 0,
      tempMin: 0,
      tempMax: 0,
      tempMediana: 0,
      totalRegistros: 0,
      registrosComTemp: 0,
      timeWithinMs: 0,
      timeOutsideMs: 0,
    };
  }

  const windowRecords = filterRecordsByTimeWindow(records, trip.inicioViagem, trip.fimViagem);

  if (windowRecords.length === 0) {
    return {
      placa: trip.placa,
      carreta: trip.carreta,
      origem: trip.origem,
      destino: trip.destino,
      inicioViagem: trip.inicioViagem,
      fimViagem: trip.fimViagem,
      faixa: trip.faixa,
      rangeMin: trip.rangeMin,
      rangeMax: trip.rangeMax,
      eficiencia: 0,
      status: 'S/ DADOS',
      tempMedia: 0,
      tempMin: 0,
      tempMax: 0,
      tempMediana: 0,
      totalRegistros: 0,
      registrosComTemp: 0,
      timeWithinMs: 0,
      timeOutsideMs: 0,
    };
  }

  const sortedRecords = mergeAndSortRecords(windowRecords);
  const efficiencyResult = calculateEfficiency(sortedRecords, trip.rangeMin, trip.rangeMax);
  const tempStats = calculateTemperatureStats(sortedRecords);
  const recordsWithTemp = sortedRecords.filter((r) => r.temperature !== null).length;

  return {
    placa: trip.placa,
    carreta: trip.carreta,
    origem: trip.origem,
    destino: trip.destino,
    inicioViagem: trip.inicioViagem,
    fimViagem: trip.fimViagem,
    faixa: trip.faixa,
    rangeMin: trip.rangeMin,
    rangeMax: trip.rangeMax,
    eficiencia: efficiencyResult.eficiencia,
    status: efficiencyResult.status,
    tempMedia: tempStats.media,
    tempMin: tempStats.min,
    tempMax: tempStats.max,
    tempMediana: tempStats.mediana,
    totalRegistros: sortedRecords.length,
    registrosComTemp: recordsWithTemp,
    timeWithinMs: efficiencyResult.timeWithinMs,
    timeOutsideMs: efficiencyResult.timeOutsideMs,
  };
}

// ============================================================================
// MAIN COMPONENT
// ============================================================================

export default function AnaliseGifBrf() {
  const [masterFile, setMasterFile] = useState<File | undefined>(undefined);
  const [reportsZip, setReportsZip] = useState<File | undefined>(undefined);
  const [clientFile, setClientFile] = useState<File | undefined>(undefined);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [results, setResults] = useState<AnalysisResult[]>([]);
  const [kpis, setKpis] = useState<KPI[]>([]);

  const handleAnalyze = async () => {
    if (!masterFile || !reportsZip) {
      alert('Por favor, selecione a Planilha Mestre e o ZIP de Telemetria');
      return;
    }

    setIsAnalyzing(true);
    try {
      // Parse master file
      const masterBuffer = await masterFile.arrayBuffer();
      const trips = parseMasterFileInFrontend(masterBuffer);

      if (trips.length === 0) {
        alert('Nenhuma viagem válida encontrada na planilha mestre');
        setIsAnalyzing(false);
        return;
      }

      // Process ZIP
      const zipBuffer = await reportsZip.arrayBuffer();
      const positionFileMap = await processZipFileInFrontend(zipBuffer);

      // Analyze trips
      const analysisResults = trips.map((trip) => analyzeTrip(trip, positionFileMap));

      setResults(analysisResults);

      // Calculate KPIs
      if (analysisResults.length > 0) {
        const validResults = analysisResults.filter((r) => r.status !== 'S/ ARQUIVO' && r.status !== 'S/ DADOS' && r.status !== 'S/ FAIXA');
        const withinCount = analysisResults.filter((r) => r.status === 'within').length;
        const partialCount = analysisResults.filter((r) => r.status === 'partial').length;
        const avgEfficiency = validResults.length > 0 ? validResults.reduce((sum, r) => sum + r.eficiencia, 0) / validResults.length : 0;

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
      Início: r.inicioViagem.toLocaleString('pt-BR'),
      Fim: r.fimViagem.toLocaleString('pt-BR'),
      Faixa: r.faixa,
      'Temp. Média': r.tempMedia.toFixed(1),
      'Temp. Mín': r.tempMin.toFixed(1),
      'Temp. Máx': r.tempMax.toFixed(1),
      Eficiência: r.eficiencia.toFixed(1),
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
                            result.eficiencia >= 90
                              ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200'
                              : result.eficiencia >= 70
                              ? 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200'
                              : result.eficiencia >= 50
                              ? 'bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-200'
                              : 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200'
                          }`}
                        >
                          {result.eficiencia.toFixed(1)}%
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
