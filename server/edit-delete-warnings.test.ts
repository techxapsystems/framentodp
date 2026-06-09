import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { db } from "./db";
import { warnings, conductors, warningAuditLog } from "../drizzle/schema";
import { drizzle } from "drizzle-orm/mysql2";
import mysql from "mysql2/promise";
import { eq } from "drizzle-orm";

describe.skip("Edit/Delete Warnings E2E", () => {
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

  it("should update warning with new motivo and observacao", async () => {
    // Get first warning
    const existingWarnings = await dbInstance
      .select()
      .from(warnings)
      .limit(1);

    if (existingWarnings.length === 0) {
      console.log("No warnings found, skipping update test");
      return;
    }

    const warning = existingWarnings[0];
    const warningId = warning.id;
    const newMotivo = "Motivo atualizado - Teste";
    const newObservacao = "Observação atualizada - Teste";

    // Update warning
    await db.updateWarning(warningId, {
      motivo: newMotivo,
      observacao: newObservacao,
    });

    // Verify update
    const updated = await dbInstance
      .select()
      .from(warnings)
      .where(eq(warnings.id, warningId))
      .limit(1);

    expect(updated.length).toBe(1);
    expect(updated[0].motivo).toBe(newMotivo);
    expect(updated[0].observacao).toBe(newObservacao);
  });

  it("should log audit entry when warning is updated", async () => {
    // Get first warning
    const existingWarnings = await dbInstance
      .select()
      .from(warnings)
      .limit(1);

    if (existingWarnings.length === 0) {
      console.log("No warnings found, skipping audit test");
      return;
    }

    const warning = existingWarnings[0];
    const warningId = warning.id;

    // Log audit entry
    const userId = 1;
    const userEmail = "test@example.com";
    const userName = "Test User";
    const conductorName = "Test Conductor";
    const camposAlterados = ["motivo"];
    const valorAnterior = { motivo: "Old reason" };
    const valorNovo = { motivo: "New reason" };

    await db.logWarningAudit(
      warningId,
      "editado",
      userId,
      userEmail,
      userName,
      conductorName,
      camposAlterados,
      valorAnterior,
      valorNovo,
      undefined,
      "127.0.0.1"
    );

    // Verify audit entry exists
    const auditEntries = await dbInstance
      .select()
      .from(warningAuditLog)
      .where(eq(warningAuditLog.warningId, warningId))
      .limit(1);

    expect(auditEntries.length).toBeGreaterThan(0);
    const lastEntry = auditEntries[auditEntries.length - 1];
    expect(lastEntry.action).toBe("editado");
    expect(lastEntry.userEmail).toBe(userEmail);
  });

  it("should delete warning and log deletion", async () => {
    // Get first warning
    const existingWarnings = await dbInstance
      .select()
      .from(warnings)
      .limit(1);

    if (existingWarnings.length === 0) {
      console.log("No warnings found, skipping delete test");
      return;
    }

    const warning = existingWarnings[0];
    const warningId = warning.id;

    // Delete warning
    await db.deleteWarning(warningId);

    // Verify deletion
    const deleted = await dbInstance
      .select()
      .from(warnings)
      .where(eq(warnings.id, warningId))
      .limit(1);

    expect(deleted.length).toBe(0);
  });

  it("should verify dataAnotacao is persisted correctly", async () => {
    // Get warnings with dataAnotacao
    const warningsWithDate = await dbInstance
      .select()
      .from(warnings)
      .limit(5);

    if (warningsWithDate.length === 0) {
      console.log("No warnings found, skipping dataAnotacao test");
      return;
    }

    // Check that dataAnotacao is set for all warnings
    for (const warning of warningsWithDate) {
      expect(warning.dataAnotacao).toBeDefined();
      expect(warning.dataAnotacao).not.toBeNull();
      
      // Verify it's a valid date
      const date = new Date(warning.dataAnotacao);
      expect(date.getTime()).toBeGreaterThan(0);
    }
  });

  it("should filter warnings by date range correctly", async () => {
    // Get today's date
    const today = new Date();
    const startOfDay = new Date(today.getFullYear(), today.getMonth(), today.getDate(), 0, 0, 0);
    const endOfDay = new Date(today.getFullYear(), today.getMonth(), today.getDate(), 23, 59, 59);

    // Get warnings for today
    const warningsToday = await db.getWarningsStats({
      startDate: startOfDay,
      endDate: endOfDay,
    });

    // Verify all warnings are from today
    if (warningsToday.warnings && warningsToday.warnings.length > 0) {
      for (const warning of warningsToday.warnings) {
        const warningDate = new Date(warning.dataCadastro);
        expect(warningDate.getTime()).toBeGreaterThanOrEqual(startOfDay.getTime());
        expect(warningDate.getTime()).toBeLessThanOrEqual(endOfDay.getTime());
      }
    }
  });
});
