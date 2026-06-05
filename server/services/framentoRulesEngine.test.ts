import { describe, it, expect } from 'vitest';
import {
  normalizeCPF,
  normalizePlaca,
  timeToMinutes,
  parseDate,
  getDayOfWeek,
  getJornadeLimit,
  detectInfractions,
  minutesToHHMM,
  detectStatusByColor,
  validateRequiredColumns,
  normalizeHeaderName,
  mapColumns,
  ParsedRow,
} from './framentoRulesEngine';

describe('Framento Rules Engine', () => {
  describe('normalizeCPF', () => {
    it('should normalize CPF removing dots and dashes', () => {
      expect(normalizeCPF('123.456.789-10')).toBe('12345678910');
    });
    
    it('should return null for invalid CPF', () => {
      expect(normalizeCPF('123')).toBeNull();
      expect(normalizeCPF('')).toBeNull();
    });
  });
  
  describe('normalizePlaca', () => {
    it('should uppercase and remove spaces', () => {
      expect(normalizePlaca('abc 1234')).toBe('ABC1234');
      expect(normalizePlaca('XyZ-9876')).toBe('XYZ-9876');
    });
  });
  
  describe('timeToMinutes', () => {
    it('should convert HH:MM to minutes', () => {
      expect(timeToMinutes('08:30')).toBe(510);
      expect(timeToMinutes('14:50')).toBe(890);
    });
    
    it('should convert decimal hours to minutes', () => {
      expect(timeToMinutes(0.354166)).toBe(510); // ~08:30
    });
    
    it('should return null for absent values', () => {
      expect(timeToMinutes('')).toBeNull();
      expect(timeToMinutes('-')).toBeNull();
      expect(timeToMinutes(' - ')).toBeNull();
    });
    
    it('should treat 00:00 as zero', () => {
      expect(timeToMinutes('00:00')).toBe(0);
    });
  });
  
  describe('parseDate', () => {
    it('should parse DD/MM/YYYY format', () => {
      const date = parseDate('26/02/2026');
      expect(date).toBeDefined();
      expect(date?.getDate()).toBe(26);
      expect(date?.getMonth()).toBe(1); // 0-indexed
      expect(date?.getFullYear()).toBe(2026);
    });
    
    it('should return null for invalid dates', () => {
      expect(parseDate('')).toBeNull();
      expect(parseDate('invalid')).toBeNull();
    });
  });
  
  describe('getDayOfWeek', () => {
    it('should return correct day of week', () => {
      // 26/02/2026 is a Thursday (4)
      const date = new Date(2026, 1, 26);
      expect(getDayOfWeek(date)).toBe(4);
    });
  });
  
  describe('getJornadeLimit', () => {
    it('should return 480 for weekdays', () => {
      // Monday
      const monday = new Date(2026, 1, 23);
      expect(getJornadeLimit(monday)).toBe(480);
    });
    
    it('should return 240 for Saturday', () => {
      // Saturday
      const saturday = new Date(2026, 1, 28);
      expect(getJornadeLimit(saturday)).toBe(240);
    });
    
    it('should return 0 for Sunday', () => {
      // Sunday
      const sunday = new Date(2026, 2, 1);
      expect(getJornadeLimit(sunday)).toBe(0);
    });
  });
  
  describe('minutesToHHMM', () => {
    it('should convert minutes to HHhMM format', () => {
      expect(minutesToHHMM(510)).toBe('08h30');
      expect(minutesToHHMM(890)).toBe('14h50');
      expect(minutesToHHMM(660)).toBe('11h00');
    });
  });
  
  describe('detectInfractions', () => {
    it('should detect jornada infraction', () => {
      const row: ParsedRow = {
        condutor: 'JOSE SILVA',
        cpf: '12345678910',
        placa: 'ABC1234',
        jornada_sem_refeicao: 600, // 10:00
        inicio: new Date(2026, 1, 26), // Thursday
        operacao: 'BRF',
      };
      
      const infractions = detectInfractions(row);
      expect(infractions.length).toBeGreaterThan(0);
      expect(infractions.some(i => i.type === 'jornada')).toBe(true);
    });
    
    it('should detect refeicao infraction', () => {
      const row: ParsedRow = {
        condutor: 'JOSE SILVA',
        cpf: '12345678910',
        placa: 'ABC1234',
        jornada_sem_refeicao: 480,
        inicio: new Date(2026, 1, 26),
        refeicao: 30, // 30 minutes (less than 60)
      };
      
      const infractions = detectInfractions(row);
      expect(infractions.some(i => i.type === 'refeicao')).toBe(true);
    });
    
    it('should detect intersticio infraction', () => {
      const row: ParsedRow = {
        condutor: 'JOSE SILVA',
        cpf: '12345678910',
        placa: 'ABC1234',
        jornada_sem_refeicao: 480,
        inicio: new Date(2026, 1, 26),
        intersticio: 600, // 10:00 (less than 11:00)
      };
      
      const infractions = detectInfractions(row);
      expect(infractions.some(i => i.type === 'intersticio')).toBe(true);
    });
  });
  
  describe('detectStatusByColor', () => {
    it('should return ADVERTÊNCIA for #FFFF00', () => {
      expect(detectStatusByColor('#FFFF00')).toBe('ADVERTÊNCIA');
      expect(detectStatusByColor('FFFF00')).toBe('ADVERTÊNCIA');
    });
    
    it('should return EM REVISÃO for #FFCC00', () => {
      expect(detectStatusByColor('#FFCC00')).toBe('EM REVISÃO');
      expect(detectStatusByColor('FFCC00')).toBe('EM REVISÃO');
    });
    
    it('should return CONFERÊNCIA MANUAL for unknown colors', () => {
      expect(detectStatusByColor('#FF0000')).toBe('CONFERÊNCIA MANUAL');
      expect(detectStatusByColor(undefined)).toBe('CONFERÊNCIA MANUAL');
    });
  });
  
  describe('validateRequiredColumns', () => {
    it('should validate required columns', () => {
      const headers = ['Condutor', 'CPF', 'Placa', 'Tempo Jornada s/ Refeição', 'Início Jornada'];
      const result = validateRequiredColumns(headers);
      expect(result.valid).toBe(true);
      expect(result.missing).toHaveLength(0);
    });
    
    it('should detect missing columns', () => {
      const headers = ['Condutor', 'CPF'];
      const result = validateRequiredColumns(headers);
      expect(result.valid).toBe(false);
      expect(result.missing.length).toBeGreaterThan(0);
    });
  });
  
  describe('normalizeHeaderName', () => {
    it('should normalize header names', () => {
      expect(normalizeHeaderName('Tempo Jornada s/ Refeição')).toBe('tempo_jornada_s_refeicao');
      expect(normalizeHeaderName('Início Jornada')).toBe('inicio_jornada');
      expect(normalizeHeaderName('CPF')).toBe('cpf');
    });
  });
  
  describe('mapColumns', () => {
    it('should map columns by synonyms', () => {
      const headers = [
        'Condutor',
        'CPF',
        'Placa',
        'Tempo Jornada s/ Refeição',
        'Início Jornada',
        'Operação',
      ];
      
      const mapping = mapColumns(headers);
      expect(mapping.condutor).toBe('Condutor');
      expect(mapping.cpf).toBe('CPF');
      expect(mapping.jornada_sem_refeicao).toBe('Tempo Jornada s/ Refeição');
      expect(mapping.inicio).toBe('Início Jornada');
    });
  });
});
