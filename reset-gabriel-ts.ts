import bcrypt from 'bcryptjs';
import { drizzle } from 'drizzle-orm/mysql2';
import { eq } from 'drizzle-orm';
import { users } from './drizzle/schema';

const newPassword = 'Admin@2026';
const hashedPassword = bcrypt.hashSync(newPassword, 10);

const db = drizzle(process.env.DATABASE_URL!);

async function resetPassword() {
  try {
    const result = await db.update(users).set({ password: hashedPassword }).where(eq(users.email, 'gabriel.santos'));
    console.log('✅ Gabriel password reset to: Admin@2026');
    console.log('Result:', result);
  } catch (error) {
    console.error('Error:', error);
  }
  process.exit(0);
}

resetPassword();
