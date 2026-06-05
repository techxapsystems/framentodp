/**
 * FRAMENTO BULK IMPORT PARSER
 * Processa planilhas Excel conforme regras oficiais v4
 */

import * as XLSX from 'xlsx';
import {
  mapColumns,
  normalizeHeaderName,
  normalizeCPF,
  normalizePlaca,
  timeToMinutes,
  parseDate,
  detectInfractions,
  detectStatusByColor,
  validateRequiredColumns,
  ParsedRow,
  WarningStatus,
} from './framentoRulesEngine';

export interface BulkImportResult {
  sheetName: string;
  totalRecords: number;
  validRecords: number;
  invalidRecords: number;
  warnings: ParsedWarning[];
  errors: string[];
}

export interface ParsedWarning {
  condutor: string;
  cpf: string;
  placa: string;
  operacao?: string;
  status: WarningStatus;
  infractions: string[];
  datas: string[];
  jornada?: string;
  intersticio?: string;
  refeicao?: string;
  erro?: string;
}

/**
 * Processa arquivo Excel conforme regras Framento v4
 */
export async function parseBulkImportFile(buffer: Buffer): Promise<BulkImportResult> {
  const workbook = XLSX.read(buffer, { cellFormula: false, cellStyles: true });
  
  // Encontra aba com "advert" no nome
  const advertSheet = findAdvertSheet(workbook.SheetNames);
  
  if (!advertSheet) {
    return {
      sheetName: '',
      totalRecords: 0,
      validRecords: 0,
      invalidRecords: 0,
      warnings: [],
      errors: ['Nenhuma aba com "advert" encontrada na planilha'],
    };
  }
  
  const worksheet = workbook.Sheets[advertSheet];
  const jsonData = XLSX.utils.sheet_to_json(worksheet, { header: 1 });
  
  if (!jsonData || jsonData.length < 2) {
    return {
      sheetName: advertSheet,
      totalRecords: 0,
      validRecords: 0,
      invalidRecords: 0,
      warnings: [],
      errors: ['Planilha vazia ou sem dados'],
    };
  }
  
  const headers = jsonData[0] as string[];
  
  // Valida colunas obrigatórias
  const validation = validateRequiredColumns(headers);
  if (!validation.valid) {
    return {
      sheetName: advertSheet,
      totalRecords: 0,
      validRecords: 0,
      invalidRecords: 0,
      warnings: [],
      errors: [`Colunas obrigatórias faltando: ${validation.missing.join(', ')}`],
    };
  }
  
  // Mapeia colunas
  const columnMapping = mapColumns(headers);
  
  // Processa linhas
  const warnings: ParsedWarning[] = [];
  const errors: string[] = [];
  let validCount = 0;
  let invalidCount = 0;
  
  for (let i = 1; i < jsonData.length; i++) {
    const row = jsonData[i] as any[];
    
    try {
      const parsed = parseRow(row, headers, columnMapping);
      
      if (!parsed) {
        invalidCount++;
        continue;
      }
      
      // Detecta infrações
      const infractions = detectInfractions(parsed);
      
      // Se não tem infração, marca como CONFERÊNCIA MANUAL
      if (infractions.length === 0) {
        warnings.push({
          condutor: parsed.condutor,
          cpf: parsed.cpf,
          placa: parsed.placa,
          operacao: parsed.operacao,
          status: 'CONFERÊNCIA MANUAL',
          infractions: [],
          datas: [formatData(parsed.inicio)],
          erro: 'Nenhuma infração detectada',
        });
        invalidCount++;
        continue;
      }
      
      // Detecta status pela cor
      const cor = getCellColor(worksheet, i, headers.indexOf(columnMapping.condutor || ''));
      const status = detectStatusByColor(cor);
      
      warnings.push({
        condutor: parsed.condutor,
        cpf: parsed.cpf,
        placa: parsed.placa,
        operacao: parsed.operacao,
        status,
        infractions: infractions.map(inf => inf.text),
        datas: [formatData(parsed.inicio)],
        jornada: `${Math.floor(parsed.jornada_sem_refeicao / 60)}h${String(parsed.jornada_sem_refeicao % 60).padStart(2, '0')}`,
        intersticio: parsed.intersticio ? `${Math.floor(parsed.intersticio / 60)}h${String(parsed.intersticio % 60).padStart(2, '0')}` : undefined,
        refeicao: parsed.refeicao ? `${Math.floor(parsed.refeicao / 60)}h${String(parsed.refeicao % 60).padStart(2, '0')}` : undefined,
      });
      
      if (status === 'ADVERTÊNCIA') {
        validCount++;
      } else {
        invalidCount++;
      }
    } catch (error) {
      invalidCount++;
      errors.push(`Linha ${i + 1}: ${(error as Error).message}`);
    }
  }
  
  return {
    sheetName: advertSheet,
    totalRecords: jsonData.length - 1,
    validRecords: validCount,
    invalidRecords: invalidCount,
    warnings,
    errors,
  };
}

/**
 * Encontra aba com "advert" no nome (maior número de semana)
 */
function findAdvertSheet(sheetNames: string[]): string | null {
  const advertSheets = sheetNames.filter(name => 
    normalizeHeaderName(name).includes('advert')
  );
  
  if (advertSheets.length === 0) return null;
  
  // Ordena por número de semana (maior primeiro)
  advertSheets.sort((a, b) => {
    const numA = extractWeekNumber(a);
    const numB = extractWeekNumber(b);
    return numB - numA;
  });
  
  return advertSheets[0];
}

/**
 * Extrai número de semana do nome da aba
 */
function extractWeekNumber(name: string): number {
  const match = name.match(/\d+/);
  return match ? parseInt(match[0]) : 0;
}

/**
 * Parseia uma linha da planilha
 */
function parseRow(row: any[], headers: string[], columnMapping: any): ParsedRow | null {
  try {
    // Busca valores pelas colunas mapeadas
    const getColumnValue = (field: keyof typeof columnMapping) => {
      const header = columnMapping[field];
      if (!header) return undefined;
      const idx = headers.indexOf(header);
      return idx >= 0 ? row[idx] : undefined;
    };
    
    const condutor = String(getColumnValue('condutor') || '').trim();
    const cpf = normalizeCPF(String(getColumnValue('cpf') || ''));
    const placa = normalizePlaca(String(getColumnValue('placa') || ''));
    const jornada_sem_refeicao = timeToMinutes(getColumnValue('jornada_sem_refeicao'));
    const inicio = parseDate(getColumnValue('inicio'));
    
    // Validações
    if (!condutor || !cpf || !placa || jornada_sem_refeicao === null || !inicio) {
      return null;
    }
    
    return {
      condutor,
      cpf,
      placa,
      jornada_sem_refeicao,
      inicio,
      operacao: String(getColumnValue('operacao') || '').trim() || undefined,
      cargo: String(getColumnValue('cargo') || '').trim() || undefined,
      intersticio: timeToMinutes(getColumnValue('intersticio')) || undefined,
      refeicao: timeToMinutes(getColumnValue('refeicao')) || undefined,
      fim: parseDate(getColumnValue('fim')) || undefined,
      matricula: String(getColumnValue('matricula') || '').trim() || undefined,
      data: parseDate(getColumnValue('data')) || undefined,
    };
  } catch (error) {
    return null;
  }
}

/**
 * Obtém cor da célula (aproximação)
 */
function getCellColor(worksheet: XLSX.WorkSheet, row: number, col: number): string | undefined {
  // Nota: XLSX não expõe cores facilmente. Esta é uma aproximação.
  // Em produção, usar biblioteca mais robusta como ExcelJS
  return undefined;
}

/**
 * Formata data para exibição
 */
function formatData(date: Date): string {
  return date.toLocaleDateString('pt-BR');
}
