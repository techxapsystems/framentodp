import bcrypt from 'bcryptjs';
import { drizzle } from 'drizzle-orm/mysql2';
import { users } from './drizzle/schema';

const newPassword = 'Admin@2026';
const hashedPassword = bcrypt.hashSync(newPassword, 10);

const db = drizzle(process.env.DATABASE_URL!);

async function createGabriel() {
  try {
    const result = await db.insert(users).values({
      email: 'gabriel.santos',
      name: 'Gabriel Santos',
      password: hashedPassword,
      role: 'admin',
      loginMethod: 'email',
      status: 'ativo',
      modules: JSON.stringify(['controle_de_advertencias', 'banco_de_horas']),
    });
    console.log('✅ Gabriel created successfully!');
    console.log('Email: gabriel.santos');
    console.log('Password: Admin@2026');
    console.log('Result:', result);
  } catch (error: any) {
    if (error.message.includes('Duplicate entry')) {
      console.log('⚠️ User already exists');
    } else {
      console.error('Error:', error.message);
    }
  }
  process.exit(0);
}

createGabriel();
