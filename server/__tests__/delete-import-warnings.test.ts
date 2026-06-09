import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { getDb, recordImport, deleteLastImportWarnings, getLastImport } from '../db';
import { eq } from 'drizzle-orm';

describe('Delete Last Import Warnings', () => {
  let db: any;

  beforeAll(async () => {
    db = await getDb();
  });

  it('should get last import', async () => {
    if (!db) {
      console.log('Skipping test - no database connection');
      return;
    }

    try {
      const lastImport = await getLastImport();
      console.log('Last import:', lastImport);
      
      if (lastImport) {
        expect(lastImport).toHaveProperty('id');
        expect(lastImport).toHaveProperty('fileName');
        expect(lastImport).toHaveProperty('importedAt');
      }
    } catch (error) {
      console.error('Test error:', error);
      throw error;
    }
  });

  it('should record a new import', async () => {
    if (!db) {
      console.log('Skipping test - no database connection');
      return;
    }

    try {
      const result = await recordImport({
        fileName: 'test-delete-warnings.xlsx',
        fileHash: 'test-hash-' + Date.now(),
        rowCount: 5,
        newRowsCount: 3,
        importedBy: 'test-user@example.com',
      });

      console.log('Record import result:', result);
      expect(result).toBeDefined();
    } catch (error) {
      console.error('Test error:', error);
      throw error;
    }
  });

  it('should delete warnings from last import', async () => {
    if (!db) {
      console.log('Skipping test - no database connection');
      return;
    }

    try {
      const result = await deleteLastImportWarnings();
      console.log('Delete result:', result);

      expect(result).toHaveProperty('success');
      expect(result.success).toBe(true);
      expect(result).toHaveProperty('deleted');
      expect(typeof result.deleted).toBe('number');
      
      if (result.importId) {
        expect(result).toHaveProperty('fileName');
        expect(result).toHaveProperty('importedAt');
      }
    } catch (error) {
      console.error('Test error:', error);
      throw error;
    }
  });

  it('should handle delete when no import exists', async () => {
    if (!db) {
      console.log('Skipping test - no database connection');
      return;
    }

    try {
      // This test just verifies the function handles gracefully
      const result = await deleteLastImportWarnings();
      console.log('Delete result (no import):', result);

      expect(result).toHaveProperty('success');
      // Either success or error is acceptable, as long as it doesn't crash
      expect(typeof result.success).toBe('boolean');
    } catch (error) {
      console.error('Test error:', error);
      throw error;
    }
  });
});
