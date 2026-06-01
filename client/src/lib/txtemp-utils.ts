/**
 * TXTEMP Utility Functions
 * Parsing, validation, and analysis functions for thermal efficiency analysis
 */

// ============================================================================
// TYPE DEFINITIONS
// ============================================================================

export interface ParsedDate {
  valid: boolean;
  date: Date | null;
  error?: string;
}

export interface TemperatureRange {
  min: number | null;
  max: number | null;
  valid: boolean;
}

export interface PositionRecord {
  parsedDate: Date | null;
  temperature: number | null;
  kmh?: number;
  city?: string;
  street?: string;
  latitude?: number;
  longitude?: number;
}

export interface AnalysisResult {
  placa: string;
  carreta: string;
  origem: string;
  destino: string;
  inicioViagem: Date;
  fimViagem: Date;
  faixa: string;
  rangeMin: number | null;
  rangeMax: number | null;
  eficiencia: number;
  status: 'within' | 'partial' | 'outside' | 'S/ ARQUIVO' | 'S/ DADOS' | 'S/ FAIXA';
  tempMedia: number;
  tempMin: number;
  tempMax: number;
  tempMediana: number;
  totalRegistros: number;
  registrosComTemp: number;
  timeWithinMs: number;
  timeOutsideMs: number;
}

// ============================================================================
// DATE PARSING
// ============================================================================

/**
 * Parse flexible date formats
 * Supports: Date objects, Excel serials, DD/MM/YYYY HH:MM, MM/DD/YYYY HH:MM, ISO
 */
export function parseFlexDate(dateVal: any): ParsedDate {
  // Already a Date object
  if (dateVal instanceof Date) {
    return { valid: !isNaN(dateVal.getTime()), date: dateVal };
  }

  // Excel serial number
  if (typeof dateVal === 'number') {
    try {
      const date = new Date((dateVal - 25569) * 86400 * 1000);
      return { valid: !isNaN(date.getTime()), date };
    } catch (e) {
      return { valid: false, date: null, error: 'Invalid Excel serial' };
    }
  }

  // String parsing
  if (typeof dateVal === 'string') {
    // Try DD/MM/YYYY HH:MM or MM/DD/YYYY HH:MM
    const brMatch = dateVal.match(/(\d{1,2})\/(\d{1,2})\/(\d{2,4})\s+(\d{1,2}):(\d{2})/);
    if (brMatch) {
      const [, part1, part2, yearStr, hourStr, minStr] = brMatch;
      const day = parseInt(part1);
      const month = parseInt(part2);
      const year = parseInt(yearStr) < 100 ? 2000 + parseInt(yearStr) : parseInt(yearStr);
      const hour = parseInt(hourStr);
      const min = parseInt(minStr);

      // Detect format: if day > 12, assume DD/MM, else ambiguous
      let finalDay = day;
      let finalMonth = month;
      if (day > 12 && month <= 12) {
        // DD/MM format
        finalDay = day;
        finalMonth = month;
      } else if (month > 12 && day <= 12) {
        // MM/DD format (US)
        finalDay = month;
        finalMonth = day;
      } else if (day <= 12 && month <= 12) {
        // Ambiguous - assume DD/MM (Brazilian)
        finalDay = day;
        finalMonth = month;
      }

      try {
        const date = new Date(year, finalMonth - 1, finalDay, hour, min);
        return { valid: !isNaN(date.getTime()), date };
      } catch (e) {
        return { valid: false, date: null, error: 'Invalid date values' };
      }
    }

    // Try ISO format
    try {
      const date = new Date(dateVal);
      return { valid: !isNaN(date.getTime()), date };
    } catch (e) {
      return { valid: false, date: null, error: 'Invalid ISO format' };
    }
  }

  return { valid: false, date: null, error: 'Unsupported date format' };
}

// ============================================================================
// TEMPERATURE PARSING
// ============================================================================

/**
 * Parse temperature value
 * Removes symbols (°, º), converts comma to dot
 */
export function parseTemperature(tempVal: any): number | null {
  if (tempVal === null || tempVal === undefined || tempVal === '' || tempVal === '-') {
    return null;
  }

  if (typeof tempVal === 'number') {
    return isNaN(tempVal) ? null : tempVal;
  }

  if (typeof tempVal === 'string') {
    const cleaned = tempVal.replace(/[°º]/g, '').replace(',', '.');
    const parsed = parseFloat(cleaned);
    return isNaN(parsed) ? null : parsed;
  }

  return null;
}

// ============================================================================
// TEMPERATURE RANGE PARSING
// ============================================================================

/**
 * Parse temperature range from text
 * Extracts min and max from patterns like "-18 a -12" or "2°C a 8°C"
 */
export function parseTemperatureRange(rangeText: string): TemperatureRange {
  if (!rangeText || typeof rangeText !== 'string') {
    return { min: null, max: null, valid: false };
  }

  // Check for invalid texts
  const invalidTexts = ['NÃO ACHEI', 'SEM CONTROLE', 'SEM CTRL', 'SEM FAIXA'];
  const upperText = rangeText.toUpperCase();
  if (invalidTexts.some((text) => upperText.includes(text))) {
    return { min: null, max: null, valid: false };
  }

  // Clean text: remove company names, labels, symbols
  let cleaned = upperText;
  const toRemove = [
    '\\*',
    '\\(',
    '\\)',
    '°C',
    '°',
    'FRAMENTO',
    'TIROLEZ',
    'RESFRIADO',
    'CONGELADO',
    'CONTINUO',
    'MISTA',
    'AB BRASIL',
  ];
  toRemove.forEach((pattern) => {
    cleaned = cleaned.replace(new RegExp(pattern, 'g'), ' ');
  });

  // Extract all numbers (including negative and decimal)
  const numberMatches = cleaned.match(/-?\d+(\.\d+)?/g);
  if (!numberMatches || numberMatches.length < 2) {
    return { min: null, max: null, valid: false };
  }

  const numbers = numberMatches.map((n) => parseFloat(n)).sort((a, b) => a - b);
  return {
    min: numbers[0],
    max: numbers[numbers.length - 1],
    valid: true,
  };
}

// ============================================================================
// PLATE VALIDATION AND EXTRACTION
// ============================================================================

/**
 * Validate plate format
 * Accepts ABC1234 (old) or ABC1D23 (Mercosul)
 */
export function isValidPlate(plate: string): boolean {
  if (!plate || typeof plate !== 'string') return false;
  const oldFormat = /^[A-Z]{3}\d{4}$/;
  const mercosulFormat = /^[A-Z]{3}\d[A-Z]\d{2}$/;
  return oldFormat.test(plate) || mercosulFormat.test(plate);
}

/**
 * Extract plate from filename
 */
export function extractPlateFromFilename(filename: string): string | null {
  if (!filename) return null;

  // Remove path and extension
  const nameOnly = filename.split('/').pop()?.split('.')[0] || '';

  // Try direct regex match
  const oldFormat = /[A-Z]{3}\d{4}/;
  const mercosulFormat = /[A-Z]{3}\d[A-Z]\d{2}/;

  const oldMatch = nameOnly.match(oldFormat);
  if (oldMatch) return oldMatch[0];

  const mercosulMatch = nameOnly.match(mercosulFormat);
  if (mercosulMatch) return mercosulMatch[0];

  return null;
}

// ============================================================================
// EFFICIENCY CALCULATION
// ============================================================================

/**
 * Calculate efficiency based on time within temperature range
 * Returns percentage of time that temperature was within the specified range
 */
export function calculateEfficiency(
  records: PositionRecord[],
  rangeMin: number,
  rangeMax: number
): {
  eficiencia: number;
  timeWithinMs: number;
  timeOutsideMs: number;
  status: 'within' | 'partial' | 'outside' | 'S/ DADOS';
} {
  // Filter valid records
  const validRecords = records
    .filter((r) => r.parsedDate !== null && r.temperature !== null)
    .sort((a, b) => (a.parsedDate?.getTime() || 0) - (b.parsedDate?.getTime() || 0));

  if (validRecords.length === 0) {
    return { eficiencia: 0, timeWithinMs: 0, timeOutsideMs: 0, status: 'S/ DADOS' };
  }

  if (validRecords.length === 1) {
    return { eficiencia: 0, timeWithinMs: 0, timeOutsideMs: 0, status: 'S/ DADOS' };
  }

  let timeWithinMs = 0;
  let timeOutsideMs = 0;

  // Process consecutive pairs
  for (let i = 0; i < validRecords.length - 1; i++) {
    const current = validRecords[i];
    const next = validRecords[i + 1];

    const intervalMs = (next.parsedDate?.getTime() || 0) - (current.parsedDate?.getTime() || 0);
    if (intervalMs <= 0) continue;

    const currentInRange = (current.temperature || 0) >= rangeMin && (current.temperature || 0) <= rangeMax;
    const nextInRange = (next.temperature || 0) >= rangeMin && (next.temperature || 0) <= rangeMax;

    if (currentInRange && nextInRange) {
      timeWithinMs += intervalMs;
    } else {
      timeOutsideMs += intervalMs;
    }
  }

  const totalTimeMs = timeWithinMs + timeOutsideMs;
  const eficiencia = totalTimeMs > 0 ? (timeWithinMs / totalTimeMs) * 100 : 0;

  let status: 'within' | 'partial' | 'outside' | 'S/ DADOS' = 'outside';
  if (eficiencia >= 100) status = 'within';
  else if (eficiencia >= 50) status = 'partial';
  else status = 'outside';

  return { eficiencia, timeWithinMs, timeOutsideMs, status };
}

// ============================================================================
// STATISTICS CALCULATION
// ============================================================================

/**
 * Calculate temperature statistics
 */
export function calculateTemperatureStats(records: PositionRecord[]): {
  media: number;
  min: number;
  max: number;
  mediana: number;
} {
  const temps = records
    .filter((r) => r.temperature !== null)
    .map((r) => r.temperature as number)
    .sort((a, b) => a - b);

  if (temps.length === 0) {
    return { media: 0, min: 0, max: 0, mediana: 0 };
  }

  const media = temps.reduce((a, b) => a + b, 0) / temps.length;
  const min = temps[0];
  const max = temps[temps.length - 1];

  let mediana = 0;
  if (temps.length % 2 === 0) {
    mediana = (temps[temps.length / 2 - 1] + temps[temps.length / 2]) / 2;
  } else {
    mediana = temps[Math.floor(temps.length / 2)];
  }

  return { media: Math.round(media * 10) / 10, min, max, mediana };
}
