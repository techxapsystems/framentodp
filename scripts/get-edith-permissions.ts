import { getDb } from "../server/db";
import { users } from "../drizzle/schema";
import { eq } from "drizzle-orm";

async function getEdithPermissions() {
  try {
    const db = await getDb();
    if (!db) {
      console.log("❌ Banco de dados não disponível");
      process.exit(1);
    }

    const edith = await db
      .select()
      .from(users)
      .where(eq(users.email, "edith.ferneda"));

    if (edith.length === 0) {
      console.log("❌ Usuário edith.ferneda não encontrado");
      process.exit(1);
    }

    const user = edith[0];
    console.log("✅ Permissões da Edith:");
    console.log(`Email: ${user.email}`);
    console.log(`Nome: ${user.name}`);
    console.log(`Role: ${user.role}`);
    console.log(`Department: ${user.department}`);
    console.log(`Status: ${user.status}`);
    console.log(`Modules: ${user.modules}`);
    process.exit(0);
  } catch (error) {
    console.error("❌ Erro ao buscar permissões:", error);
    process.exit(1);
  }
}

getEdithPermissions();
