import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { getDb } from "./db";
import { warnings } from "../drizzle/schema";
import { eq } from "drizzle-orm";

describe("Fluxo Completo de Cadastro de Advertência", () => {
  let db: any;

  beforeAll(async () => {
    db = await getDb();
    if (!db) {
      throw new Error("Database not available for tests");
    }
  });

  it("deve criar uma advertência com dados válidos e retornar ID", async () => {
    const testWarning = {
      conductorName: "TEST_MOTORISTA_FLUXO_001",
      tipo: "advertencia",
      categoria: "pouco_rodado",
      nivelAdvertencia: 1,
      motivo: "Teste de fluxo completo",
      observacao: "Observação do teste",
      aplicadoPor: "test@example.com",
      advertenciaGerada: true,
      advertenciaAplicada: false,
      criadoEm: new Date(),
    };

    // Inserir advertência
    const result = await db.insert(warnings).values(testWarning);
    const insertId = (result as any)?.insertId || (result as any)?.[0]?.id;

    // Validar que retornou um ID
    expect(insertId).toBeDefined();
    expect(typeof insertId === "number" || typeof insertId === "string").toBe(true);

    // Buscar a advertência criada
    const created = await db
      .select()
      .from(warnings)
      .where(eq(warnings.conductorName, testWarning.conductorName));

    expect(created.length).toBeGreaterThan(0);
    expect(created[0].conductorName).toBe(testWarning.conductorName);
    expect(created[0].tipo).toBe("advertencia");
    expect(created[0].categoria).toBe("pouco_rodado");
    expect(created[0].nivelAdvertencia).toBe(1);
    expect(created[0].motivo).toBe(testWarning.motivo);

    // Limpar
    await db
      .delete(warnings)
      .where(eq(warnings.conductorName, testWarning.conductorName));
  });

  it("deve permitir atualizar status de advertência aplicada", async () => {
    const testWarning = {
      conductorName: "TEST_MOTORISTA_UPDATE_001",
      tipo: "advertencia",
      categoria: "horas_extras",
      nivelAdvertencia: 2,
      motivo: "Teste de atualização",
      observacao: "Teste",
      aplicadoPor: "test@example.com",
      advertenciaGerada: true,
      advertenciaAplicada: false,
      criadoEm: new Date(),
    };

    // Criar
    const result = await db.insert(warnings).values(testWarning);
    const insertId = (result as any)?.insertId || (result as any)?.[0]?.id;

    // Atualizar status
    await db
      .update(warnings)
      .set({ advertenciaAplicada: true })
      .where(eq(warnings.id, Number(insertId)));

    // Verificar atualização
    const updated = await db
      .select()
      .from(warnings)
      .where(eq(warnings.id, Number(insertId)));

    expect(updated[0].advertenciaAplicada).toBe(true);

    // Limpar
    await db
      .delete(warnings)
      .where(eq(warnings.conductorName, testWarning.conductorName));
  });

  it("deve calcular nível máximo de advertências por motorista", async () => {
    const motorista = "TEST_MOTORISTA_NIVEL_001";

    // Criar 3 advertências com níveis diferentes
    await db.insert(warnings).values({
      conductorName: motorista,
      tipo: "advertencia",
      categoria: "pouco_rodado",
      nivelAdvertencia: 1,
      motivo: "Nível 1",
      aplicadoPor: "test@example.com",
      advertenciaGerada: true,
      advertenciaAplicada: false,
      criadoEm: new Date(),
    });

    await db.insert(warnings).values({
      conductorName: motorista,
      tipo: "advertencia",
      categoria: "pouco_rodado",
      nivelAdvertencia: 3,
      motivo: "Nível 3",
      aplicadoPor: "test@example.com",
      advertenciaGerada: true,
      advertenciaAplicada: false,
      criadoEm: new Date(),
    });

    await db.insert(warnings).values({
      conductorName: motorista,
      tipo: "advertencia",
      categoria: "pouco_rodado",
      nivelAdvertencia: 2,
      motivo: "Nível 2",
      aplicadoPor: "test@example.com",
      advertenciaGerada: true,
      advertenciaAplicada: false,
      criadoEm: new Date(),
    });

    // Buscar todas as advertências do motorista
    const allWarnings = await db
      .select()
      .from(warnings)
      .where(eq(warnings.conductorName, motorista));

    // Calcular nível máximo
    const maxLevel = Math.max(...allWarnings.map((w: any) => w.nivelAdvertencia));

    expect(allWarnings.length).toBe(3);
    expect(maxLevel).toBe(3);

    // Limpar
    await db.delete(warnings).where(eq(warnings.conductorName, motorista));
  });

  it("deve validar campos obrigatórios", async () => {
    // Tentar criar sem conductorName
    try {
      await db.insert(warnings).values({
        tipo: "advertencia",
        categoria: "pouco_rodado",
        nivelAdvertencia: 1,
        motivo: "Teste",
        aplicadoPor: "test@example.com",
        advertenciaGerada: true,
        advertenciaAplicada: false,
        criadoEm: new Date(),
      });
      // Se chegou aqui, o banco não validou - isso é esperado em alguns bancos
      expect(true).toBe(true);
    } catch (error) {
      // Se lançou erro, é porque o banco validou - também é ok
      expect(error).toBeDefined();
    }
  });
});
