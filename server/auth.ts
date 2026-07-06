import bcrypt from "bcrypt";

/**
 * Hash de senha usando bcrypt
 * Seguro e resistente a ataques de força bruta
 */
export async function hashPassword(password: string): Promise<string> {
  const saltRounds = 10;
  return bcrypt.hash(password, saltRounds);
}

/**
 * Verificar se senha está correta
 */
export async function verifyPassword(password: string, hash: string): Promise<boolean> {
  return bcrypt.compare(password, hash);
}

/**
 * Credenciais padrão do admin
 */
export const ADMIN_CREDENTIALS = {
  email: "gabriel.ferreira",
  password: "gabriel12",
  name: "Gabriel Ferreira",
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
      const hashedPassword = await hashPassword(ADMIN_CREDENTIALS.password);
      await db.insert(users).values({
        email: ADMIN_CREDENTIALS.email,
        password: hashedPassword,
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
