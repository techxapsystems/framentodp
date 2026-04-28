import { getDb } from "../server/db";
import { users } from "../drizzle/schema";
import { eq } from "drizzle-orm";
import { hashPassword, verifyPassword } from "../server/auth";

async function verifyKauani() {
  try {
    const db = await getDb();
    if (!db) {
      console.log("❌ Banco de dados não disponível");
      process.exit(1);
    }

    const email = "kauani.framento";
    const password = "kauani@12";

    // Buscar usuário
    const result = await db
      .select()
      .from(users)
      .where(eq(users.email, email));

    if (result.length === 0) {
      console.log("❌ Usuário não encontrado");
      process.exit(1);
    }

    const user = result[0];
    console.log("✅ Usuário encontrado:");
    console.log(`Email: ${user.email}`);
    console.log(`Nome: ${user.name}`);
    console.log(`Status: ${user.status}`);
    console.log(`Role: ${user.role}`);
    console.log(`Modules: ${user.modules}`);
    console.log(`Password hash: ${user.password?.substring(0, 20)}...`);

    // Verificar senha
    const passwordHash = hashPassword(password);
    console.log(`\nVerificando senha...`);
    console.log(`Senha fornecida hash: ${passwordHash.substring(0, 20)}...`);
    console.log(`Senha no banco hash: ${user.password?.substring(0, 20)}...`);
    
    const isValid = verifyPassword(password, user.password || "");
    console.log(`Senha válida: ${isValid}`);

    process.exit(0);
  } catch (error) {
    console.error("❌ Erro:", error);
    process.exit(1);
  }
}

verifyKauani();
