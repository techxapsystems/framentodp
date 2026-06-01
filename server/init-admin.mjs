import mysql from "mysql2/promise";
import crypto from "crypto";
import dotenv from "dotenv";

dotenv.config();

const DATABASE_URL = process.env.DATABASE_URL;
const JWT_SECRET = process.env.JWT_SECRET || "default-secret";

function hashPassword(password) {
  return crypto
    .createHash("sha256")
    .update(password + JWT_SECRET)
    .digest("hex");
}

async function initAdmin() {
  if (!DATABASE_URL) {
    console.error("DATABASE_URL não configurada");
    process.exit(1);
  }

  const connection = await mysql.createConnection(DATABASE_URL);

  try {
    console.log("Verificando se admin existe...");

    const [rows] = await connection.execute(
      "SELECT id FROM users WHERE email = ?",
      ["admin@techxap.com"]
    );

    if (rows.length > 0) {
      console.log("✅ Admin já existe no banco de dados");
      return;
    }

    console.log("Criando usuário admin...");

    const adminPassword = hashPassword("gabriel12");
    const modulos = JSON.stringify(["controle_de_advertencias", "banco_de_horas"]);

    await connection.execute(
      `INSERT INTO users (email, name, password, role, modules, status, loginMethod, createdAt, updatedAt, lastSignedIn)
       VALUES (?, ?, ?, ?, ?, ?, ?, NOW(), NOW(), NOW())`,
      [
        "gabriel.ferreira",
        "Gabriel Ferreira",
        adminPassword,
        "admin",
        modulos,
        "ativo",
        "email",
      ]
    );

    console.log("✅ Admin criado com sucesso!");
    console.log("📧 Email: gabriel.ferreira");
    console.log("🔐 Senha: gabriel12");
  } catch (error) {
    console.error("❌ Erro ao criar admin:", error.message);
    process.exit(1);
  } finally {
    await connection.end();
  }
}

initAdmin();
