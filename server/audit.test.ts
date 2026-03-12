import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { getDb } from "./db";
import { warnings, users } from "../drizzle/schema";
import { eq } from "drizzle-orm";

describe("Auditoria Completa do Sistema", () => {
  let db: any;

  beforeAll(async () => {
    db = await getDb();
  });

  describe("1. Verificar Banco de Dados", () => {
    it("deve ter tabela de warnings", async () => {
      const result = await db.select().from(warnings).limit(1);
      expect(result).toBeDefined();
    });

    it("deve ter tabela de users", async () => {
      const result = await db.select().from(users).limit(1);
      expect(result).toBeDefined();
    });
  });

  describe("2. Verificar Schema de Advertências", () => {
    it("advertência deve ter coluna observacao", async () => {
      const result = await db.select().from(warnings).limit(1);
      if (result.length > 0) {
        expect(result[0]).toHaveProperty("observacao");
      }
    });

    it("advertência deve ter coluna categoria", async () => {
      const result = await db.select().from(warnings).limit(1);
      if (result.length > 0) {
        expect(result[0]).toHaveProperty("categoria");
      }
    });

    it("advertência deve ter coluna tipo", async () => {
      const result = await db.select().from(warnings).limit(1);
      if (result.length > 0) {
        expect(result[0]).toHaveProperty("tipo");
      }
    });
  });

  describe("3. Verificar Dados de Teste", () => {
    it("deve ter pelo menos um usuário", async () => {
      const result = await db.select().from(users);
      expect(result.length).toBeGreaterThan(0);
    });

    it("usuário deve ter role válido", async () => {
      const result = await db.select().from(users).limit(1);
      if (result.length > 0) {
        expect(["admin", "user", "gestor"]).toContain(result[0].role);
      }
    });
  });

  describe("4. Verificar Integridade de Dados", () => {
    it("advertências devem ter conductorName válido", async () => {
      const result = await db.select().from(warnings).limit(10);
      result.forEach((w: any) => {
        expect(w.conductorName).toBeTruthy();
        expect(typeof w.conductorName).toBe("string");
      });
    });

    it("advertências devem ter tipo válido", async () => {
      const result = await db.select().from(warnings).limit(10);
      result.forEach((w: any) => {
        expect(["advertencia", "suspensao"]).toContain(w.tipo);
      });
    });

    it("advertências devem ter categoria válida", async () => {
      const result = await db.select().from(warnings).limit(10);
      result.forEach((w: any) => {
        if (w.categoria) {
          expect(["pouco_rodado", "horas_extras"]).toContain(w.categoria);
        }
      });
    });
  });

  describe("5. Verificar Campos Obrigatórios", () => {
    it("advertência deve ter id", async () => {
      const result = await db.select().from(warnings).limit(1);
      if (result.length > 0) {
        expect(result[0].id).toBeTruthy();
      }
    });

    it("advertência deve ter data de criação", async () => {
      const result = await db.select().from(warnings).limit(1);
      if (result.length > 0) {
        expect(result[0].criadoEm).toBeTruthy();
      }
    });
  });
});
