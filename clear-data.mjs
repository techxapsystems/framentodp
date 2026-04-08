import { drizzle } from "drizzle-orm/mysql2";
import { eq, sql } from "drizzle-orm";
import * as schema from "./drizzle/schema.js";

const db = drizzle(process.env.DATABASE_URL);

async function clearAllData() {
  try {
    console.log("Starting data clearing process...");
    
    // Clear all data from tables
    const tables = [
      { name: "warnings", table: schema.warnings },
      { name: "journeys", table: schema.journeys },
      { name: "recurrences", table: schema.recurrences },
      { name: "imports", table: schema.imports },
      { name: "configurations", table: schema.configurations },
      { name: "orientations", table: schema.orientations },
      { name: "warningPdfHistory", table: schema.warningPdfHistory },
      { name: "conductors", table: schema.conductors },
    ];

    for (const { name, table } of tables) {
      await db.delete(table);
      console.log(`✓ Cleared ${name}`);
    }

    console.log("\n✅ All data cleared successfully!");
  } catch (error) {
    console.error("Error clearing data:", error);
    process.exit(1);
  }
}

clearAllData();
