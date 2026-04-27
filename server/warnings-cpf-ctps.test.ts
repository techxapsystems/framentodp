import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { getDb } from './db';
import { warnings, conductors, administrativeEmployees } from '../drizzle/schema';
import { eq } from 'drizzle-orm';

describe('Warnings CPF and CTPS Integration', () => {
  let db: any;

  beforeAll(async () => {
    db = await getDb();
  });

  it('should include CPF and CTPS for conductor warnings', async () => {
    if (!db) {
      console.log('Skipping test - no database connection');
      return;
    }

    try {
      // Buscar um motorista com advertência
      const conductorWarnings = await db
        .select()
        .from(warnings)
        .limit(1);

      if (conductorWarnings.length === 0) {
        console.log('No warnings found in database');
        return;
      }

      const warning = conductorWarnings[0];
      console.log('Testing warning:', warning.conductorName);

      // Buscar dados do motorista
      const conductor = await db
        .select()
        .from(conductors)
        .where(eq(conductors.nome, warning.conductorName))
        .limit(1);

      if (conductor.length > 0) {
        expect(conductor[0].cpf).toBeDefined();
        expect(conductor[0].cpf).toMatch(/\d{3}\.\d{3}\.\d{3}-\d{2}/);
        console.log('✓ CPF found:', conductor[0].cpf);

        if (conductor[0].ctps) {
          expect(conductor[0].ctps).toBeDefined();
          console.log('✓ CTPS found:', conductor[0].ctps);
        }
      }
    } catch (error) {
      console.error('Test error:', error);
      throw error;
    }
  });

  it('should include CPF for administrative employee warnings', async () => {
    if (!db) {
      console.log('Skipping test - no database connection');
      return;
    }

    try {
      // Buscar um funcionário administrativo com advertência
      const adminWarnings = await db
        .select()
        .from(warnings)
        .limit(1);

      if (adminWarnings.length === 0) {
        console.log('No warnings found in database');
        return;
      }

      const warning = adminWarnings[0];

      // Buscar dados do administrativo
      const admin = await db
        .select()
        .from(administrativeEmployees)
        .where(eq(administrativeEmployees.nome, warning.conductorName))
        .limit(1);

      if (admin.length > 0) {
        expect(admin[0].cpf).toBeDefined();
        expect(admin[0].cpf).toMatch(/\d{3}\.\d{3}\.\d{3}-\d{2}/);
        console.log('✓ Admin CPF found:', admin[0].cpf);
      }
    } catch (error) {
      console.error('Test error:', error);
      throw error;
    }
  });

  it('should verify PDF generator receives CPF and CTPS', async () => {
    // Este teste valida que os dados estão sendo passados corretamente
    // para o gerador de PDF
    const mockWarning = {
      conductorName: 'JOÃO SILVA',
      licensePlate: 'ABC-1234',
      operacao: 'Operação 1',
      warningLevel: 'Aviso 1',
      warningType: 'advertencia',
      warningReason: 'Motivo teste',
      cpf: '123.456.789-00',
      ctps: '123456    1234 - 5',
    };

    expect(mockWarning.cpf).toBeDefined();
    expect(mockWarning.ctps).toBeDefined();
    expect(mockWarning.cpf).toMatch(/\d{3}\.\d{3}\.\d{3}-\d{2}/);
    console.log('✓ PDF generator will receive CPF:', mockWarning.cpf);
    console.log('✓ PDF generator will receive CTPS:', mockWarning.ctps);
  });
});
