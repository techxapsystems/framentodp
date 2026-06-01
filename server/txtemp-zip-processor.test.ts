import { describe, it, expect } from 'vitest';
import { mergeAndSortRecords, filterRecordsByTimeWindow } from './txtemp-zip-processor';

describe('TXTEMP ZIP Processor', () => {
  describe('mergeAndSortRecords', () => {
    it('should sort records chronologically', () => {
      const records = [
        { parsedDate: new Date('2026-01-26T10:02:00'), temperature: -15 },
        { parsedDate: new Date('2026-01-26T10:00:00'), temperature: -14 },
        { parsedDate: new Date('2026-01-26T10:01:00'), temperature: -16 },
      ];

      const sorted = mergeAndSortRecords(records);
      expect(sorted[0].parsedDate?.getTime()).toBeLessThan(sorted[1].parsedDate?.getTime() || 0);
      expect(sorted[1].parsedDate?.getTime()).toBeLessThan(sorted[2].parsedDate?.getTime() || 0);
    });

    it('should filter out records with null dates', () => {
      const records = [
        { parsedDate: new Date('2026-01-26T10:00:00'), temperature: -15 },
        { parsedDate: null, temperature: -14 },
        { parsedDate: new Date('2026-01-26T10:01:00'), temperature: -16 },
      ];

      const sorted = mergeAndSortRecords(records);
      expect(sorted).toHaveLength(2);
      expect(sorted.every((r) => r.parsedDate !== null)).toBe(true);
    });
  });

  describe('filterRecordsByTimeWindow', () => {
    it('should filter records within time window', () => {
      const records = [
        { parsedDate: new Date('2026-01-26T09:00:00'), temperature: -15 }, // Before window
        { parsedDate: new Date('2026-01-26T10:00:00'), temperature: -14 }, // Within window
        { parsedDate: new Date('2026-01-26T11:00:00'), temperature: -16 }, // Within window
        { parsedDate: new Date('2026-01-26T12:00:00'), temperature: -17 }, // After window
      ];

      const startDate = new Date('2026-01-26T10:00:00');
      const endDate = new Date('2026-01-26T11:00:00');

      const filtered = filterRecordsByTimeWindow(records, startDate, endDate, 0);
      expect(filtered).toHaveLength(2);
    });

    it('should apply tolerance correctly', () => {
      const records = [
        { parsedDate: new Date('2026-01-26T08:50:00'), temperature: -15 }, // 10 min before start
        { parsedDate: new Date('2026-01-26T10:00:00'), temperature: -14 }, // At start
        { parsedDate: new Date('2026-01-26T11:00:00'), temperature: -16 }, // At end
        { parsedDate: new Date('2026-01-26T12:10:00'), temperature: -17 }, // 10 min after end
      ];

      const startDate = new Date('2026-01-26T10:00:00');
      const endDate = new Date('2026-01-26T11:00:00');
      const tolerance = 15 * 60 * 1000; // 15 minutes

      const filtered = filterRecordsByTimeWindow(records, startDate, endDate, tolerance);
      // Window: 09:45 to 11:15
      // Records: 08:50 (outside), 10:00 (in), 11:00 (in), 12:10 (outside)
      expect(filtered).toHaveLength(2); // Only records within tolerance window
    });

    it('should handle empty records', () => {
      const startDate = new Date('2026-01-26T10:00:00');
      const endDate = new Date('2026-01-26T11:00:00');

      const filtered = filterRecordsByTimeWindow([], startDate, endDate);
      expect(filtered).toHaveLength(0);
    });

    it('should filter out records with null dates', () => {
      const records = [
        { parsedDate: new Date('2026-01-26T10:00:00'), temperature: -15 },
        { parsedDate: null, temperature: -14 },
        { parsedDate: new Date('2026-01-26T11:00:00'), temperature: -16 },
      ];

      const startDate = new Date('2026-01-26T10:00:00');
      const endDate = new Date('2026-01-26T11:00:00');

      const filtered = filterRecordsByTimeWindow(records, startDate, endDate, 0);
      expect(filtered).toHaveLength(2);
    });
  });
});
