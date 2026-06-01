import { getDb } from "./server/db.ts";
import { users } from "./drizzle/schema.ts";
import bcrypt from "bcryptjs";

const db = await getDb();
if (!db) {
  console.error("❌ Erro: Banco de dados não disponível");
  process.exit(1);
}

const hashedPassword = await bcrypt.hash("Kauana@2026", 10);

const result = await db.insert(users).values({
  email: "kauana.mascarello",
  name: "Kauana Mascarello",
  password: hashedPassword,
  role: "user",
  modules: JSON.stringify(["controle_de_advertencias"]),
});

console.log("✅ Usuário Kauana Mascarello criado com sucesso!");
console.log("Email: kauana.mascarello");
console.log("Senha: Kauana@2026");
console.log("Role: user");
console.log("Módulos: controle_de_advertencias");
