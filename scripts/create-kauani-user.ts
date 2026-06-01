import { getDb } from "../server/db";
import { users } from "../drizzle/schema";
import { hashPassword } from "../server/auth";

async function createKauaniUser() {
  try {
    const db = await getDb();
    if (!db) {
      console.log("❌ Banco de dados não disponível");
      process.exit(1);
    }

    const email = "kauani.framento";
    const password = "kauani@12";
    const hashedPassword = hashPassword(password);

    // Criar novo usuário com as mesmas permissões da Edith
    await db.insert(users).values({
      name: "Kauani",
      email: email,
      password: hashedPassword,
      role: "user",
      department: "geral",
      modules: JSON.stringify(["controle_de_advertencias"]),
      status: "ativo",
      loginMethod: "email",
    });

    console.log("✅ Usuário criado com sucesso!");
    console.log(`Email: ${email}`);
    console.log(`Senha: ${password}`);
    console.log(`Role: user`);
    console.log(`Modules: ["controle_de_advertencias"]`);
    process.exit(0);
  } catch (error) {
    console.error("❌ Erro ao criar usuário:", error);
    process.exit(1);
  }
}

createKauaniUser();
