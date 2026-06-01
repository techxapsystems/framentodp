/**
 * TXTEMP Master File Parser
 * Parses the master trip file and extracts journey data
 */

import * as XLSX from 'xlsx';
import { isValidPlate, parseFlexDate, parseTemperatureRange } from './txtemp-utils';

export interface MasterTrip {
  placa: string;
  carreta: string;
  origem: string;
  destino: string;
  inicioViagem: Date;
  fimViagem: Date;
  faixa: string;
  rangeMin: number | null;
  rangeMax: number | null;
  rowIndex: number;
}

/**
 * Find header row in master file
 * Looks for columns containing PLACA CAVALO, INICIO VIAGEM, FIM VIAGEM, etc.
 */
function findHeaderRow(sheet: XLSX.WorkSheet, maxRows: number = 20): number {
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

  return 0; // Default to first row
}

/**
 * Find column index by name pattern
 */
function findColumnByPattern(sheet: XLSX.WorkSheet, headerRow: number, patterns: string[]): number {
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

/**
 * Get last N columns from sheet
 */
function getLastNColumns(sheet: XLSX.WorkSheet, headerRow: number, n: number): number[] {
  const range = XLSX.utils.decode_range(sheet['!ref'] || 'A1');
  const cols: number[] = [];

  for (let i = Math.max(0, range.e.c - n + 1); i <= range.e.c; i++) {
    cols.push(i);
  }

  return cols;
}

/**
 * Parse master file and extract journey data
 */
export function parseMasterFile(fileBuffer: ArrayBuffer): MasterTrip[] {
  try {
    const workbook = XLSX.read(fileBuffer);
    const sheet = workbook.Sheets[workbook.SheetNames[0]];
    if (!sheet) return [];

    const headerRow = findHeaderRow(sheet);

    // Find column indices
    const placaCavalosCol = findColumnByPattern(sheet, headerRow, ['PLACA', 'CAVALO']);
    const placaCarretaCol = findColumnByPattern(sheet, headerRow, ['PLACA', 'CARRETA']);
    const origemCol = findColumnByPattern(sheet, headerRow, ['ORIGEM']);
    const destinoCol = findColumnByPattern(sheet, headerRow, ['DESTINO']);
    const inicioCol = findColumnByPattern(sheet, headerRow, ['INICIO', 'INÍCIO', 'VIAGEM']);
    const fimCol = findColumnByPattern(sheet, headerRow, ['FIM', 'VIAGEM']);
    const faixaCol = findColumnByPattern(sheet, headerRow, ['FAIXA', 'TEMPERATURA']);

    if (placaCavalosCol === -1 || inicioCol === -1 || fimCol === -1) {
      console.warn('Could not find required columns in master file');
      return [];
    }

    // Extract data rows
    const trips: MasterTrip[] = [];
    const range = XLSX.utils.decode_range(sheet['!ref'] || 'A1');

    for (let row = headerRow + 1; row <= range.e.r; row++) {
      // Get placa
      const placaRef = XLSX.utils.encode_cell({ r: row, c: placaCavalosCol });
      const placaCell = sheet[placaRef];
      const placa = (placaCell?.v || '').toString().trim().toUpperCase();

      // Validate placa
      if (!isValidPlate(placa)) {
        continue;
      }

      // Get dates
      const inicioRef = XLSX.utils.encode_cell({ r: row, c: inicioCol });
      const fimRef = XLSX.utils.encode_cell({ r: row, c: fimCol });

      const inicioCell = sheet[inicioRef];
      const fimCell = sheet[fimRef];

      const inicioResult = parseFlexDate(inicioCell?.v);
      const fimResult = parseFlexDate(fimCell?.v);

      if (!inicioResult.valid || !inicioResult.date || !fimResult.valid || !fimResult.date) {
        continue;
      }

      // Get faixa
      let faixa = '';
      if (faixaCol !== -1) {
        const faixaRef = XLSX.utils.encode_cell({ r: row, c: faixaCol });
        const faixaCell = sheet[faixaRef];
        faixa = (faixaCell?.v || '').toString().trim();
      }

      // If faixa not found, try last 4 columns
      if (!faixa) {
        const lastCols = getLastNColumns(sheet, headerRow, 4);
        for (const col of lastCols) {
          const cellRef = XLSX.utils.encode_cell({ r: row, c: col });
          const cell = sheet[cellRef];
          const value = (cell?.v || '').toString().trim();

          // Check if value looks like a temperature range
          if (value.match(/-?\d+/) && value.length > 0) {
            faixa = value;
            break;
          }
        }
      }

      // Parse faixa
      const faixaRange = parseTemperatureRange(faixa);

      // Get other fields
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
        rowIndex: row,
      });
    }

    // Sort by placa, then by row index
    trips.sort((a, b) => {
      if (a.placa !== b.placa) {
        return a.placa.localeCompare(b.placa);
      }
      return a.rowIndex - b.rowIndex;
    });

    return trips;
  } catch (error) {
    console.error('Error parsing master file:', error);
    return [];
  }
}

/**
 * Validate master trip
 * Checks if trip has all required fields
 */
export function validateMasterTrip(trip: MasterTrip): boolean {
  return (
    !!trip.placa &&
    isValidPlate(trip.placa) &&
    !!trip.inicioViagem &&
    !!trip.fimViagem &&
    trip.rangeMin !== null &&
    trip.rangeMax !== null
  );
}
