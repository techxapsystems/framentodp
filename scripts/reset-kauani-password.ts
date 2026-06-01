import { getDb } from "../server/db";
import { users } from "../drizzle/schema";
import { hashPassword } from "../server/auth";
import { eq } from "drizzle-orm";

async function resetKauaniPassword() {
  try {
    const db = await getDb();
    if (!db) {
      console.log("❌ Banco de dados não disponível");
      process.exit(1);
    }

    const email = "kauani.framento";
    const newPassword = "kauani@12";
    const hashedPassword = hashPassword(newPassword);

    // Atualizar senha do usuário kauani.framento
    await db
      .update(users)
      .set({ password: hashedPassword })
      .where(eq(users.email, email));

    console.log("✅ Senha resetada com sucesso!");
    console.log(`Email: ${email}`);
    console.log(`Nova senha: ${newPassword}`);
    process.exit(0);
  } catch (error) {
    console.error("❌ Erro ao resetar senha:", error);
    process.exit(1);
  }
}

resetKauaniPassword();
