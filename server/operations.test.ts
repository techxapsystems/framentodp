import { describe, it, expect, beforeAll } from 'vitest';
import { getDb } from './db';
import { getAllOperations } from './db';

describe('Operations Filter', () => {
  let db: any;

  beforeAll(async () => {
    db = await getDb();
  });

  it('should return list of unique operations from conductors', async () => {
    if (!db) {
      console.log('Skipping test - no database connection');
      return;
    }

    try {
      const operations = await getAllOperations();
      
      console.log('Operations found:', operations);
      
      // Verificar que retorna um array
      expect(Array.isArray(operations)).toBe(true);
      
      // Se houver operações, verificar estrutura
      if (operations.length > 0) {
        operations.forEach((op: any) => {
          expect(op.id).toBeDefined();
          expect(op.nome).toBeDefined();
          expect(typeof op.id).toBe('string');
          expect(typeof op.nome).toBe('string');
        });
        
        console.log(`✓ Found ${operations.length} unique operations`);
        console.log('Sample operations:', operations.slice(0, 3));
      }
    } catch (error) {
      console.error('Test error:', error);
      throw error;
    }
  });

  it('should return operations in sorted order', async () => {
    if (!db) {
      console.log('Skipping test - no database connection');
      return;
    }

    try {
      const operations = await getAllOperations();
      
      if (operations.length > 1) {
        // Verificar que está ordenado
        for (let i = 1; i < operations.length; i++) {
          expect(operations[i].nome >= operations[i - 1].nome).toBe(true);
        }
        console.log('✓ Operations are sorted correctly');
      }
    } catch (error) {
      console.error('Test error:', error);
      throw error;
    }
  });

  it('should not include empty or whitespace-only operations', async () => {
    if (!db) {
      console.log('Skipping test - no database connection');
      return;
    }

    try {
      const operations = await getAllOperations();
      
      operations.forEach((op: any) => {
        expect(op.id.trim()).not.toBe('');
        expect(op.nome.trim()).not.toBe('');
      });
      
      console.log('✓ No empty operations found');
    } catch (error) {
      console.error('Test error:', error);
      throw error;
    }
  });
});
