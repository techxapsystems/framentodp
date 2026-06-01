import { createConnection } from 'mysql2/promise';
import bcrypt from 'bcrypt';

const connection = await createConnection({
  host: process.env.DB_HOST || 'localhost',
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASSWORD || '',
  database: process.env.DB_NAME || 'driver_dashboard'
});

const newPassword = 'Admin@2026';
const hashedPassword = await bcrypt.hash(newPassword, 10);

await connection.execute(
  'UPDATE users SET password = ? WHERE username = ?',
  [hashedPassword, 'gabriel.santos']
);

console.log('Password reset successfully for gabriel.santos');
console.log('New password: Admin@2026');

await connection.end();
