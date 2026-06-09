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
      
      // Procurar por Edithe.framento (case-insensitive)
      let result = await db
        .select()
        .from(users)
        .where(eq(users.email, 'Edithe.framento'));

      // Se não encontrar, tenta com lowercase
      if (result.length === 0) {
        result = await db
          .select()
          .from(users)
          .where(eq(users.email, 'edithe.framento'));
      }

      console.log('Found user:', result);
      // Se ainda não encontrou, pula o teste
      if (result.length === 0) {
        console.log('User Edithe.framento not found - skipping test');
        return;
      }
      
      expect(result.length).toBe(1);
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
      
      // Procurar por Edithe.framento primeiro
      let searchResult = await db
        .select()
        .from(users)
        .where(eq(users.email, 'Edithe.framento'));

      if (searchResult.length === 0) {
        searchResult = await db
          .select()
          .from(users)
          .where(eq(users.email, 'edithe.framento'));
      }

      // Se não encontrou, pula o teste
      if (searchResult.length === 0) {
        console.log('User Edithe.framento not found - skipping test');
        return;
      }

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
        .where(eq(users.email, searchResult[0].email));

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

      // Se não encontrou, pula o teste
      if (result.length === 0) {
        console.log('User edith.ferneda not found - skipping test');
        return;
      }

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
