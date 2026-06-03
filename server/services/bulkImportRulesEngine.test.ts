import { describe, it, expect } from 'vitest';
import { processWarningRow } from './bulkImportRulesEngine';

describe('Bulk Import Rules Engine', () => {
  const headers = [
    'Condutor',
    'CPF',
    'Operação',
    'Placa',
    'Tempo Jornada s/ Refeição',
    'Início Jornada',
    'Cargo',
    'Matrícula',
    'Total Refeição',
    'Fim Jornada',
    'Interstício',
  ];

  it('should process a valid warning row with jornada excess', () => {
    const row = {
      'Condutor': 'João Silva',
      'CPF': '123.456.789-10',
      'Operação': 'BRF Primária',
      'Placa': 'ABC-1234',
      'Tempo Jornada s/ Refeição': '09:30',
      'Início Jornada': '06/02/2026 06:00',
      'Cargo': 'Motorista',
      'Matrícula': 'M123',
      'Total Refeição': '01:00',
      'Fim Jornada': '17:30',
      'Interstício': '11:00',
    };

    const result = processWarningRow(row, headers, 1);

    expect(result).not.toBeNull();
    expect(result!.condutor).toBe('João Silva');
    expect(result!.cpf).toBe('12345678910');
    expect(result!.infractions.length).toBeGreaterThan(0);
    expect(result!.infractions.some(inf => inf.type === 'jornada')).toBe(true);
  });

  it('should detect insufficient meal time', () => {
    const row = {
      'Condutor': 'Maria Santos',
      'CPF': '987.654.321-00',
      'Operação': 'FRONERI RJ',
      'Placa': 'XYZ9999',
      'Tempo Jornada s/ Refeição': '07:00',
      'Início Jornada': '06/02/2026 08:00',
      'Cargo': 'Motorista',
      'Matrícula': 'M456',
      'Total Refeição': '00:30',
      'Fim Jornada': '15:30',
      'Interstício': '11:30',
    };

    const result = processWarningRow(row, headers, 1);

    expect(result).not.toBeNull();
    expect(result!.infractions.some(inf => inf.type === 'refeicao')).toBe(true);
  });

  it('should detect missing meal time record', () => {
    const row = {
      'Condutor': 'Pedro Costa',
      'CPF': '111.222.333-44',
      'Operação': 'MINERVA',
      'Placa': 'DEF5678',
      'Tempo Jornada s/ Refeição': '08:00',
      'Início Jornada': '06/02/2026 07:00',
      'Cargo': 'Motorista',
      'Matrícula': 'M789',
      'Total Refeição': '',
      'Fim Jornada': '15:00',
      'Interstício': '11:00',
    };

    const result = processWarningRow(row, headers, 1);

    expect(result).not.toBeNull();
    expect(result!.infractions.some(inf => inf.type === 'refeicao')).toBe(true);
  });

  it('should detect insufficient interstice', () => {
    const row = {
      'Condutor': 'Ana Oliveira',
      'CPF': '555.666.777-88',
      'Operação': 'BRF VIDEIRA',
      'Placa': 'GHI1011',
      'Tempo Jornada s/ Refeição': '08:00',
      'Início Jornada': '06/02/2026 07:00',
      'Cargo': 'Motorista',
      'Matrícula': 'M101',
      'Total Refeição': '01:00',
      'Fim Jornada': '16:00',
      'Interstício': '10:30',
    };

    const result = processWarningRow(row, headers, 1);

    expect(result).not.toBeNull();
    expect(result!.infractions.some(inf => inf.type === 'intersticio')).toBe(true);
  });

  it('should handle saturday journey limit (4 hours)', () => {
    const row = {
      'Condutor': 'Carlos Mendes',
      'CPF': '999.888.777-66',
      'Operação': 'SEARA SÃO',
      'Placa': 'JKL1213',
      'Tempo Jornada s/ Refeição': '05:00',
      'Início Jornada': '07/02/2026 06:00', // Sábado
      'Cargo': 'Motorista',
      'Matrícula': 'M202',
      'Total Refeição': '01:00',
      'Fim Jornada': '12:00',
      'Interstício': '11:00',
    };

    const result = processWarningRow(row, headers, 1);

    expect(result).not.toBeNull();
    expect(result!.diaSemana).toBe('sábado');
    expect(result!.infractions.some(inf => inf.type === 'jornada')).toBe(true);
  });

  it('should handle sunday (no work day)', () => {
    const row = {
      'Condutor': 'Lucas Ferreira',
      'CPF': '444.333.222-11',
      'Operação': 'BRF LONDRINA',
      'Placa': 'MNO1415',
      'Tempo Jornada s/ Refeição': '02:00',
      'Início Jornada': '01/02/2026 08:00', // Domingo
      'Cargo': 'Motorista',
      'Matrícula': 'M303',
      'Total Refeição': '01:00',
      'Fim Jornada': '10:00',
      'Interstício': '11:00',
    };

    const result = processWarningRow(row, headers, 1);

    expect(result).not.toBeNull();
    expect(result!.diaSemana).toBe('domingo');
    expect(result!.infractions.some(inf => inf.type === 'jornada')).toBe(true);
  });

  it('should normalize CPF correctly', () => {
    const row = {
      'Condutor': 'Test User',
      'CPF': '123.456.789-10',
      'Operação': 'TEST',
      'Placa': 'TST-1234',
      'Tempo Jornada s/ Refeição': '08:00',
      'Início Jornada': '06/02/2026 07:00',
      'Cargo': 'Motorista',
      'Matrícula': 'M999',
      'Total Refeição': '01:00',
      'Fim Jornada': '16:00',
      'Interstício': '11:00',
    };

    const result = processWarningRow(row, headers, 1);

    expect(result).not.toBeNull();
    expect(result!.cpf).toBe('12345678910');
  });

  it('should normalize plate to uppercase', () => {
    const row = {
      'Condutor': 'Test User',
      'CPF': '123.456.789-10',
      'Operação': 'TEST',
      'Placa': 'abc-1234',
      'Tempo Jornada s/ Refeição': '08:00',
      'Início Jornada': '06/02/2026 07:00',
      'Cargo': 'Motorista',
      'Matrícula': 'M999',
      'Total Refeição': '01:00',
      'Fim Jornada': '16:00',
      'Interstício': '11:00',
    };

    const result = processWarningRow(row, headers, 1);

    expect(result).not.toBeNull();
    expect(result!.placa).toBe('ABC1234');
  });

  it('should generate warning text for ADVERTENCIA status', () => {
    const row = {
      'Condutor': 'João Silva',
      'CPF': '123.456.789-10',
      'Operação': 'BRF Primária',
      'Placa': 'ABC-1234',
      'Tempo Jornada s/ Refeição': '09:30',
      'Início Jornada': '06/02/2026 06:00',
      'Cargo': 'Motorista',
      'Matrícula': 'M123',
      'Total Refeição': '01:00',
      'Fim Jornada': '17:30',
      'Interstício': '11:00',
    };

    const result = processWarningRow(row, headers, 1);

    expect(result).not.toBeNull();
    if (result!.status === 'ADVERTENCIA') {
      expect(result!.warningText).toBeDefined();
      expect(result!.warningText).toContain('ADVERTÊNCIA DISCIPLINAR');
      expect(result!.warningText).toContain('João Silva');
    }
  });
});
