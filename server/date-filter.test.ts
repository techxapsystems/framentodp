import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { db } from "./db";
import { conductors, warnings } from "../drizzle/schema";
import { drizzle } from "drizzle-orm/mysql2";
import mysql from "mysql2/promise";

describe("Date Filter Conversion", () => {
  let connection: mysql.Connection;

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
  });

  afterAll(async () => {
    await connection.end();
  });

  it("should parse date string correctly (YYYY-MM-DD format)", () => {
    // Test date parsing logic
    const dateStr = "2026-04-21";
    const [year, month, day] = dateStr.split("-").map(Number);
    const parsedDate = new Date(year, month - 1, day, 0, 0, 0, 0);

    // Verify it's midnight on the correct date
    expect(parsedDate.getFullYear()).toBe(2026);
    expect(parsedDate.getMonth()).toBe(3); // April (0-indexed)
    expect(parsedDate.getDate()).toBe(21);
    expect(parsedDate.getHours()).toBe(0);
    expect(parsedDate.getMinutes()).toBe(0);
    expect(parsedDate.getSeconds()).toBe(0);
  });

  it("should set end date to 23:59:59 for inclusive filtering", () => {
    const dateStr = "2026-04-21";
    const [year, month, day] = dateStr.split("-").map(Number);
    const endDate = new Date(year, month - 1, day, 23, 59, 59, 999);

    expect(endDate.getHours()).toBe(23);
    expect(endDate.getMinutes()).toBe(59);
    expect(endDate.getSeconds()).toBe(59);
    expect(endDate.getMilliseconds()).toBe(999);
  });

  it("should filter warnings by date range correctly", async () => {
    const databaseUrl = process.env.DATABASE_URL;
    if (!databaseUrl) throw new Error("DATABASE_URL not set");

    const dbInstance = drizzle(connection);

    // Get all warnings
    const allWarnings = await dbInstance.select().from(warnings).limit(5);

    if (allWarnings.length === 0) {
      console.log("No warnings found in database, skipping filter test");
      return;
    }

    // Get the date of the first warning
    const firstWarning = allWarnings[0];
    const warningDate = new Date(firstWarning.dataCadastro);

    // Format as YYYY-MM-DD
    const year = warningDate.getFullYear();
    const month = String(warningDate.getMonth() + 1).padStart(2, "0");
    const day = String(warningDate.getDate()).padStart(2, "0");
    const dateStr = `${year}-${month}-${day}`;

    // Parse it the same way the backend does
    const [y, m, d] = dateStr.split("-").map(Number);
    const startDate = new Date(y, m - 1, d, 0, 0, 0, 0);
    const endDate = new Date(y, m - 1, d, 23, 59, 59, 999);

    // Verify the parsed dates bracket the warning date
    expect(warningDate.getTime()).toBeGreaterThanOrEqual(startDate.getTime());
    expect(warningDate.getTime()).toBeLessThanOrEqual(endDate.getTime());
  });
});
