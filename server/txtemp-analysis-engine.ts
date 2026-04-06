/**
 * TXTEMP Analysis Engine
 * Performs complete analysis of trips against telemetry data
 */

import {
  AnalysisResult,
  PositionRecord,
  calculateEfficiency,
  calculateTemperatureStats,
} from './txtemp-utils';
import { MasterTrip } from './txtemp-master-parser';
import { PositionFileMap, filterRecordsByTimeWindow, mergeAndSortRecords } from './txtemp-zip-processor';

/**
 * Analyze a single trip
 */
export function analyzeTrip(
  trip: MasterTrip,
  positionFileMap: PositionFileMap
): AnalysisResult {
  // Check if we have telemetry for this plate
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

  // Check if faixa is valid
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

  // Filter records within time window (±1 hour)
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

  // Sort records chronologically
  const sortedRecords = mergeAndSortRecords(windowRecords);

  // Calculate efficiency
  const efficiencyResult = calculateEfficiency(sortedRecords, trip.rangeMin, trip.rangeMax);

  // Calculate temperature statistics
  const tempStats = calculateTemperatureStats(sortedRecords);

  // Count records with temperature
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

/**
 * Analyze multiple trips
 */
export function analyzeTrips(trips: MasterTrip[], positionFileMap: PositionFileMap): AnalysisResult[] {
  return trips.map((trip) => analyzeTrip(trip, positionFileMap));
}

/**
 * Calculate KPIs from analysis results
 */
export interface AnalysisKPIs {
  totalTrips: number;
  tripsWithData: number;
  tripsWithin: number;
  tripsPartial: number;
  tripsOutside: number;
  tripsNoFile: number;
  tripsNoData: number;
  tripsNoRange: number;
  averageEfficiency: number;
  averageTemperature: number;
  minTemperature: number;
  maxTemperature: number;
}

export function calculateKPIs(results: AnalysisResult[]): AnalysisKPIs {
  const validResults = results.filter((r) => r.status !== 'S/ ARQUIVO' && r.status !== 'S/ DADOS' && r.status !== 'S/ FAIXA');

  const tripsWithin = results.filter((r) => r.status === 'within').length;
  const tripsPartial = results.filter((r) => r.status === 'partial').length;
  const tripsOutside = results.filter((r) => r.status === 'outside').length;
  const tripsNoFile = results.filter((r) => r.status === 'S/ ARQUIVO').length;
  const tripsNoData = results.filter((r) => r.status === 'S/ DADOS').length;
  const tripsNoRange = results.filter((r) => r.status === 'S/ FAIXA').length;

  const averageEfficiency = validResults.length > 0 ? validResults.reduce((sum, r) => sum + r.eficiencia, 0) / validResults.length : 0;

  const allTemps = results.filter((r) => r.tempMedia > 0).map((r) => r.tempMedia);
  const averageTemperature = allTemps.length > 0 ? allTemps.reduce((a, b) => a + b, 0) / allTemps.length : 0;
  const minTemperature = allTemps.length > 0 ? Math.min(...allTemps) : 0;
  const maxTemperature = allTemps.length > 0 ? Math.max(...allTemps) : 0;

  return {
    totalTrips: results.length,
    tripsWithData: validResults.length,
    tripsWithin,
    tripsPartial,
    tripsOutside,
    tripsNoFile,
    tripsNoData,
    tripsNoRange,
    averageEfficiency: Math.round(averageEfficiency * 10) / 10,
    averageTemperature: Math.round(averageTemperature * 10) / 10,
    minTemperature: Math.round(minTemperature * 10) / 10,
    maxTemperature: Math.round(maxTemperature * 10) / 10,
  };
}

/**
 * Get efficiency distribution for pie chart
 */
export interface EfficiencyDistribution {
  excellent: number; // >= 90%
  good: number; // >= 70% and < 90%
  fair: number; // >= 50% and < 70%
  poor: number; // < 50%
  noData: number; // S/ ARQUIVO, S/ DADOS, S/ FAIXA
}

export function getEfficiencyDistribution(results: AnalysisResult[]): EfficiencyDistribution {
  return {
    excellent: results.filter((r) => r.eficiencia >= 90 && r.status !== 'S/ ARQUIVO' && r.status !== 'S/ DADOS' && r.status !== 'S/ FAIXA').length,
    good: results.filter((r) => r.eficiencia >= 70 && r.eficiencia < 90 && r.status !== 'S/ ARQUIVO' && r.status !== 'S/ DADOS' && r.status !== 'S/ FAIXA').length,
    fair: results.filter((r) => r.eficiencia >= 50 && r.eficiencia < 70 && r.status !== 'S/ ARQUIVO' && r.status !== 'S/ DADOS' && r.status !== 'S/ FAIXA').length,
    poor: results.filter((r) => r.eficiencia < 50 && r.status !== 'S/ ARQUIVO' && r.status !== 'S/ DADOS' && r.status !== 'S/ FAIXA').length,
    noData: results.filter((r) => r.status === 'S/ ARQUIVO' || r.status === 'S/ DADOS' || r.status === 'S/ FAIXA').length,
  };
}

/**
 * Get worst efficiency trips
 */
export function getWorstTrips(results: AnalysisResult[], limit: number = 10): AnalysisResult[] {
  return results
    .filter((r) => r.status !== 'S/ ARQUIVO' && r.status !== 'S/ DADOS' && r.status !== 'S/ FAIXA')
    .sort((a, b) => a.eficiencia - b.eficiencia)
    .slice(0, limit);
}
