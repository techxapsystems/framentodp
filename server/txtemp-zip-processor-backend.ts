/**
 * TXTEMP ZIP Processor (Backend)
 * Processes ZIP files containing telemetry data
 */

import JSZip from 'jszip';
import * as XLSX from 'xlsx';
import { PositionRecord, extractPlateFromFilename, parseFlexDate, parseTemperature } from './txtemp-utils';

export interface PositionFileMap {
  [placa: string]: PositionRecord[];
}

/**
 * Find header row in Excel sheet
 */
function findHeaderRow(sheet: XLSX.WorkSheet, maxRows: number = 20): number {
  const range = XLSX.utils.decode_range(sheet['!ref'] || 'A1');
  const rows = Math.min(range.e.r + 1, maxRows);

  for (let row = 0; row < rows; row++) {
    let hasTemp = false;
    let hasDate = false;

    for (let col = 0; col <= range.e.c; col++) {
      const cellRef = XLSX.utils.encode_cell({ r: row, c: col });
      const cell = sheet[cellRef];
      if (!cell) continue;

      const value = (cell.v || '').toString().toUpperCase();
      if (value.includes('TEMP')) hasTemp = true;
      if (value.includes('DATA') || value.includes('HORA')) hasDate = true;
    }

    if (hasTemp && hasDate) {
      return row;
    }
  }

  return 0;
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
 * Parse Excel file and extract position records
 */
function parseExcelFile(fileBuffer: Buffer): PositionRecord[] {
  try {
    const workbook = XLSX.read(fileBuffer);
    const sheet = workbook.Sheets[workbook.SheetNames[0]];
    if (!sheet) return [];

    const headerRow = findHeaderRow(sheet);

    const dateCol = findColumnByPattern(sheet, headerRow, ['DATA', 'HORA', 'DATE', 'TIME']);
    const tempCol = findColumnByPattern(sheet, headerRow, ['TEMP', 'TEMPERATURA', 'TEMPERATURE']);

    if (dateCol === -1 || tempCol === -1) {
      return [];
    }

    const records: PositionRecord[] = [];
    const range = XLSX.utils.decode_range(sheet['!ref'] || 'A1');

    for (let row = headerRow + 1; row <= range.e.r; row++) {
      const dateRef = XLSX.utils.encode_cell({ r: row, c: dateCol });
      const tempRef = XLSX.utils.encode_cell({ r: row, c: tempCol });

      const dateCell = sheet[dateRef];
      const tempCell = sheet[tempRef];

      if (!dateCell) continue;

      const dateVal = dateCell.v;
      const tempVal = tempCell?.v;

      const parsedDateResult = parseFlexDate(dateVal);
      const temperature = parseTemperature(tempVal);

      if (parsedDateResult.valid && parsedDateResult.date) {
        records.push({
          parsedDate: parsedDateResult.date,
          temperature,
        });
      }
    }

    return records;
  } catch (error) {
    console.error('Error parsing Excel file:', error);
    return [];
  }
}

/**
 * Parse CSV file and extract position records
 */
function parseCSVFile(fileBuffer: Buffer): PositionRecord[] {
  try {
    const text = fileBuffer.toString('utf-8');
    const lines = text.split('\n').filter((line) => line.trim());

    if (lines.length < 2) return [];

    const header = lines[0].split(',').map((h) => h.trim().toUpperCase());
    const dateColIdx = header.findIndex((h) => h.includes('DATA') || h.includes('HORA'));
    const tempColIdx = header.findIndex((h) => h.includes('TEMP'));

    if (dateColIdx === -1 || tempColIdx === -1) {
      return [];
    }

    const records: PositionRecord[] = [];
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

    return records;
  } catch (error) {
    console.error('Error parsing CSV file:', error);
    return [];
  }
}

/**
 * Process ZIP file and extract telemetry data by plate
 */
export async function processZipFileInBackend(zipBuffer: Buffer): Promise<PositionFileMap> {
  const result: PositionFileMap = {};

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
        const fileBuffer = await file.async('nodebuffer');
        let records: PositionRecord[] = [];

        if (ext === 'csv') {
          records = parseCSVFile(fileBuffer);
        } else {
          records = parseExcelFile(fileBuffer);
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

/**
 * Merge telemetry records from multiple files for same plate
 */
export function mergeAndSortRecords(records: PositionRecord[]): PositionRecord[] {
  return records
    .filter((r) => r.parsedDate !== null)
    .sort((a, b) => (a.parsedDate?.getTime() || 0) - (b.parsedDate?.getTime() || 0));
}

/**
 * Filter records within time window
 */
export function filterRecordsByTimeWindow(
  records: PositionRecord[],
  startDate: Date,
  endDate: Date,
  toleranceMs: number = 60 * 60 * 1000
): PositionRecord[] {
  const windowStart = new Date(startDate.getTime() - toleranceMs);
  const windowEnd = new Date(endDate.getTime() + toleranceMs);

  return records.filter((r) => {
    if (!r.parsedDate) return false;
    return r.parsedDate >= windowStart && r.parsedDate <= windowEnd;
  });
}
