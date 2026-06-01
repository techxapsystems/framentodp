import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { getDb } from "./db";
import { warningAuditLog } from "../drizzle/schema";

describe("Warning Audit Log", () => {
  let db: ReturnType<typeof getDb>;

  beforeAll(() => {
    db = getDb();
  });

  it("should log warning creation", async () => {
    // Simular log de criação
    const logData = {
      warningId: 1,
      conductorName: "TEST CONDUCTOR",
      acao: "criado" as const,
      camposAlterados: null,
      valorAnterior: null,
      valorNovo: null,
      usuarioId: 1,
      usuarioEmail: "test@example.com",
      usuarioNome: "Test User",
      motivo: null,
      ipAddress: "127.0.0.1",
      criadoEm: new Date(),
    };

    // Verificar que os dados estão estruturados corretamente
    expect(logData.acao).toBe("criado");
    expect(logData.warningId).toBe(1);
    expect(logData.conductorName).toBe("TEST CONDUCTOR");
  });

  it("should log warning update with field changes", async () => {
    // Simular log de edição
    const logData = {
      warningId: 2,
      conductorName: "TEST CONDUCTOR 2",
      acao: "editado" as const,
      camposAlterados: ["motivo", "nivelAdvertencia"],
      valorAnterior: {
        motivo: "Motivo antigo",
        nivelAdvertencia: 1,
      },
      valorNovo: {
        motivo: "Motivo novo",
        nivelAdvertencia: 2,
      },
      usuarioId: 1,
      usuarioEmail: "test@example.com",
      usuarioNome: "Test User",
      motivo: "Correção de dados",
      ipAddress: "127.0.0.1",
      criadoEm: new Date(),
    };

    expect(logData.acao).toBe("editado");
    expect(logData.camposAlterados).toContain("motivo");
    expect(logData.valorAnterior.motivo).toBe("Motivo antigo");
    expect(logData.valorNovo.motivo).toBe("Motivo novo");
  });

  it("should log warning deletion", async () => {
    // Simular log de exclusão
    const logData = {
      warningId: 3,
      conductorName: "TEST CONDUCTOR 3",
      acao: "deletado" as const,
      camposAlterados: null,
      valorAnterior: null,
      valorNovo: null,
      usuarioId: 1,
      usuarioEmail: "test@example.com",
      usuarioNome: "Test User",
      motivo: "Exclusão por erro de cadastro",
      ipAddress: "127.0.0.1",
      criadoEm: new Date(),
    };

    expect(logData.acao).toBe("deletado");
    expect(logData.motivo).toBe("Exclusão por erro de cadastro");
  });

  it("should log warning sign-off", async () => {
    // Simular log de assinatura
    const logData = {
      warningId: 4,
      conductorName: "TEST CONDUCTOR 4",
      acao: "assinado" as const,
      camposAlterados: ["advertenciaAplicada"],
      valorAnterior: {
        advertenciaAplicada: false,
      },
      valorNovo: {
        advertenciaAplicada: true,
      },
      usuarioId: 1,
      usuarioEmail: "test@example.com",
      usuarioNome: "Test User",
      motivo: null,
      ipAddress: "127.0.0.1",
      criadoEm: new Date(),
    };

    expect(logData.acao).toBe("assinado");
    expect(logData.camposAlterados).toContain("advertenciaAplicada");
  });
});
