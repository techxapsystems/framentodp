import mysql from 'mysql2/promise';

async function checkPassword() {
  const connection = await mysql.createConnection(process.env.DATABASE_URL);
  
  try {
    const [rows] = await connection.execute('SELECT email, password FROM users WHERE email = ?', ['gabriel.ferreira']);
    if (rows.length > 0) {
      console.log('Gabriel Ferreira password hash:', rows[0].password);
      console.log('Hash length:', rows[0].password.length);
    } else {
      console.log('Gabriel Ferreira not found');
    }
  } catch (error) {
    console.error('Error:', error.message);
  } finally {
    await connection.end();
  }
}

checkPassword();
