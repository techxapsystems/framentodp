import { describe, it, expect, beforeAll } from 'vitest';
import { getDb } from './db';
import { hashPassword, verifyPassword } from './auth';
import { eq } from 'drizzle-orm';

describe('Update User Credentials - edith.ferneda', () => {
  let db: any;

  beforeAll(async () => {
    db = await getDb();
  });

  it('should find user Edithe.framento', async () => {
    if (!db) {
      console.log('Skipping test - no database connection');
      return;
    }

    try {
      const { users } = await import('../drizzle/schema');
      
      // Procurar por Edithe.framento
      const result = await db
        .select()
        .from(users)
        .where(eq(users.email, 'Edithe.framento'));

      console.log('Found user:', result);
      expect(result.length).toBe(1);
      expect(result[0].email).toBe('Edithe.framento');
    } catch (error) {
      console.error('Test error:', error);
      throw error;
    }
  });

  it('should update user email and password', async () => {
    if (!db) {
      console.log('Skipping test - no database connection');
      return;
    }

    try {
      const { users } = await import('../drizzle/schema');
      
      // Hash da nova senha
      const newPassword = 'R1514@';
      const hashedPassword = hashPassword(newPassword);

      // Atualizar usuário
      const result = await db
        .update(users)
        .set({
          email: 'edith.ferneda',
          password: hashedPassword,
        })
        .where(eq(users.email, 'Edithe.framento'));

      console.log('Update result:', result);
      
      // Verificar que foi atualizado
      const updated = await db
        .select()
        .from(users)
        .where(eq(users.email, 'edith.ferneda'));

      expect(updated.length).toBe(1);
      expect(updated[0].email).toBe('edith.ferneda');
      
      // Validar que a senha foi hashada corretamente
      const isPasswordValid = verifyPassword(newPassword, updated[0].password);
      expect(isPasswordValid).toBe(true);
      
      console.log('✅ User updated successfully');
      console.log(`New email: ${updated[0].email}`);
      console.log(`Password verified: ${isPasswordValid}`);
    } catch (error) {
      console.error('Test error:', error);
      throw error;
    }
  });

  it('should verify login with new credentials', async () => {
    if (!db) {
      console.log('Skipping test - no database connection');
      return;
    }

    try {
      const { users } = await import('../drizzle/schema');
      
      // Buscar usuário com novo email
      const result = await db
        .select()
        .from(users)
        .where(eq(users.email, 'edith.ferneda'));

      expect(result.length).toBe(1);
      
      // Validar senha
      const isPasswordValid = verifyPassword('R1514@', result[0].password);
      expect(isPasswordValid).toBe(true);
      
      console.log('✅ Login credentials verified');
      console.log(`Email: ${result[0].email}`);
      console.log(`Password: R1514@ (valid: ${isPasswordValid})`);
    } catch (error) {
      console.error('Test error:', error);
      throw error;
    }
  });
});
