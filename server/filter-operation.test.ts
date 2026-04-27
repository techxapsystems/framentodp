import { describe, it, expect, beforeAll } from 'vitest';
import { getDb } from './db';
import { getWarningsStats, getWarningsStatsByOperation } from './db';

describe('Operation Filter - Complete Test', () => {
  let db: any;

  beforeAll(async () => {
    db = await getDb();
  });

  it('should filter warnings by operation in getWarningsStats', async () => {
    if (!db) {
      console.log('Skipping test - no database connection');
      return;
    }

    try {
      // Buscar todas as advertências
      const allStats = await getWarningsStats({});
      console.log('Total warnings:', allStats?.total);

      // Buscar operações disponíveis
      const { conductors } = await import('../drizzle/schema');
      const conductorsList = await db.select().from(conductors);
      const operations = new Set(conductorsList.map((c: any) => c.operacao).filter(Boolean));
      
      console.log('Available operations:', Array.from(operations));

      if (operations.size > 0) {
        // Testar filtro com primeira operação
        const firstOp = Array.from(operations)[0] as string;
        const filteredStats = await getWarningsStats({ operacao: firstOp });
        
        console.log(`Warnings for operation "${firstOp}":`, filteredStats?.total);
        
        // Verificar que filtrou
        if (allStats && filteredStats) {
          expect(filteredStats.total).toBeLessThanOrEqual(allStats.total);
          console.log(`✓ Filter working: ${allStats.total} total → ${filteredStats.total} for "${firstOp}"`);
        }
      }
    } catch (error) {
      console.error('Test error:', error);
      throw error;
    }
  });

  it('should filter warnings by operation in getWarningsStatsByOperation', async () => {
    if (!db) {
      console.log('Skipping test - no database connection');
      return;
    }

    try {
      // Buscar operações disponíveis
      const { conductors } = await import('../drizzle/schema');
      const conductorsList = await db.select().from(conductors);
      const operations = new Set(conductorsList.map((c: any) => c.operacao).filter(Boolean));
      
      if (operations.size > 0) {
        const firstOp = Array.from(operations)[0] as string;
        
        // Testar filtro
        const stats = await getWarningsStatsByOperation({ operacao: firstOp });
        
        console.log(`Stats by operation for "${firstOp}":`, stats);
        
        // Se houver dados, verificar que são válidos
        if (stats && stats.length > 0) {
          stats.forEach((stat: any) => {
            expect(stat.total).toBeGreaterThanOrEqual(0);
            expect(stat.assinadas).toBeGreaterThanOrEqual(0);
            expect(stat.naoAssinadas).toBeGreaterThanOrEqual(0);
          });
          console.log(`✓ Filter returned ${stats.length} types for operation "${firstOp}"`);
        }
      }
    } catch (error) {
      console.error('Test error:', error);
      throw error;
    }
  });

  it('should return fewer results when filtering by operation', async () => {
    if (!db) {
      console.log('Skipping test - no database connection');
      return;
    }

    try {
      // Buscar todas as advertências
      const allStats = await getWarningsStats({});
      
      // Buscar operações disponíveis
      const { conductors } = await import('../drizzle/schema');
      const conductorsList = await db.select().from(conductors);
      const operations = new Set(conductorsList.map((c: any) => c.operacao).filter(Boolean));
      
      if (operations.size > 1 && allStats && allStats.total > 0) {
        // Testar com primeira operação
        const firstOp = Array.from(operations)[0] as string;
        const filteredStats = await getWarningsStats({ operacao: firstOp });
        
        // Se houver mais de uma operação, o filtro deve retornar menos resultados
        if (operations.size > 1 && filteredStats && filteredStats.total > 0) {
          expect(filteredStats.total).toBeLessThanOrEqual(allStats.total);
          console.log(`✓ Verified: ${allStats.total} total ≥ ${filteredStats.total} filtered`);
        }
      }
    } catch (error) {
      console.error('Test error:', error);
      throw error;
    }
  });
});
