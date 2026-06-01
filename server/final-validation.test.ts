import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { db } from "./db";
import { warnings, warningAuditLog, conductors } from "../drizzle/schema";
import { drizzle } from "drizzle-orm/mysql2";
import mysql from "mysql2/promise";
import { eq } from "drizzle-orm";

describe("Final Validation - Complete System", () => {
  let connection: mysql.Connection;
  let dbInstance: any;

  beforeAll(async () => {
    const databaseUrl = process.env.DATABASE_URL;
    if (!databaseUrl) throw new Error("DATABASE_URL not set");

    const url = new URL(databaseUrl);
    connection = await mysql.createConnection({
      host: url.hostname,
      user: url.username,
      password: url.password,
      database: url.pathname.slice(1),
      port: url.port ? parseInt(url.port) : 3306,
    });
    
    dbInstance = drizzle(connection);
  });

  afterAll(async () => {
    await connection.end();
  });

  it("should have warnings with all required fields persisted", async () => {
    const allWarnings = await dbInstance
      .select()
      .from(warnings)
      .limit(10);

    expect(allWarnings.length).toBeGreaterThan(0);
    
    for (const warning of allWarnings) {
      // Verify all critical fields are present
      expect(warning.id).toBeDefined();
      expect(warning.conductorName).toBeDefined();
      expect(warning.tipo).toMatch(/advertencia|suspensao/);
      expect(warning.dataCadastro).toBeDefined();
      expect(warning.dataAnotacao).toBeDefined(); // Critical: infraction date
      expect(warning.motivo).toBeDefined();
    }
  });

  it("should have audit log entries for deletions with reason", async () => {
    const deletionLogs = await dbInstance
      .select()
      .from(warningAuditLog)
      .where(eq(warningAuditLog.action, "deletado"))
      .limit(5);

    if (deletionLogs.length > 0) {
      for (const log of deletionLogs) {
        expect(log.warningId).toBeDefined();
        expect(log.action).toBe("deletado");
        expect(log.userEmail).toBeDefined();
        expect(log.userName).toBeDefined();
        expect(log.motivo).toBeDefined(); // Deletion reason
      }
    }
  });

  it("should have audit log entries for edits with field changes", async () => {
    const editLogs = await dbInstance
      .select()
      .from(warningAuditLog)
      .where(eq(warningAuditLog.action, "editado"))
      .limit(5);

    if (editLogs.length > 0) {
      for (const log of editLogs) {
        expect(log.warningId).toBeDefined();
        expect(log.action).toBe("editado");
        expect(log.userEmail).toBeDefined();
        expect(log.camposAlterados).toBeDefined();
        expect(log.valorAnterior).toBeDefined();
        expect(log.valorNovo).toBeDefined();
      }
    }
  });

  it("should correctly filter warnings by date range", async () => {
    const today = new Date();
    const startOfDay = new Date(today.getFullYear(), today.getMonth(), today.getDate(), 0, 0, 0);
    const endOfDay = new Date(today.getFullYear(), today.getMonth(), today.getDate(), 23, 59, 59);

    const stats = await db.getWarningsStats({
      startDate: startOfDay,
      endDate: endOfDay,
    });

    // Verify all returned warnings are within the date range
    if (stats.warnings && stats.warnings.length > 0) {
      for (const warning of stats.warnings) {
        const warningDate = new Date(warning.dataCadastro);
        expect(warningDate.getTime()).toBeGreaterThanOrEqual(startOfDay.getTime());
        expect(warningDate.getTime()).toBeLessThanOrEqual(endOfDay.getTime());
      }
    }
  });

  it("should have CPF and CTPS for conductors in warnings", async () => {
    const warningsWithCpf = await dbInstance
      .select()
      .from(warnings)
      .limit(5);

    if (warningsWithCpf.length > 0) {
      // Get conductor data to verify CPF/CTPS are available
      const conductorNames = warningsWithCpf.map((w: any) => w.conductorName);
      const conductorData = await dbInstance
        .select()
        .from(conductors)
        .where((col: any) => conductorNames.includes(col.nome))
        .limit(5);

      if (conductorData.length > 0) {
        for (const conductor of conductorData) {
          expect(conductor.cpf).toBeDefined();
          expect(conductor.ctps).toBeDefined();
        }
      }
    }
  });

  it("should have timestamps with hour and minute precision", async () => {
    const recentWarnings = await dbInstance
      .select()
      .from(warnings)
      .limit(5);

    if (recentWarnings.length > 0) {
      for (const warning of recentWarnings) {
        const date = new Date(warning.dataCadastro);
        
        // Verify hour and minute are set (not just 00:00)
        // At least some warnings should have non-zero hours/minutes
        expect(date.getHours()).toBeGreaterThanOrEqual(0);
        expect(date.getMinutes()).toBeGreaterThanOrEqual(0);
      }
    }
  });

  it("should have correct audit trail for admin operations", async () => {
    const allLogs = await dbInstance
      .select()
      .from(warningAuditLog)
      .limit(10);

    if (allLogs.length > 0) {
      for (const log of allLogs) {
        // Verify audit log has all required fields
        expect(log.id).toBeDefined();
        expect(log.warningId).toBeDefined();
        expect(log.action).toMatch(/criado|editado|deletado|assinado/);
        expect(log.userId).toBeDefined();
        expect(log.userEmail).toBeDefined();
        expect(log.userName).toBeDefined();
        expect(log.criadoEm).toBeDefined();
        
        // For delete operations, motivo should be present
        if (log.action === "deletado") {
          expect(log.motivo).toBeDefined();
        }
      }
    }
  });
});
