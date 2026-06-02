import { describe, it, expect } from 'vitest';
import { parseWarningsExcel, validateWarningRecord, prepareWarningForInsertion, BulkWarningRecord } from './bulkWarningsParser';
import * as XLSX from 'xlsx';

describe('bulkWarningsParser', () => {
  describe('parseWarningsExcel', () => {
    it('should parse valid Excel file with warning records', () => {
      // Create test data
      const testData = [
        {
          Condutor: 'HUGO ALEOTTE TOMAZ DE AQUINO',
          CPF: '357.769.058-50',
          Matrícula: '6458',
          Operação: 'BRF EMBU',
          Cargo: 'MOTORISTA DE CARRETA',
          Placa: 'LMP3H58',
          Motivo: 'Dissidia e insubordinação',
          'Data da Infração': '30/04/2026',
        },
      ];

      // Create workbook
      const ws = XLSX.utils.json_to_sheet(testData);
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, 'Planilha1');
      const buffer = XLSX.write(wb, { bookType: 'xlsx', type: 'buffer' });

      const result = parseWarningsExcel(buffer as Buffer);

      expect(result.success).toBe(true);
      expect(result.totalRecords).toBe(1);
      expect(result.validRecords).toBe(1);
      expect(result.invalidRecords).toBe(0);
      expect(result.records.length).toBe(1);
      expect(result.records[0].condutor).toBe('HUGO ALEOTTE TOMAZ DE AQUINO');
      expect(result.records[0].cpf).toBe('35776905850');
      expect(result.records[0].placa).toBe('LMP3H58');
    });

    it('should detect invalid records with missing required fields', () => {
      const testData = [
        {
          Condutor: 'JOHN DOE',
          CPF: '', // Missing CPF
          Operação: 'BRF EMBU',
          Placa: 'ABC1234',
          Motivo: 'Test',
          'Data da Infração': '30/04/2026',
        },
      ];

      const ws = XLSX.utils.json_to_sheet(testData);
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, 'Planilha1');
      const buffer = XLSX.write(wb, { bookType: 'xlsx', type: 'buffer' });

      const result = parseWarningsExcel(buffer as Buffer);

      expect(result.invalidRecords).toBe(1);
      expect(result.records[0].errors).toBeDefined();
      expect(result.records[0].errors?.some(e => e.includes('CPF'))).toBe(true);
    });

    it('should normalize CPF format', () => {
      const testData = [
        {
          Condutor: 'JOHN DOE',
          CPF: '357.769.058-50',
          Operação: 'BRF EMBU',
          Placa: 'ABC1234',
          Motivo: 'Test',
          'Data da Infração': '30/04/2026',
        },
      ];

      const ws = XLSX.utils.json_to_sheet(testData);
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, 'Planilha1');
      const buffer = XLSX.write(wb, { bookType: 'xlsx', type: 'buffer' });

      const result = parseWarningsExcel(buffer as Buffer);

      expect(result.records[0].cpf).toBe('35776905850');
    });

    it('should handle empty Excel file', () => {
      const ws = XLSX.utils.json_to_sheet([]);
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, 'Planilha1');
      const buffer = XLSX.write(wb, { bookType: 'xlsx', type: 'buffer' });

      const result = parseWarningsExcel(buffer as Buffer);

      expect(result.success).toBe(false);
      expect(result.errors.length).toBeGreaterThan(0);
    });

    it('should match template based on motivo', () => {
      const testData = [
        {
          Condutor: 'JOHN DOE',
          CPF: '357.769.058-50',
          Operação: 'BRF EMBU',
          Placa: 'ABC1234',
          Motivo: 'Cinto de segurança não utilizado',
          'Data da Infração': '30/04/2026',
        },
      ];

      const ws = XLSX.utils.json_to_sheet(testData);
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, 'Planilha1');
      const buffer = XLSX.write(wb, { bookType: 'xlsx', type: 'buffer' });

      const result = parseWarningsExcel(buffer as Buffer);

      expect(result.records[0].template).toBeDefined();
      expect(result.records[0].template?.categoria).toBe('cinto_seguranca');
    });

    it('should detect suspension type from template', () => {
      const testData = [
        {
          Condutor: 'JOHN DOE',
          CPF: '357.769.058-50',
          Operação: 'BRF EMBU',
          Placa: 'ABC1234',
          Motivo: 'fumar dirigindo',
          'Data da Infração': '30/04/2026',
        },
      ];

      const ws = XLSX.utils.json_to_sheet(testData);
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, 'Planilha1');
      const buffer = XLSX.write(wb, { bookType: 'xlsx', type: 'buffer' });

      const result = parseWarningsExcel(buffer as Buffer);

      expect(result.records[0].tipo).toBe('suspensao');
      expect(result.records[0].template?.diasSuspensao).toBe(5);
    });

    it('should handle multiple records with mixed validity', () => {
      const testData = [
        {
          Condutor: 'JOHN DOE',
          CPF: '357.769.058-50',
          Operação: 'BRF EMBU',
          Placa: 'ABC1234',
          Motivo: 'Test',
          'Data da Infração': '30/04/2026',
        },
        {
          Condutor: 'JANE SMITH',
          CPF: '', // Invalid
          Operação: 'BRF LONDRINA',
          Placa: 'XYZ9876',
          Motivo: 'Test',
          'Data da Infração': '01/05/2026',
        },
      ];

      const ws = XLSX.utils.json_to_sheet(testData);
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, 'Planilha1');
      const buffer = XLSX.write(wb, { bookType: 'xlsx', type: 'buffer' });

      const result = parseWarningsExcel(buffer as Buffer);

      expect(result.totalRecords).toBe(2);
      expect(result.validRecords).toBe(1);
      expect(result.invalidRecords).toBe(1);
    });
  });

  describe('validateWarningRecord', () => {
    it('should validate a complete warning record', () => {
      const record: BulkWarningRecord = {
        condutor: 'JOHN DOE',
        cpf: '35776905850',
        operacao: 'BRF EMBU',
        placa: 'ABC1234',
        motivo: 'Test',
        dataInfracao: '30/04/2026',
        tipo: 'advertencia',
      };

      const errors = validateWarningRecord(record);
      expect(errors.length).toBe(0);
    });

    it('should detect missing required fields', () => {
      const record: BulkWarningRecord = {
        condutor: '',
        cpf: '',
        operacao: '',
        placa: '',
        motivo: 'Test',
        dataInfracao: '',
        tipo: 'advertencia',
      };

      const errors = validateWarningRecord(record);
      expect(errors.length).toBeGreaterThan(0);
      expect(errors.some(e => e.includes('Condutor'))).toBe(true);
      expect(errors.some(e => e.includes('CPF'))).toBe(true);
    });
  });

  describe('prepareWarningForInsertion', () => {
    it('should prepare warning record for database insertion', () => {
      const record: BulkWarningRecord = {
        condutor: 'JOHN DOE',
        cpf: '35776905850',
        matricula: '6458',
        operacao: 'BRF EMBU',
        cargo: 'MOTORISTA',
        placa: 'ABC1234',
        motivo: 'Cinto de segurança',
        dataInfracao: '30/04/2026',
        tipo: 'advertencia',
        template: {
          id: 'template_003',
          nome: 'Advertência - Cinto de Segurança',
          tipo: 'advertencia',
          categoria: 'cinto_seguranca',
          palavrasChave: ['cinto'],
          texto: 'Test template',
        },
      };

      const prepared = prepareWarningForInsertion(record, 1);

      expect(prepared.conductorName).toBe('JOHN DOE');
      expect(prepared.cpf).toBe('35776905850');
      expect(prepared.operacao).toBe('BRF EMBU');
      expect(prepared.placa).toBe('ABC1234');
      expect(prepared.tipo).toBe('advertencia');
      expect(prepared.categoria).toBe('cinto_seguranca');
      expect(prepared.aplicadoPor).toBe(1);
      expect(prepared.templateId).toBe('template_003');
    });
  });
});
