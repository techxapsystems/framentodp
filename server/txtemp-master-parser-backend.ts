/**
 * TXTEMP Master File Parser (Backend)
 * Parses the master trip file and extracts journey data
 * 
 * Supports two types of temperature range specification:
 * 1. "FAIXA" column with text like "-18 a -12" (2 numbers → min/max)
 * 2. "CET" column with a single number (max temp) + "TIPO DE SENSOR" to determine min
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
  tipoSensor: string;
  rowIndex: number;
}

/**
 * Find header row in master file
 * Searches first 20 rows for a row containing "PLACA"
 */
function findHeaderRow(sheet: XLSX.WorkSheet, maxRows: number = 20): number {
  const range = XLSX.utils.decode_range(sheet['!ref'] || 'A1');
  const rows = Math.min(range.e.r + 1, maxRows);

  for (let row = 0; row < rows; row++) {
    for (let col = 0; col <= range.e.c; col++) {
      const cellRef = XLSX.utils.encode_cell({ r: row, c: col });
      const cell = sheet[cellRef];
      if (!cell) continue;

      const value = (cell.v || '').toString().toUpperCase();
      if (value.includes('PLACA')) {
        return row;
      }
    }
  }

  return 0;
}

/**
 * Find column index by matching any of the given patterns
 */
function findColumnByPattern(sheet: XLSX.WorkSheet, headerRow: number, patterns: string[]): number {
  const range = XLSX.utils.decode_range(sheet['!ref'] || 'A1');

  for (let col = 0; col <= range.e.c; col++) {
    const cellRef = XLSX.utils.encode_cell({ r: headerRow, c: col });
    const cell = sheet[cellRef];
    if (!cell) continue;

    const value = (cell.v || '').toString().toUpperCase().trim();
    for (const pattern of patterns) {
      if (value.includes(pattern.toUpperCase())) {
        return col;
      }
    }
  }

  return -1;
}

/**
 * Find column that EXACTLY matches one of the patterns (not just includes)
 */
function findColumnExact(sheet: XLSX.WorkSheet, headerRow: number, patterns: string[]): number {
  const range = XLSX.utils.decode_range(sheet['!ref'] || 'A1');

  for (let col = 0; col <= range.e.c; col++) {
    const cellRef = XLSX.utils.encode_cell({ r: headerRow, c: col });
    const cell = sheet[cellRef];
    if (!cell) continue;

    const value = (cell.v || '').toString().toUpperCase().trim();
    for (const pattern of patterns) {
      if (value === pattern.toUpperCase().trim()) {
        return col;
      }
    }
  }

  return -1;
}

/**
 * Find the plate column (PlacaVeículo, not PlacaCarreta)
 */
function findPlateColumn(sheet: XLSX.WorkSheet, headerRow: number): number {
  const range = XLSX.utils.decode_range(sheet['!ref'] || 'A1');

  // First try exact matches for vehicle plate
  for (let col = 0; col <= range.e.c; col++) {
    const cellRef = XLSX.utils.encode_cell({ r: headerRow, c: col });
    const cell = sheet[cellRef];
    if (!cell) continue;

    const value = (cell.v || '').toString().toUpperCase().trim();
    if (
      value === 'PLACAVEÍCULO' ||
      value === 'PLACAVEICULO' ||
      value === 'PLACA VEÍCULO' ||
      value === 'PLACA VEICULO' ||
      value === 'PLACA CAVALO' ||
      value === 'PLACACAVALO'
    ) {
      return col;
    }
  }

  // Fallback: first column containing "PLACA" that doesn't contain "CARRETA"
  for (let col = 0; col <= range.e.c; col++) {
    const cellRef = XLSX.utils.encode_cell({ r: headerRow, c: col });
    const cell = sheet[cellRef];
    if (!cell) continue;

    const value = (cell.v || '').toString().toUpperCase().trim();
    if (value.includes('PLACA') && !value.includes('CARRETA')) {
      return col;
    }
  }

  return -1;
}

/**
 * Find the carreta plate column
 */
function findCarretaColumn(sheet: XLSX.WorkSheet, headerRow: number): number {
  const range = XLSX.utils.decode_range(sheet['!ref'] || 'A1');

  for (let col = 0; col <= range.e.c; col++) {
    const cellRef = XLSX.utils.encode_cell({ r: headerRow, c: col });
    const cell = sheet[cellRef];
    if (!cell) continue;

    const value = (cell.v || '').toString().toUpperCase().trim();
    if (value.includes('CARRETA')) {
      return col;
    }
  }

  return -1;
}

/**
 * Determine temperature range from CET value and sensor type
 * CET is the maximum allowed temperature
 * rangeMin is determined by sensor type:
 * - CONGELADO: rangeMin = -50 (very low floor for frozen goods)
 * - REFRIADO: rangeMin = -50 (very low floor for refrigerated goods)
 * The CET value IS the rangeMax
 */
function cetToRange(cetValue: any, tipoSensor: string): { min: number | null; max: number | null; valid: boolean } {
  if (cetValue === null || cetValue === undefined || cetValue === '') {
    return { min: null, max: null, valid: false };
  }

  const cetNum = typeof cetValue === 'number' ? cetValue : parseFloat(String(cetValue).replace(',', '.'));
  if (isNaN(cetNum)) {
    return { min: null, max: null, valid: false };
  }

  // CET is the max temperature allowed
  // Use a very low floor as rangeMin since we only care about the upper limit
  return {
    min: -50,
    max: cetNum,
    valid: true,
  };
}

/**
 * Parse master file and extract journey data
 */
export function parseMasterFileInBackend(fileBuffer: Buffer): MasterTrip[] {
  try {
    const workbook = XLSX.read(fileBuffer);
    const sheet = workbook.Sheets[workbook.SheetNames[0]];
    if (!sheet) return [];

    const headerRow = findHeaderRow(sheet);
    const range = XLSX.utils.decode_range(sheet['!ref'] || 'A1');

    // Log headers for debugging
    const headers: string[] = [];
    for (let col = 0; col <= range.e.c; col++) {
      const cellRef = XLSX.utils.encode_cell({ r: headerRow, c: col });
      const cell = sheet[cellRef];
      headers.push(cell ? String(cell.v).trim() : '');
    }
    console.log('[TXTEMP] Headers found:', headers.join(' | '));

    // Find column indices
    const placaCol = findPlateColumn(sheet, headerRow);
    const carretaCol = findCarretaColumn(sheet, headerRow);
    const origemCol = findColumnByPattern(sheet, headerRow, ['ORIGEM']);
    const destinoCol = findColumnByPattern(sheet, headerRow, ['DESTINO']);
    const inicioCol = findColumnByPattern(sheet, headerRow, ['EMISSÃO', 'EMISSAO', 'DATA EMISSÃO', 'DATA EMISSAO', 'INICIO', 'INÍCIO']);
    const fimCol = findColumnByPattern(sheet, headerRow, ['DATA FIM', 'FIM', 'RETORNO']);
    const tipoSensorCol = findColumnByPattern(sheet, headerRow, ['TIPO DE SENSOR', 'TIPO_SENSOR', 'SENSOR']);

    // Try to find CET column first (exact match), then FAIXA
    const cetCol = findColumnExact(sheet, headerRow, ['CET']);
    const faixaCol = cetCol === -1 ? findColumnByPattern(sheet, headerRow, ['FAIXA', 'TEMPERATURA CADASTRA']) : -1;

    console.log(`[TXTEMP] Column mapping: placa=${placaCol}, carreta=${carretaCol}, origem=${origemCol}, destino=${destinoCol}, inicio=${inicioCol}, fim=${fimCol}, cet=${cetCol}, faixa=${faixaCol}, tipoSensor=${tipoSensorCol}`);

    if (placaCol === -1) {
      console.warn('[TXTEMP] Could not find plate column');
      return [];
    }

    if (inicioCol === -1 || fimCol === -1) {
      console.warn('[TXTEMP] Could not find date columns');
      return [];
    }

    // Extract data rows
    const trips: MasterTrip[] = [];

    for (let row = headerRow + 1; row <= range.e.r; row++) {
      // Get placa
      const placaRef = XLSX.utils.encode_cell({ r: row, c: placaCol });
      const placaCell = sheet[placaRef];
      const placa = (placaCell?.v || '').toString().trim().toUpperCase();

      // Validate placa
      if (!isValidPlate(placa)) {
        continue;
      }

      // Get dates - CRITICAL: Use formatted string (w) when available to avoid DD/MM swap
      // Excel stores dates as serial numbers which can be ambiguous for DD/MM vs MM/DD
      // The 'w' field contains the formatted string as displayed in Excel (respects locale)
      const inicioRef = XLSX.utils.encode_cell({ r: row, c: inicioCol });
      const fimRef = XLSX.utils.encode_cell({ r: row, c: fimCol });

      const inicioCell = sheet[inicioRef];
      const fimCell = sheet[fimRef];

      // Prefer formatted string (w) over raw value (v) for dates
      // This avoids the DD/MM vs MM/DD ambiguity in Excel serial numbers
      const inicioVal = inicioCell?.w || inicioCell?.v;
      const fimVal = fimCell?.w || fimCell?.v;

      const inicioResult = parseFlexDate(inicioVal);
      const fimResult = parseFlexDate(fimVal);

      if (!inicioResult.valid || !inicioResult.date || !fimResult.valid || !fimResult.date) {
        continue;
      }

      // Get tipo sensor
      let tipoSensor = '';
      if (tipoSensorCol !== -1) {
        const tipoRef = XLSX.utils.encode_cell({ r: row, c: tipoSensorCol });
        const tipoCell = sheet[tipoRef];
        tipoSensor = (tipoCell?.v || '').toString().trim();
      }

      // Get temperature range
      let faixa = '';
      let rangeMin: number | null = null;
      let rangeMax: number | null = null;

      if (cetCol !== -1) {
        // CET column found - use CET value as rangeMax
        const cetRef = XLSX.utils.encode_cell({ r: row, c: cetCol });
        const cetCell = sheet[cetRef];
        const cetValue = cetCell?.v;
        
        const cetRange = cetToRange(cetValue, tipoSensor);
        rangeMin = cetRange.min;
        rangeMax = cetRange.max;
        faixa = cetValue !== null && cetValue !== undefined ? `CET ${cetValue}` : '';
        
        if (!cetRange.valid) {
          // Skip rows without valid CET
          continue;
        }
      } else if (faixaCol !== -1) {
        // FAIXA column found - parse as range text
        const faixaRef = XLSX.utils.encode_cell({ r: row, c: faixaCol });
        const faixaCell = sheet[faixaRef];
        faixa = (faixaCell?.v || '').toString().trim();

        const faixaRange = parseTemperatureRange(faixa);
        rangeMin = faixaRange.min;
        rangeMax = faixaRange.max;

        if (!faixaRange.valid) {
          // Try last 4 columns as fallback
          for (let i = Math.max(0, range.e.c - 3); i <= range.e.c; i++) {
            const cellRef = XLSX.utils.encode_cell({ r: row, c: i });
            const cell = sheet[cellRef];
            const value = (cell?.v || '').toString().trim();
            const parsed = parseTemperatureRange(value);
            if (parsed.valid) {
              faixa = value;
              rangeMin = parsed.min;
              rangeMax = parsed.max;
              break;
            }
          }
        }
      }

      // Get other fields
      const carreta = carretaCol !== -1 ? (sheet[XLSX.utils.encode_cell({ r: row, c: carretaCol })]?.v || '').toString().trim() : '';
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
        rangeMin,
        rangeMax,
        tipoSensor,
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

    console.log(`[TXTEMP] Parsed ${trips.length} valid trips from master file`);
    console.log(`[TXTEMP] Unique plates: ${new Set(trips.map(t => t.placa)).size}`);
    console.log(`[TXTEMP] With valid range: ${trips.filter(t => t.rangeMin !== null && t.rangeMax !== null).length}`);

    return trips;
  } catch (error) {
    console.error('[TXTEMP] Error parsing master file:', error);
    return [];
  }
}
