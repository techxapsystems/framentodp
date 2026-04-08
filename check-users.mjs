import mysql from 'mysql2/promise';

async function checkUsers() {
  const connection = await mysql.createConnection(process.env.DATABASE_URL);
  
  try {
    const [rows] = await connection.execute('SELECT id, email, name, role FROM users');
    console.log('Users in database:');
    console.table(rows);
  } catch (error) {
    console.error('Error:', error.message);
  } finally {
    await connection.end();
  }
}

checkUsers();
