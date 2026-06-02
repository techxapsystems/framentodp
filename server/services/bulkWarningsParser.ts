/**
 * Parser for bulk warning imports from Excel files
 * Handles validation, normalization, and template matching
 */

import * as XLSX from 'xlsx';
import { matchTemplate, WarningTemplate } from './warningTemplates';

export interface BulkWarningRecord {
  condutor: string;
  cpf: string;
  matricula?: string;
  operacao: string;
  cargo?: string;
  placa: string;
  motivo: string;
  dataInfracao: string;
  tipo: 'advertencia' | 'suspensao';
  template?: WarningTemplate;
  errors?: string[];
}

export interface ParseResult {
  success: boolean;
  records: BulkWarningRecord[];
  totalRecords: number;
  validRecords: number;
  invalidRecords: number;
  errors: string[];
}

/**
 * Normalize a date string to DD/MM/YYYY format
 */
function normalizeDate(dateStr: string | number | Date | undefined): string | null {
  if (!dateStr) return null;

  // If it's a number (Excel date serial), convert it
  if (typeof dateStr === 'number') {
    const date = new Date((dateStr - 25569) * 86400 * 1000);
    return date.toLocaleDateString('pt-BR');
  }

  // If it's already a Date object
  if (dateStr instanceof Date) {
    return dateStr.toLocaleDateString('pt-BR');
  }

  // If it's a string, try to parse it
  const str = String(dateStr).trim();
  
  // Already in DD/MM/YYYY format
  if (/^\d{2}\/\d{2}\/\d{4}$/.test(str)) {
    return str;
  }

  // Try to parse ISO format (YYYY-MM-DD)
  if (/^\d{4}-\d{2}-\d{2}$/.test(str)) {
    const [year, month, day] = str.split('-');
    return `${day}/${month}/${year}`;
  }

  return null;
}

/**
 * Normalize a CPF string (remove formatting)
 */
function normalizeCPF(cpf: string | undefined): string | null {
  if (!cpf) return null;
  return String(cpf).replace(/\D/g, '').trim() || null;
}

/**
 * Validate CPF format (basic check)
 */
function isValidCPF(cpf: string | null): boolean {
  if (!cpf) return false;
  const clean = cpf.replace(/\D/g, '');
  return clean.length === 11;
}

/**
 * Parse Excel file for bulk warning import
 */
export function parseWarningsExcel(fileBuffer: Buffer): ParseResult {
  const errors: string[] = [];
  const records: BulkWarningRecord[] = [];

  try {
    // Read workbook
    const workbook = XLSX.read(fileBuffer, { type: 'buffer' });
    const worksheet = workbook.Sheets[workbook.SheetNames[0]];

    if (!worksheet) {
      return {
        success: false,
        records: [],
        totalRecords: 0,
        validRecords: 0,
        invalidRecords: 0,
        errors: ['Nenhuma aba encontrada no arquivo Excel'],
      };
    }

    // Convert to JSON
    const rows = XLSX.utils.sheet_to_json(worksheet, { defval: '' });

    if (rows.length === 0) {
      return {
        success: false,
        records: [],
        totalRecords: 0,
        validRecords: 0,
        invalidRecords: 0,
        errors: ['Arquivo Excel vazio'],
      };
    }

    // Process each row
    let validCount = 0;
    let invalidCount = 0;

    for (let i = 0; i < rows.length; i++) {
      const row = rows[i] as any;
      const recordErrors: string[] = [];

      // Extract fields (handle various column name variations)
      const condutor = (row['Condutor'] || row['condutor'] || '').toString().trim();
      const cpf = normalizeCPF(row['CPF'] || row['cpf']);
      const matricula = (row['Matrícula'] || row['matricula'] || '').toString().trim();
      const operacao = (row['Operação'] || row['operacao'] || '').toString().trim();
      const cargo = (row['Cargo'] || row['cargo'] || '').toString().trim();
      const placa = (row['Placa'] || row['placa'] || '').toString().trim();
      const motivo = (row['Motivo'] || row['motivo'] || '').toString().trim();
      const dataInfracao = normalizeDate(row['Data da Infração'] || row['data_infracao'] || row['DataInfracao']);

      // Validate required fields
      if (!condutor) recordErrors.push('Condutor não informado');
      if (!cpf || !isValidCPF(cpf)) recordErrors.push('CPF inválido ou não informado');
      if (!operacao) recordErrors.push('Operação não informada');
      if (!placa) recordErrors.push('Placa não informada');
      if (!dataInfracao) recordErrors.push('Data da infração inválida ou não informada');

      // Try to match template based on motivo
      let template: WarningTemplate | undefined;
      let tipo: 'advertencia' | 'suspensao' = 'advertencia';

      if (motivo) {
        template = matchTemplate(motivo);
        // If template is suspension, mark as such
        if (template?.tipo === 'suspensao') {
          tipo = 'suspensao';
        }
      }

      const record: BulkWarningRecord = {
        condutor,
        cpf: cpf || '',
        matricula,
        operacao,
        cargo,
        placa,
        motivo,
        dataInfracao: dataInfracao || '',
        tipo,
        template,
        errors: recordErrors.length > 0 ? recordErrors : undefined,
      };

      records.push(record);

      if (recordErrors.length === 0) {
        validCount++;
      } else {
        invalidCount++;
      }
    }

    return {
      success: invalidCount === 0,
      records,
      totalRecords: rows.length,
      validRecords: validCount,
      invalidRecords: invalidCount,
      errors,
    };
  } catch (error) {
    const errorMsg = error instanceof Error ? error.message : 'Erro desconhecido';
    return {
      success: false,
      records: [],
      totalRecords: 0,
      validRecords: 0,
      invalidRecords: 0,
      errors: [`Erro ao processar arquivo Excel: ${errorMsg}`],
    };
  }
}

/**
 * Validate a single warning record
 */
export function validateWarningRecord(record: BulkWarningRecord): string[] {
  const errors: string[] = [];

  if (!record.condutor?.trim()) errors.push('Condutor não informado');
  if (!record.cpf || !isValidCPF(record.cpf)) errors.push('CPF inválido');
  if (!record.operacao?.trim()) errors.push('Operação não informada');
  if (!record.placa?.trim()) errors.push('Placa não informada');
  if (!record.dataInfracao?.trim()) errors.push('Data da infração não informada');

  return errors;
}

/**
 * Prepare warning record for database insertion
 */
export function prepareWarningForInsertion(record: BulkWarningRecord, userId: number) {
  return {
    conductorName: record.condutor,
    cpf: record.cpf,
    matricula: record.matricula || null,
    operacao: record.operacao,
    placa: record.placa,
    tipo: record.tipo,
    categoria: record.template?.categoria || 'generico',
    nivelAdvertencia: record.tipo === 'suspensao' ? 'suspensao' : 'aviso1',
    motivo: record.motivo,
    dataInfracao: record.dataInfracao,
    aplicadoPor: userId,
    templateId: record.template?.id,
  };
}
