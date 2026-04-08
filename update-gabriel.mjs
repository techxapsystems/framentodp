import mysql from 'mysql2/promise';
import bcryptjs from 'bcryptjs';

const newPassword = 'Admin@2026';
const hashedPassword = bcryptjs.hashSync(newPassword, 10);

async function updatePassword() {
  const connection = await mysql.createConnection(process.env.DATABASE_URL);
  
  try {
    const [result] = await connection.execute(
      'UPDATE users SET password = ? WHERE email = ?',
      [hashedPassword, 'gabriel.santos']
    );
    
    console.log('✅ Gabriel password updated');
    console.log('Rows affected:', result.affectedRows);
  } catch (error) {
    console.error('Error:', error.message);
  } finally {
    await connection.end();
  }
}

updatePassword();
