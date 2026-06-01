import { describe, it, expect, beforeAll } from "vitest";
import { getDb } from "./db";
import { warnings, users, warningTemplates } from "../drizzle/schema";
import { eq } from "drizzle-orm";

describe("Fluxo Completo do Sistema", () => {
  let db: any;
  let testWarningId: number;
  const testName = `TESTE_${Date.now()}`;

  beforeAll(async () => {
    db = await getDb();
  });

  describe("Fase 3: Cadastro de Advertências", () => {
    it("deve permitir criar uma advertência", async () => {
      await db.insert(warnings).values({
        conductorName: testName,
        nivelAdvertencia: 1,
        motivo: "Teste de auditoria",
        observacao: "Observação de teste",
        tipo: "advertencia",
        categoria: "pouco_rodado",
        aplicadoPor: "Sistema",
        criadoEm: new Date(),
      });

      const result = await db
        .select()
        .from(warnings)
        .where(eq(warnings.conductorName, testName))
        .limit(1);

      expect(result.length).toBeGreaterThan(0);
      testWarningId = result[0].id;
    });

    it("advertência criada deve ter observação", async () => {
      const result = await db
        .select()
        .from(warnings)
        .where(eq(warnings.id, testWarningId));

      expect(result[0].observacao).toBe("Observação de teste");
    });

    it("advertência criada deve ter categoria", async () => {
      const result = await db
        .select()
        .from(warnings)
        .where(eq(warnings.id, testWarningId));

      expect(result[0].categoria).toBe("pouco_rodado");
    });
  });

  describe("Fase 4: Gerenciamento de Advertências", () => {
    it("deve permitir atualizar observação", async () => {
      await db
        .update(warnings)
        .set({ observacao: "Observação atualizada" })
        .where(eq(warnings.id, testWarningId));

      const result = await db
        .select()
        .from(warnings)
        .where(eq(warnings.id, testWarningId));

      expect(result[0].observacao).toBe("Observação atualizada");
    });

    it("deve listar advertências", async () => {
      const result = await db.select().from(warnings).limit(10);
      expect(result.length).toBeGreaterThan(0);
    });

    it("deve filtrar advertências por conductor", async () => {
      const result = await db
        .select()
        .from(warnings)
        .where(eq(warnings.conductorName, testName));

      expect(result.length).toBeGreaterThan(0);
    });
  });

  describe("Fase 5: Modelos e Biblioteca", () => {
    it("deve ter modelos de advertência", async () => {
      const result = await db.select().from(warningTemplates).limit(1);
      expect(result.length).toBeGreaterThan(0);
    });

    it("modelo deve ter conteúdo completo", async () => {
      const result = await db.select().from(warningTemplates).limit(1);
      if (result.length > 0) {
        expect(result[0].content).toBeTruthy();
        expect(result[0].content.length).toBeGreaterThan(50);
      }
    });

    it("deve ter múltiplos modelos", async () => {
      const result = await db.select().from(warningTemplates);
      expect(result.length).toBeGreaterThan(10);
    });
  });

  describe("Fase 6: Relatórios", () => {
    it("deve filtrar advertências por tipo", async () => {
      const result = await db
        .select()
        .from(warnings)
        .where(eq(warnings.tipo, "advertencia"));

      expect(result.length).toBeGreaterThan(0);
    });

    it("deve filtrar advertências por status", async () => {
      const result = await db.select().from(warnings).limit(10);
      result.forEach((w: any) => {
        expect(["advertencia", "suspensao"]).toContain(w.tipo);
      });
    });

    it("relatório deve incluir observações", async () => {
      const result = await db
        .select()
        .from(warnings)
        .where(eq(warnings.conductorName, testName));

      result.forEach((w: any) => {
        expect(w).toHaveProperty("observacao");
      });
    });
  });

  describe("Limpeza de Dados de Teste", () => {
    it("deve remover dados de teste", async () => {
      await db
        .delete(warnings)
        .where(eq(warnings.conductorName, testName));

      const result = await db
        .select()
        .from(warnings)
        .where(eq(warnings.conductorName, testName));

      expect(result.length).toBe(0);
    });
  });
});
