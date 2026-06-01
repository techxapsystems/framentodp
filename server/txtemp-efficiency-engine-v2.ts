/**
 * TXTEMP Efficiency Engine V2 (Backend)
 * Calculates efficiency based on TIME within temperature range
 * NOT based on individual positions
 */

import { MasterTripV2 } from './txtemp-master-parser-v2';
import { PositionRecord } from './txtemp-utils';

export interface EfficiencyResult {
  placa: string;
  carreta: string;
  origem: string;
  destino: string;
  inicioViagem: Date;
  fimViagem: Date;
  faixa: string;
  rangeMin: number | null;
  rangeMax: number | null;
  tipoSensor: string;
  eficienciaFinal?: number; // EFICIÊNCIA_FINAL from master spreadsheet
  motivoOutside?: string; // Reason why it's outside range

  // Telemetry data
  totalRegistros: number;
  registrosNaJanela: number;
  registrosDentroFaixa: number;
  registrosForaFaixa: number;

  // Time-based efficiency
  tempoTotalMs: number;
  tempoNaJanelaMs: number;
  tempoDentroFaixaMs: number;
  tempoForaFaixaMs: number;

  // Efficiency percentage (based on TIME)
  eficiencia: number; // 0-100

  // Status classification
  status: 'within' | 'partial' | 'outside' | 'S/ ARQUIVO' | 'S/ DADOS' | 'S/ FAIXA';

  // Statistics
  tempMin: number | null;
  tempMax: number | null;
  tempMedia: number | null;
  tempMediaDentroFaixa: number | null;
}

/**
 * Calculate efficiency for a single trip based on TIME within range
 */
export function calculateTripEfficiency(
  trip: MasterTripV2,
  telemetryRecords: PositionRecord[]
): EfficiencyResult {
  // Check if faixa is valid
  if (trip.rangeMin === null || trip.rangeMax === null) {
    return {
      ...trip,
      totalRegistros: 0,
      registrosNaJanela: 0,
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
    };
  }

  // Check if we have telemetry data
  if (telemetryRecords.length === 0) {
    return {
      ...trip,
      totalRegistros: 0,
      registrosNaJanela: 0,
      registrosDentroFaixa: 0,
      registrosForaFaixa: 0,
      tempoTotalMs: trip.fimViagem.getTime() - trip.inicioViagem.getTime(),
      tempoNaJanelaMs: 0,
      tempoDentroFaixaMs: 0,
      tempoForaFaixaMs: 0,
      eficiencia: 0,
      status: 'S/ ARQUIVO',
      tempMin: null,
      tempMax: null,
      tempMedia: null,
      tempMediaDentroFaixa: null,
    };
  }

  // Filter records within the trip time window (±1 hour tolerance)
  const toleranceMs = 60 * 60 * 1000; // 1 hour
  const windowStart = trip.inicioViagem.getTime() - toleranceMs;
  const windowEnd = trip.fimViagem.getTime() + toleranceMs;

  const recordsInWindow = telemetryRecords.filter(r => {
    if (!r.parsedDate) return false;
    const recordTime = r.parsedDate.getTime();
    return recordTime >= windowStart && recordTime <= windowEnd;
  });

  if (recordsInWindow.length === 0) {
    return {
      ...trip,
      totalRegistros: telemetryRecords.length,
      registrosNaJanela: 0,
      registrosDentroFaixa: 0,
      registrosForaFaixa: 0,
      tempoTotalMs: trip.fimViagem.getTime() - trip.inicioViagem.getTime(),
      tempoNaJanelaMs: 0,
      tempoDentroFaixaMs: 0,
      tempoForaFaixaMs: 0,
      eficiencia: 0,
      status: 'S/ DADOS',
      tempMin: null,
      tempMax: null,
      tempMedia: null,
      tempMediaDentroFaixa: null,
    };
  }

  // Sort records by time
  recordsInWindow.sort((a, b) => {
    if (!a.parsedDate || !b.parsedDate) return 0;
    return a.parsedDate.getTime() - b.parsedDate.getTime();
  });

  // Calculate time-based efficiency
  let tempoDentroFaixaMs = 0;
  let tempoForaFaixaMs = 0;
  let registrosDentroFaixa = 0;
  let registrosForaFaixa = 0;
  let tempMin = Infinity;
  let tempMax = -Infinity;
  let tempSum = 0;
  let tempSumDentroFaixa = 0;
  let countDentroFaixa = 0;

  for (let i = 0; i < recordsInWindow.length; i++) {
    const record = recordsInWindow[i];
    const nextRecord = recordsInWindow[i + 1];

    // Skip records without date or temperature
    if (!record.parsedDate || record.temperature === null) continue;

    // Calculate time interval for this record
    let timeIntervalMs = 0;
    if (nextRecord && nextRecord.parsedDate) {
      timeIntervalMs = nextRecord.parsedDate.getTime() - record.parsedDate.getTime();
    } else {
      // For the last record, use 1 minute as default interval
      timeIntervalMs = 60 * 1000;
    }

    // Check if temperature is within range
    const temp = record.temperature;
    const isDentroFaixa = temp >= trip.rangeMin && temp <= trip.rangeMax;

    if (isDentroFaixa) {
      tempoDentroFaixaMs += timeIntervalMs;
      registrosDentroFaixa++;
      tempSumDentroFaixa += temp;
      countDentroFaixa++;
    } else {
      tempoForaFaixaMs += timeIntervalMs;
      registrosForaFaixa++;
    }

    // Update min/max/sum
    tempMin = Math.min(tempMin, temp);
    tempMax = Math.max(tempMax, temp);
    tempSum += temp;
  }

  // Calculate efficiency percentage based on TIME
  const tempoNaJanelaMs = tempoDentroFaixaMs + tempoForaFaixaMs;
  const eficiencia = tempoNaJanelaMs > 0 ? (tempoDentroFaixaMs / tempoNaJanelaMs) * 100 : 0;

  // Determine status and reason for outside
  let status: 'within' | 'partial' | 'outside' = 'outside';
  let motivoOutside = '';
  
  if (eficiencia >= 90) {
    status = 'within';
  } else if (eficiencia >= 50) {
    status = 'partial';
    motivoOutside = `Eficiência ${eficiencia.toFixed(1)}% - Abaixo de 90%`;
  } else {
    motivoOutside = `Eficiência ${eficiencia.toFixed(1)}% - Tempo fora da faixa: ${(tempoForaFaixaMs / 60000).toFixed(1)} min`;
  }

  return {
    ...trip,
    totalRegistros: telemetryRecords.length,
    registrosNaJanela: recordsInWindow.length,
    registrosDentroFaixa,
    registrosForaFaixa,
    tempoTotalMs: trip.fimViagem.getTime() - trip.inicioViagem.getTime(),
    tempoNaJanelaMs,
    tempoDentroFaixaMs,
    tempoForaFaixaMs,
    eficiencia: Math.round(eficiencia * 10) / 10, // Round to 1 decimal
    status,
    motivoOutside: status === 'outside' ? motivoOutside : undefined,
    tempMin: tempMin === Infinity ? null : Math.round(tempMin * 10) / 10,
    tempMax: tempMax === -Infinity ? null : Math.round(tempMax * 10) / 10,
    tempMedia: recordsInWindow.length > 0 ? Math.round((tempSum / recordsInWindow.length) * 10) / 10 : null,
    tempMediaDentroFaixa: countDentroFaixa > 0 ? Math.round((tempSumDentroFaixa / countDentroFaixa) * 10) / 10 : null,
  };
}

/**
 * Calculate efficiency for multiple trips
 */
export function calculateBatchEfficiency(
  trips: MasterTripV2[],
  telemetryByPlaca: Map<string, PositionRecord[]>
): EfficiencyResult[] {
  const results: EfficiencyResult[] = [];

  for (const trip of trips) {
    const telemetry = telemetryByPlaca.get(trip.placa) || [];
    const result = calculateTripEfficiency(trip, telemetry);
    results.push(result);
  }

  return results;
}

/**
 * Calculate KPIs from efficiency results
 */
export function calculateKPIs(results: EfficiencyResult[]) {
  const totalTrips = results.length;
  const tripsWithData = results.filter(r => r.status !== 'S/ ARQUIVO' && r.status !== 'S/ DADOS' && r.status !== 'S/ FAIXA').length;
  const tripsWithin = results.filter(r => r.status === 'within').length;
  const tripsPartial = results.filter(r => r.status === 'partial').length;
  const tripsOutside = results.filter(r => r.status === 'outside').length;

  const validResults = results.filter(r => r.status !== 'S/ ARQUIVO' && r.status !== 'S/ DADOS' && r.status !== 'S/ FAIXA');
  const averageEfficiency = validResults.length > 0
    ? Math.round((validResults.reduce((sum, r) => sum + r.eficiencia, 0) / validResults.length) * 10) / 10
    : 0;

  return {
    totalTrips,
    tripsWithData,
    tripsWithin,
    tripsPartial,
    tripsOutside,
    averageEfficiency,
  };
}
