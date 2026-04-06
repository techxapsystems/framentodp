/**
 * TXTEMP Analysis Router
 * Handles temperature efficiency analysis with backend processing
 */

import { router, publicProcedure } from '../_core/trpc';
import { z } from 'zod';
import JSZip from 'jszip';
import * as XLSX from 'xlsx';
import {
  parseFlexDate,
  parseTemperature,
  parseTemperatureRange,
  isValidPlate,
  extractPlateFromFilename,
  calculateEfficiency,
  calculateTemperatureStats,
  PositionRecord,
  AnalysisResult,
} from '../txtemp-utils';
import { processZipFileInBackend, filterRecordsByTimeWindow, mergeAndSortRecords } from '../txtemp-zip-processor-backend';
import { parseMasterFileInBackend, MasterTrip } from '../txtemp-master-parser-backend';

// ============================================================================
// TYPES
// ============================================================================

interface AnalysisProgress {
  phase: 'parsing_master' | 'processing_zips' | 'analyzing_trips' | 'complete';
  current: number;
  total: number;
  message: string;
}

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

function analyzeTrip(
  trip: MasterTrip,
  positionFileMap: { [placa: string]: PositionRecord[] }
): AnalysisResult {
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
// ROUTER
// ============================================================================

export const txtempRouter = router({
  analyze: publicProcedure
    .input(
      z.object({
        masterFileBase64: z.string().describe('Master file as base64'),
        zipFilesBase64: z.array(z.string()).describe('Array of ZIP files as base64'),
      })
    )
    .mutation(async ({ input }) => {
      try {
        // Parse master file
        const masterBuffer = Buffer.from(input.masterFileBase64, 'base64');
        const trips = parseMasterFileInBackend(masterBuffer);

        if (trips.length === 0) {
          return {
            success: false,
            error: 'Nenhuma viagem válida encontrada na planilha mestre',
            results: [],
          };
        }

        // Process all ZIP files
        const positionFileMap: { [placa: string]: PositionRecord[] } = {};

        for (let i = 0; i < input.zipFilesBase64.length; i++) {
          const zipBuffer = Buffer.from(input.zipFilesBase64[i], 'base64');
          const zipData = await processZipFileInBackend(zipBuffer);

          // Merge with existing data
          for (const [placa, records] of Object.entries(zipData)) {
            if (!positionFileMap[placa]) {
              positionFileMap[placa] = [];
            }
            positionFileMap[placa].push(...records);
          }
        }

        // Analyze trips
        const results = trips.map((trip) => analyzeTrip(trip, positionFileMap));

        // Calculate KPIs
        const validResults = results.filter((r: AnalysisResult) => r.status !== 'S/ ARQUIVO' && r.status !== 'S/ DADOS' && r.status !== 'S/ FAIXA');
        const withinCount = results.filter((r: AnalysisResult) => r.status === 'within').length;
        const partialCount = results.filter((r: AnalysisResult) => r.status === 'partial').length;
        const outsideCount = results.filter((r: AnalysisResult) => r.status === 'outside').length;
        const avgEfficiency = validResults.length > 0 ? validResults.reduce((sum: number, r: AnalysisResult) => sum + r.eficiencia, 0) / validResults.length : 0;

        return {
          success: true,
          results,
          kpis: {
            totalTrips: results.length,
            tripsWithData: validResults.length,
            tripsWithin: withinCount,
            tripsPartial: partialCount,
            tripsOutside: outsideCount,
            averageEfficiency: Math.round(avgEfficiency * 10) / 10,
          },
        };
      } catch (error) {
        console.error('Error in TXTEMP analysis:', error);
        return {
          success: false,
          error: error instanceof Error ? error.message : 'Erro desconhecido',
          results: [],
        };
      }
    }),
});
