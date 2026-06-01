/**
 * TXTEMP Master File Parser V2 (Backend)
 * Parses the new master trip file structure with 129 viagens
 * 
 * Columns:
 * 1: Referência
 * 2: Load/DT
 * 3: AE
 * 4: Placaveículo
 * 5: Placacarreta
 * 6: Origem
 * 7: Destino
 * 8: Valor carga (R$)
 * 9: Usuário emitiu AE
 * 10: Tipo de Sensor 1
 * 11: TRP_REAL
 * 12: TIPO_VEÍCULO
 * 13: MERCADO
 * 14: CET
 * 15: TELEMETRIA_FRIO
 * 16: EFICIÊNCIA_FINAL
 * 17: Data Emissão
 * 18: Data Fim
 * 19: faixa temperatura
 */

import * as XLSX from 'xlsx';
import { isValidPlate, parseFlexDate, parseTemperatureRange } from './txtemp-utils';

export interface MasterTripV2 {
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
  eficienciaFinal?: number;
  rowIndex: number;
}

/**
 * Parse master file V2 and extract journey data
 * Uses fixed column positions for the new structure
 */
export function parseMasterFileV2(fileBuffer: Buffer): MasterTripV2[] {
  try {
    const workbook = XLSX.read(fileBuffer);
    const sheet = workbook.Sheets[workbook.SheetNames[0]];
    if (!sheet) return [];

    const range = XLSX.utils.decode_range(sheet['!ref'] || 'A1');

    // Fixed column positions (0-based)
    const placaCol = 3;        // Placaveículo
    const carretaCol = 4;      // Placacarreta
    const origemCol = 5;       // Origem
    const destinoCol = 6;      // Destino
    const inicioCol = 16;      // Data Emissão
    const fimCol = 17;         // Data Fim
    const faixaCol = 18;       // faixa temperatura
    const tipoSensorCol = 9;   // Tipo de Sensor 1
    const eficienciaFinalCol = 15; // EFICIÊNCIA_FINAL

    console.log('[TXTEMP V2] Parsing master file with fixed columns');

    // Extract data rows
    const trips: MasterTripV2[] = [];

    for (let row = 1; row <= range.e.r; row++) {
      // Get placa
      const placaRef = XLSX.utils.encode_cell({ r: row, c: placaCol });
      const placaCell = sheet[placaRef];
      const placa = (placaCell?.v || placaCell?.w || '').toString().trim().toUpperCase();

      // Validate placa
      if (!isValidPlate(placa)) {
        continue;
      }

      // Get dates - use formatted string (w) when available
      const inicioRef = XLSX.utils.encode_cell({ r: row, c: inicioCol });
      const fimRef = XLSX.utils.encode_cell({ r: row, c: fimCol });

      const inicioCell = sheet[inicioRef];
      const fimCell = sheet[fimRef];

      const inicioVal = inicioCell?.w || inicioCell?.v;
      const fimVal = fimCell?.w || fimCell?.v;

      const inicioResult = parseFlexDate(inicioVal);
      const fimResult = parseFlexDate(fimVal);

      if (!inicioResult.valid || !inicioResult.date || !fimResult.valid || !fimResult.date) {
        console.warn(`[TXTEMP V2] Invalid dates for placa ${placa}: inicio=${inicioVal}, fim=${fimVal}`);
        continue;
      }

      // Get faixa temperatura
      const faixaRef = XLSX.utils.encode_cell({ r: row, c: faixaCol });
      const faixaCell = sheet[faixaRef];
      const faixa = (faixaCell?.v || faixaCell?.w || '').toString().trim();

      // Parse faixa
      const faixaRange = parseTemperatureRange(faixa);

      if (!faixaRange.valid) {
        console.warn(`[TXTEMP V2] Invalid faixa for placa ${placa}: ${faixa}`);
        continue;
      }

      // Get tipo sensor
      const tipoRef = XLSX.utils.encode_cell({ r: row, c: tipoSensorCol });
      const tipoCell = sheet[tipoRef];
      const tipoSensor = (tipoCell?.v || tipoCell?.w || '').toString().trim();

      // Get other fields
      const carreta = (sheet[XLSX.utils.encode_cell({ r: row, c: carretaCol })]?.v || '').toString().trim();
      const origem = (sheet[XLSX.utils.encode_cell({ r: row, c: origemCol })]?.v || '').toString().trim();
      const destino = (sheet[XLSX.utils.encode_cell({ r: row, c: destinoCol })]?.v || '').toString().trim();
      
      // Get EFICIÊNCIA_FINAL
      const eficienciaRef = XLSX.utils.encode_cell({ r: row, c: eficienciaFinalCol });
      const eficienciaCell = sheet[eficienciaRef];
      let eficienciaFinal: number | undefined;
      if (eficienciaCell?.v !== undefined && eficienciaCell?.v !== null) {
        const val = parseFloat(eficienciaCell.v.toString());
        if (!isNaN(val)) {
          eficienciaFinal = val;
        }
      }

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
        tipoSensor,
        eficienciaFinal,
        rowIndex: row,
      });
    }

    console.log(`[TXTEMP V2] Parsed ${trips.length} valid trips from master file`);
    console.log(`[TXTEMP V2] Unique plates: ${new Set(trips.map(t => t.placa)).size}`);

    return trips;
  } catch (error) {
    console.error('[TXTEMP V2] Error parsing master file:', error);
    return [];
  }
}
