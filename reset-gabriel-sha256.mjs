import crypto from 'crypto';
import mysql from 'mysql2/promise';

const newPassword = 'Admin@2026';
const jwtSecret = process.env.JWT_SECRET || 'default-secret';
const hashedPassword = crypto
  .createHash('sha256')
  .update(newPassword + jwtSecret)
  .digest('hex');

async function updatePassword() {
  const connection = await mysql.createConnection(process.env.DATABASE_URL);
  
  try {
    const [result] = await connection.execute(
      'UPDATE users SET password = ? WHERE email = ?',
      [hashedPassword, 'gabriel.ferreira']
    );
    
    console.log('✅ Gabriel Ferreira password updated with SHA-256');
    console.log('Password:', newPassword);
    console.log('Hash:', hashedPassword);
    console.log('Rows affected:', result.affectedRows);
  } catch (error) {
    console.error('Error:', error.message);
  } finally {
    await connection.end();
  }
}

updatePassword();
