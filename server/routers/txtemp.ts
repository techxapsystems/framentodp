/**
 * TXTEMP Analysis Router V2
 * Handles temperature efficiency analysis with backend processing
 * Uses time-based efficiency calculation (not position-based)
 */

import { router, publicProcedure, protectedProcedure } from '../_core/trpc';
import { z } from 'zod';
import JSZip from 'jszip';
import * as XLSX from 'xlsx';
import { parseMasterFileV2, MasterTripV2 } from '../txtemp-master-parser-v2';
import { processZipFileInBackend, PositionFileMap } from '../txtemp-zip-processor-backend';
import { calculateBatchEfficiency, calculateKPIs, EfficiencyResult } from '../txtemp-efficiency-engine-v2';

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
// ROUTER
// ============================================================================

export const txtempRouter = router({
  /**
   * Analyze thermal efficiency from master file and ZIP telemetry files
   * Uses time-based calculation: % of TIME within temperature range
   */
  analyze: publicProcedure
    .input(
      z.object({
        masterFile: z.string(),
        zipFiles: z.array(z.string()),
      })
    )
    .mutation(async ({ input }) => {
      try {
        console.log('[TXTEMP V2] Starting analysis');
        console.log(`[TXTEMP V2] Master file size: ${input.masterFile.length} bytes`);
        console.log(`[TXTEMP V2] ZIP files: ${input.zipFiles.length}`);

        // Phase 1: Parse master file
        console.log('[TXTEMP V2] Phase 1: Parsing master file');
        const masterBuffer = Buffer.from(input.masterFile, 'base64');
        const masterTrips = parseMasterFileV2(masterBuffer);
        console.log(`[TXTEMP V2] Parsed ${masterTrips.length} trips from master file`);

        if (masterTrips.length === 0) {
          return {
            success: false,
            error: 'Nenhuma viagem encontrada na planilha mestre',
            results: [],
            kpis: {
              totalTrips: 0,
              tripsWithData: 0,
              tripsWithin: 0,
              tripsPartial: 0,
              tripsOutside: 0,
              averageEfficiency: 0,
            },
          };
        }

        // Phase 2: Process ZIP files
        console.log('[TXTEMP V2] Phase 2: Processing ZIP files');
        const telemetryByPlaca = new Map();

        for (let i = 0; i < input.zipFiles.length; i++) {
          console.log(`[TXTEMP V2] Processing ZIP file ${i + 1}/${input.zipFiles.length}`);
          const zipBuffer = Buffer.from(input.zipFiles[i], 'base64');
          const positionFileMap = await processZipFileInBackend(zipBuffer);

          // Merge with existing telemetry
          for (const [placa, records] of Object.entries(positionFileMap)) {
            if (telemetryByPlaca.has(placa)) {
              // Merge records for same placa
              const existing = telemetryByPlaca.get(placa);
              telemetryByPlaca.set(placa, [...existing, ...records]);
            } else {
              telemetryByPlaca.set(placa, records);
            }
          }
        }

        console.log(`[TXTEMP V2] Loaded telemetry for ${telemetryByPlaca.size} unique plates`);

        // Phase 3: Calculate efficiency for each trip
        console.log('[TXTEMP V2] Phase 3: Calculating efficiency');
        const results: EfficiencyResult[] = [];

        for (const trip of masterTrips) {
          const telemetry = telemetryByPlaca.get(trip.placa) || [];
          
          // Calculate efficiency based on TIME within range
          let tempoDentroFaixaMs = 0;
          let tempoTotalMs = 0;
          let registrosDentroFaixa = 0;
          let registrosForaFaixa = 0;
          let tempMin = Infinity;
          let tempMax = -Infinity;
          let tempSum = 0;
          let tempSumDentroFaixa = 0;
          let countDentroFaixa = 0;

          // Filter records within time window (±1 hour)
          const toleranceMs = 60 * 60 * 1000;
          const windowStart = trip.inicioViagem.getTime() - toleranceMs;
          const windowEnd = trip.fimViagem.getTime() + toleranceMs;

          const recordsInWindow = telemetry.filter((r: any) => {
            if (!r.parsedDate || r.temperature === null) return false;
            const recordTime = r.parsedDate.getTime();
            return recordTime >= windowStart && recordTime <= windowEnd;
          });

          if (recordsInWindow.length === 0) {
            // No telemetry data
            results.push({
              placa: trip.placa,
              carreta: trip.carreta,
              origem: trip.origem,
              destino: trip.destino,
              inicioViagem: trip.inicioViagem,
              fimViagem: trip.fimViagem,
              faixa: trip.faixa,
              rangeMin: trip.rangeMin,
              rangeMax: trip.rangeMax,
              tipoSensor: trip.tipoSensor,
              totalRegistros: telemetry.length,
              registrosNaJanela: 0,
              registrosDentroFaixa: 0,
              registrosForaFaixa: 0,
              tempoTotalMs: trip.fimViagem.getTime() - trip.inicioViagem.getTime(),
              tempoNaJanelaMs: 0,
              tempoDentroFaixaMs: 0,
              tempoForaFaixaMs: 0,
              eficiencia: 0,
              status: telemetry.length === 0 ? 'S/ ARQUIVO' : 'S/ DADOS',
              tempMin: null,
              tempMax: null,
              tempMedia: null,
              tempMediaDentroFaixa: null,
            });
            continue;
          }

          // Check if faixa is valid
          if (trip.rangeMin === null || trip.rangeMax === null) {
            results.push({
              placa: trip.placa,
              carreta: trip.carreta,
              origem: trip.origem,
              destino: trip.destino,
              inicioViagem: trip.inicioViagem,
              fimViagem: trip.fimViagem,
              faixa: trip.faixa,
              rangeMin: trip.rangeMin,
              rangeMax: trip.rangeMax,
              tipoSensor: trip.tipoSensor,
              totalRegistros: telemetry.length,
              registrosNaJanela: recordsInWindow.length,
              registrosDentroFaixa: 0,
              registrosForaFaixa: 0,
              tempoTotalMs: trip.fimViagem.getTime() - trip.inicioViagem.getTime(),
              tempoNaJanelaMs: 0,
              tempoDentroFaixaMs: 0,
              tempoForaFaixaMs: 0,
              eficiencia: 0,
              status: 'S/ FAIXA',
              tempMin: null,
              tempMax: null,
              tempMedia: null,
              tempMediaDentroFaixa: null,
            });
            continue;
          }

          // Sort records by time
          recordsInWindow.sort((a: any, b: any) => {
            if (!a.parsedDate || !b.parsedDate) return 0;
            return a.parsedDate.getTime() - b.parsedDate.getTime();
          });

          // Calculate time-based efficiency
          for (let i = 0; i < recordsInWindow.length; i++) {
            const record = recordsInWindow[i];
            const nextRecord = recordsInWindow[i + 1];

            if (!record.parsedDate || record.temperature === null) continue;

            // Calculate time interval
            let timeIntervalMs = 0;
            if (nextRecord && nextRecord.parsedDate) {
              timeIntervalMs = nextRecord.parsedDate.getTime() - record.parsedDate.getTime();
            } else {
              timeIntervalMs = 60 * 1000; // 1 minute for last record
            }

            tempoTotalMs += timeIntervalMs;

            // Check if within range
            const temp = record.temperature;
            const isDentroFaixa = temp >= trip.rangeMin && temp <= trip.rangeMax;

            if (isDentroFaixa) {
              tempoDentroFaixaMs += timeIntervalMs;
              registrosDentroFaixa++;
              tempSumDentroFaixa += temp;
              countDentroFaixa++;
            } else {
              registrosForaFaixa++;
            }

            tempMin = Math.min(tempMin, temp);
            tempMax = Math.max(tempMax, temp);
            tempSum += temp;
          }

          // Calculate efficiency percentage
          const eficiencia = tempoTotalMs > 0 ? (tempoDentroFaixaMs / tempoTotalMs) * 100 : 0;

          // Determine status
          let status: 'within' | 'partial' | 'outside' = 'outside';
          if (eficiencia >= 90) {
            status = 'within';
          } else if (eficiencia >= 50) {
            status = 'partial';
          }

          results.push({
            placa: trip.placa,
            carreta: trip.carreta,
            origem: trip.origem,
            destino: trip.destino,
            inicioViagem: trip.inicioViagem,
            fimViagem: trip.fimViagem,
            faixa: trip.faixa,
            rangeMin: trip.rangeMin,
            rangeMax: trip.rangeMax,
            tipoSensor: trip.tipoSensor,
            totalRegistros: telemetry.length,
            registrosNaJanela: recordsInWindow.length,
            registrosDentroFaixa,
            registrosForaFaixa,
            tempoTotalMs: trip.fimViagem.getTime() - trip.inicioViagem.getTime(),
            tempoNaJanelaMs: tempoTotalMs,
            tempoDentroFaixaMs,
            tempoForaFaixaMs: tempoTotalMs - tempoDentroFaixaMs,
            eficiencia: Math.round(eficiencia * 10) / 10,
            status,
            tempMin: tempMin === Infinity ? null : Math.round(tempMin * 10) / 10,
            tempMax: tempMax === -Infinity ? null : Math.round(tempMax * 10) / 10,
            tempMedia: recordsInWindow.length > 0 ? Math.round((tempSum / recordsInWindow.length) * 10) / 10 : null,
            tempMediaDentroFaixa: countDentroFaixa > 0 ? Math.round((tempSumDentroFaixa / countDentroFaixa) * 10) / 10 : null,
          });
        }

        // Phase 4: Track plates not analyzed
        console.log('[TXTEMP V2] Phase 4: Tracking plates not analyzed');
        const analyzedPlates = new Set(results.map(r => r.placa));
        const masterPlates = new Set(masterTrips.map(t => t.placa));
        const notAnalyzedPlates = Array.from(masterPlates).filter(p => !analyzedPlates.has(p));
        
        const platesNotFound = results.filter(r => r.status === 'S/ ARQUIVO').map(r => r.placa);
        const platesNoData = results.filter(r => r.status === 'S/ DADOS').map(r => r.placa);
        const platesNoRange = results.filter(r => r.status === 'S/ FAIXA').map(r => r.placa);

        console.log(`[TXTEMP V2] Plates not analyzed: ${notAnalyzedPlates.length}`);
        console.log(`[TXTEMP V2] Plates not found in ZIPs: ${platesNotFound.length}`);
        console.log(`[TXTEMP V2] Plates with no data in window: ${platesNoData.length}`);
        console.log(`[TXTEMP V2] Plates with no range: ${platesNoRange.length}`);

        // Phase 5: Calculate KPIs
        console.log('[TXTEMP V2] Phase 5: Calculating KPIs');
        const kpis = calculateKPIs(results);

        console.log('[TXTEMP V2] Analysis complete');
        console.log(`[TXTEMP V2] Results: ${results.length} trips analyzed`);
        console.log(`[TXTEMP V2] KPIs:`, kpis);

        return {
          success: true,
          results,
          kpis,
          platesNotAnalyzed: {
            total: notAnalyzedPlates.length,
            notFound: platesNotFound,
            noData: platesNoData,
            noRange: platesNoRange,
          },
        };
      } catch (error) {
        console.error('[TXTEMP V2] Error during analysis:', error);
        return {
          success: false,
          error: String(error),
          results: [],
          kpis: {
            totalTrips: 0,
            tripsWithData: 0,
            tripsWithin: 0,
            tripsPartial: 0,
            tripsOutside: 0,
            averageEfficiency: 0,
          },
        };
      }
    }),

  getComparisonData: publicProcedure
    .input(
      z.object({
        results: z.array(
          z.object({
            placa: z.string(),
            eficiencia: z.number(),
            eficienciaFinal: z.number().optional(),
          })
        ),
      })
    )
    .query(({ input }) => {
      try {
        const comparisonData = input.results
          .filter(r => r.eficienciaFinal !== undefined)
          .map(r => {
            const brfEfficiency = r.eficienciaFinal || 0;
            const systemEfficiency = Math.round(r.eficiencia * 100) / 100;
            const difference = systemEfficiency - brfEfficiency;
            const percentDifference = brfEfficiency > 0 ? (difference / brfEfficiency) * 100 : 0;

            let status: 'match' | 'higher' | 'lower' = 'match';
            if (Math.abs(difference) > 1) {
              status = difference > 0 ? 'higher' : 'lower';
            }

            return {
              placa: r.placa,
              brfEfficiency,
              systemEfficiency,
              difference: Math.round(difference * 100) / 100,
              percentDifference: Math.round(percentDifference * 100) / 100,
              status,
            };
          });

        return {
          success: true,
          data: comparisonData,
        };
      } catch (error) {
        return {
          success: false,
          error: String(error),
          data: [],
        };
      }
    }),
});
