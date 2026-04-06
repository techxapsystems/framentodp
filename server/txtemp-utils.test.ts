import { describe, it, expect } from 'vitest';
import {
  parseFlexDate,
  parseTemperature,
  parseTemperatureRange,
  isValidPlate,
  extractPlateFromFilename,
  calculateEfficiency,
  calculateTemperatureStats,
} from './txtemp-utils';

describe('TXTEMP Utility Functions', () => {
  describe('parseFlexDate', () => {
    it('should parse Date objects', () => {
      const date = new Date('2026-01-26T18:56:22');
      const result = parseFlexDate(date);
      expect(result.valid).toBe(true);
      expect(result.date).toEqual(date);
    });

    it('should parse Excel serial numbers', () => {
      const excelSerial = 45000;
      const result = parseFlexDate(excelSerial);
      expect(result.valid).toBe(true);
      expect(result.date).toBeInstanceOf(Date);
    });

    it('should parse DD/MM/YYYY HH:MM format', () => {
      const result = parseFlexDate('26/01/2026 18:56');
      expect(result.valid).toBe(true);
      expect(result.date?.getDate()).toBe(26);
      expect(result.date?.getMonth()).toBe(0); // January
      expect(result.date?.getFullYear()).toBe(2026);
    });

    it('should parse ISO format', () => {
      const result = parseFlexDate('2026-01-26T18:56:22Z');
      expect(result.valid).toBe(true);
      expect(result.date).toBeInstanceOf(Date);
    });

    it('should handle invalid dates', () => {
      const result = parseFlexDate('invalid');
      expect(result.valid).toBe(false);
    });
  });

  describe('parseTemperature', () => {
    it('should parse numeric temperatures', () => {
      expect(parseTemperature(25.5)).toBe(25.5);
      expect(parseTemperature(-18)).toBe(-18);
    });

    it('should parse string temperatures with symbols', () => {
      expect(parseTemperature('25.5°C')).toBe(25.5);
      expect(parseTemperature('-18º')).toBe(-18);
      expect(parseTemperature('25,5')).toBe(25.5);
    });

    it('should return null for invalid values', () => {
      expect(parseTemperature(null)).toBeNull();
      expect(parseTemperature(undefined)).toBeNull();
      expect(parseTemperature('')).toBeNull();
      expect(parseTemperature('-')).toBeNull();
      expect(parseTemperature('abc')).toBeNull();
    });
  });

  describe('parseTemperatureRange', () => {
    it('should parse range from text with numbers', () => {
      const result = parseTemperatureRange('-18 a -12');
      expect(result.valid).toBe(true);
      expect(result.min).toBe(-18);
      expect(result.max).toBe(-12);
    });

    it('should parse range with symbols', () => {
      const result = parseTemperatureRange('2°C a 8°C');
      expect(result.valid).toBe(true);
      expect(result.min).toBe(2);
      expect(result.max).toBe(8);
    });

    it('should remove company names and labels', () => {
      const result = parseTemperatureRange('FRAMENTO -18 a -12 CONGELADO');
      expect(result.valid).toBe(true);
      expect(result.min).toBe(-18);
      expect(result.max).toBe(-12);
    });

    it('should reject invalid texts', () => {
      expect(parseTemperatureRange('NÃO ACHEI').valid).toBe(false);
      expect(parseTemperatureRange('SEM CONTROLE').valid).toBe(false);
      expect(parseTemperatureRange('SEM FAIXA').valid).toBe(false);
    });

    it('should return invalid for insufficient numbers', () => {
      const result = parseTemperatureRange('only one number 25');
      expect(result.valid).toBe(false);
    });
  });

  describe('isValidPlate', () => {
    it('should accept old format plates (ABC1234)', () => {
      expect(isValidPlate('ABC1234')).toBe(true);
      expect(isValidPlate('XYZ9876')).toBe(true);
    });

    it('should accept Mercosul format plates (ABC1D23)', () => {
      expect(isValidPlate('ABC1D23')).toBe(true);
      expect(isValidPlate('XYZ9A87')).toBe(true);
    });

    it('should reject invalid formats', () => {
      expect(isValidPlate('ABC123')).toBe(false); // Too short
      expect(isValidPlate('ABCD1234')).toBe(false); // Too many letters
      expect(isValidPlate('123ABCD')).toBe(false); // Wrong order
      expect(isValidPlate('')).toBe(false);
      expect(isValidPlate(null as any)).toBe(false);
    });
  });

  describe('extractPlateFromFilename', () => {
    it('should extract plate from filename', () => {
      expect(extractPlateFromFilename('ABC1234_positions.xlsx')).toBe('ABC1234');
      expect(extractPlateFromFilename('XYZ9A87_data.csv')).toBe('XYZ9A87');
    });

    it('should extract plate from path', () => {
      expect(extractPlateFromFilename('/path/to/ABC1234_report.xlsx')).toBe('ABC1234');
    });

    it('should return null for invalid filenames', () => {
      expect(extractPlateFromFilename('no_plate_here.xlsx')).toBeNull();
      expect(extractPlateFromFilename('')).toBeNull();
      expect(extractPlateFromFilename(null as any)).toBeNull();
    });
  });

  describe('calculateEfficiency', () => {
    it('should calculate efficiency for records within range', () => {
      const records = [
        { parsedDate: new Date('2026-01-26T10:00:00'), temperature: -15 },
        { parsedDate: new Date('2026-01-26T10:01:00'), temperature: -14 },
        { parsedDate: new Date('2026-01-26T10:02:00'), temperature: -16 },
      ];

      const result = calculateEfficiency(records, -18, -12);
      expect(result.eficiencia).toBe(100); // All within range
      expect(result.status).toBe('within');
    });

    it('should calculate efficiency for records outside range', () => {
      const records = [
        { parsedDate: new Date('2026-01-26T10:00:00'), temperature: -5 },
        { parsedDate: new Date('2026-01-26T10:01:00'), temperature: 0 },
        { parsedDate: new Date('2026-01-26T10:02:00'), temperature: 5 },
      ];

      const result = calculateEfficiency(records, -18, -12);
      expect(result.eficiencia).toBe(0); // All outside range
      expect(result.status).toBe('outside');
    });

    it('should calculate partial efficiency', () => {
      const records = [
        { parsedDate: new Date('2026-01-26T10:00:00'), temperature: -15 }, // Within
        { parsedDate: new Date('2026-01-26T10:01:00'), temperature: -15 }, // Within
        { parsedDate: new Date('2026-01-26T10:01:30'), temperature: -15 }, // Within
        { parsedDate: new Date('2026-01-26T10:02:00'), temperature: -15 }, // Within
        { parsedDate: new Date('2026-01-26T10:02:30'), temperature: 0 }, // Outside
        { parsedDate: new Date('2026-01-26T10:03:00'), temperature: 0 }, // Outside
      ];

      const result = calculateEfficiency(records, -18, -12);
      expect(result.eficiencia).toBeGreaterThan(50);
      expect(result.eficiencia).toBeLessThan(100);
      expect(result.status).toBe('partial');
    });

    it('should return S/ DADOS for no valid records', () => {
      const result = calculateEfficiency([], -18, -12);
      expect(result.eficiencia).toBe(0);
      expect(result.status).toBe('S/ DADOS');
    });

    it('should return S/ DADOS for single record', () => {
      const records = [{ parsedDate: new Date('2026-01-26T10:00:00'), temperature: -15 }];
      const result = calculateEfficiency(records, -18, -12);
      expect(result.eficiencia).toBe(0);
      expect(result.status).toBe('S/ DADOS');
    });

    it('should skip duplicate timestamps', () => {
      const records = [
        { parsedDate: new Date('2026-01-26T10:00:00'), temperature: -15 },
        { parsedDate: new Date('2026-01-26T10:00:00'), temperature: -14 }, // Same timestamp
        { parsedDate: new Date('2026-01-26T10:01:00'), temperature: -16 },
      ];

      const result = calculateEfficiency(records, -18, -12);
      expect(result.eficiencia).toBe(100);
    });
  });

  describe('calculateTemperatureStats', () => {
    it('should calculate statistics correctly', () => {
      const records = [
        { parsedDate: new Date(), temperature: 20 },
        { parsedDate: new Date(), temperature: 25 },
        { parsedDate: new Date(), temperature: 30 },
      ];

      const stats = calculateTemperatureStats(records);
      expect(stats.min).toBe(20);
      expect(stats.max).toBe(30);
      expect(stats.media).toBe(25);
      expect(stats.mediana).toBe(25);
    });

    it('should calculate median for even number of records', () => {
      const records = [
        { parsedDate: new Date(), temperature: 10 },
        { parsedDate: new Date(), temperature: 20 },
        { parsedDate: new Date(), temperature: 30 },
        { parsedDate: new Date(), temperature: 40 },
      ];

      const stats = calculateTemperatureStats(records);
      expect(stats.mediana).toBe(25); // (20 + 30) / 2
    });

    it('should handle records with null temperatures', () => {
      const records = [
        { parsedDate: new Date(), temperature: 20 },
        { parsedDate: new Date(), temperature: null },
        { parsedDate: new Date(), temperature: 30 },
      ];

      const stats = calculateTemperatureStats(records);
      expect(stats.min).toBe(20);
      expect(stats.max).toBe(30);
      expect(stats.media).toBe(25);
    });

    it('should return zeros for empty records', () => {
      const stats = calculateTemperatureStats([]);
      expect(stats.media).toBe(0);
      expect(stats.min).toBe(0);
      expect(stats.max).toBe(0);
      expect(stats.mediana).toBe(0);
    });
  });
});
