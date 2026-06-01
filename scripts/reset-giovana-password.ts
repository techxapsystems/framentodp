import { getDb } from "../server/db";
import { users } from "../drizzle/schema";
import { hashPassword } from "../server/auth";
import { eq } from "drizzle-orm";

async function resetPassword() {
  try {
    const db = await getDb();
    if (!db) {
      console.log("❌ Banco de dados não disponível");
      process.exit(1);
    }

    const newPassword = "Giovana@12";
    const hashedPassword = hashPassword(newPassword);

    // Atualizar senha do usuário giovana.framento
    await db
      .update(users)
      .set({ password: hashedPassword })
      .where(eq(users.email, "giovana.framento"));

    console.log("✅ Senha resetada com sucesso!");
    console.log(`Email: giovana.framento`);
    console.log(`Nova senha: ${newPassword}`);
    process.exit(0);
  } catch (error) {
    console.error("❌ Erro ao resetar senha:", error);
    process.exit(1);
  }
}

resetPassword();
