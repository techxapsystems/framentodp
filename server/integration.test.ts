import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { getDb } from "./db";
import { warnings } from "../drizzle/schema";
import { eq, and } from "drizzle-orm";

describe("Fluxo Completo de Advertência", () => {
  let db: any;

  beforeAll(async () => {
    db = await getDb();
    if (!db) {
      throw new Error("Database not available for tests");
    }
  });

  it("deve criar uma advertência com tipo e categoria corretos", async () => {
    const testData = {
      conductorName: "TEST_MOTORISTA_001",
      tipo: "advertencia",
      categoria: "pouco_rodado",
      nivelAdvertencia: 1,
      motivo: "Teste de integração",
      observacao: "Observação de teste",
      aplicadoPor: "test@example.com",
      advertenciaGerada: true,
      advertenciaAplicada: false,
      criadoEm: new Date(),
    };

    // Inserir
    const result = await db.insert(warnings).values(testData);
    const insertId = (result as any)?.insertId || (result as any)?.[0]?.id;

    expect(insertId).toBeDefined();
    expect(typeof insertId).toBe("number");

    // Verificar se foi inserida
    const inserted = await db
      .select()
      .from(warnings)
      .where(eq(warnings.id, Number(insertId)));

    expect(inserted).toHaveLength(1);
    expect(inserted[0].conductorName).toBe(testData.conductorName);
    expect(inserted[0].tipo).toBe("advertencia");
    expect(inserted[0].categoria).toBe("pouco_rodado");
    expect(inserted[0].nivelAdvertencia).toBe(1);

    // Limpar
    await db.delete(warnings).where(eq(warnings.id, insertId));
  });

  it("deve filtrar advertências por categoria", async () => {
    const motorista = "TEST_MOTORISTA_002";

    // Criar 2 advertências com categorias diferentes
    const adv1 = await db.insert(warnings).values({
      conductorName: motorista,
      tipo: "advertencia",
      categoria: "pouco_rodado",
      nivelAdvertencia: 1,
      motivo: "Teste 1",
      aplicadoPor: "test@example.com",
      advertenciaGerada: true,
      advertenciaAplicada: false,
      criadoEm: new Date(),
    });

    const adv2 = await db.insert(warnings).values({
      conductorName: motorista,
      tipo: "advertencia",
      categoria: "horas_extras",
      nivelAdvertencia: 2,
      motivo: "Teste 2",
      aplicadoPor: "test@example.com",
      advertenciaGerada: true,
      advertenciaAplicada: false,
      criadoEm: new Date(),
    });

    // Buscar por categoria
    const poucoRodado = await db
      .select()
      .from(warnings)
      .where(
        and(
          eq(warnings.conductorName, motorista),
          eq(warnings.categoria, "pouco_rodado")
        )
      );

    const horasExtras = await db
      .select()
      .from(warnings)
      .where(
        and(
          eq(warnings.conductorName, motorista),
          eq(warnings.categoria, "horas_extras")
        )
      );

    expect(poucoRodado).toHaveLength(1);
    expect(horasExtras).toHaveLength(1);
    expect(poucoRodado[0].nivelAdvertencia).toBe(1);
    expect(horasExtras[0].nivelAdvertencia).toBe(2);

    // Limpar
    await db.delete(warnings).where(eq(warnings.conductorName, motorista));
  });

  it("deve calcular nível máximo de aviso por categoria", async () => {
    const motorista = "TEST_MOTORISTA_003";

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

    // Buscar e calcular máximo
    const allWarnings = await db
      .select()
      .from(warnings)
      .where(eq(warnings.conductorName, motorista));

    const maxLevel = Math.max(...allWarnings.map((w: any) => w.nivelAdvertencia));

    expect(allWarnings).toHaveLength(3);
    expect(maxLevel).toBe(3);

    // Limpar
    await db.delete(warnings).where(eq(warnings.conductorName, motorista));
  });
});
