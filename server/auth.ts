import crypto from "crypto";

/**
 * Hash de senha usando SHA-256 simples
 * Em produção, usar bcrypt ou argon2
 */
export function hashPassword(password: string): string {
  return crypto
    .createHash("sha256")
    .update(password + process.env.JWT_SECRET || "default-secret")
    .digest("hex");
}

/**
 * Verificar se senha está correta
 */
export function verifyPassword(password: string, hash: string): boolean {
  return hashPassword(password) === hash;
}

/**
 * Credenciais padrão do admin
 */
export const ADMIN_CREDENTIALS = {
  email: "admin@techxap.com",
  password: "admin123",
  name: "Administrador TechXap",
  role: "admin" as const,
};

/**
 * Criar usuário admin padrão se não existir
 */
export async function ensureAdminExists(db: any) {
  try {
    const { users } = await import("../drizzle/schema");
    const { eq } = await import("drizzle-orm");

    const existing = await db
      .select()
      .from(users)
      .where(eq(users.email, ADMIN_CREDENTIALS.email));

    if (existing.length === 0) {
      await db.insert(users).values({
        email: ADMIN_CREDENTIALS.email,
        password: hashPassword(ADMIN_CREDENTIALS.password),
        name: ADMIN_CREDENTIALS.name,
        role: ADMIN_CREDENTIALS.role,
        loginMethod: "email",
        status: "ativo",
        modulos: JSON.stringify(["controle_de_advertencias", "banco_de_horas"]),
      });
      console.log("[Auth] Admin user created successfully");
    }
  } catch (error) {
    console.error("[Auth] Error ensuring admin exists:", error);
  }
}
