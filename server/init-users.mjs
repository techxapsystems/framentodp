import crypto from 'crypto';
import mysql from 'mysql2/promise';

const jwt_secret = process.env.JWT_SECRET || 'default-secret';

function hashPassword(password) {
  return crypto
    .createHash('sha256')
    .update(password + jwt_secret)
    .digest('hex');
}

async function initUsers() {
  try {
    // Parse DATABASE_URL or use individual env vars
    let connection;
    if (process.env.DATABASE_URL) {
      connection = await mysql.createConnection(process.env.DATABASE_URL);
    } else {
      connection = await mysql.createConnection({
        host: process.env.DB_HOST || 'localhost',
        user: process.env.DB_USER || 'root',
        password: process.env.DB_PASSWORD || '',
        database: process.env.DB_NAME || 'driver_dashboard',
      });
    }

    // Delete existing users
    await connection.execute('DELETE FROM users WHERE email IN (?, ?)', [
      'gabriel.ferreira',
      'edithe.rezende'
    ]);

    // Create gabriel
    const gabriel_hash = hashPassword('gabriel12');
    await connection.execute(
      `INSERT INTO users (email, name, password, role, status, loginMethod, modules, createdAt, updatedAt) 
       VALUES (?, ?, ?, ?, ?, ?, ?, NOW(), NOW())`,
      [
        'gabriel.ferreira',
        'Gabriel Ferreira',
        gabriel_hash,
        'admin',
        'ativo',
        'manual',
        JSON.stringify(['controle_de_advertencias', 'banco_de_horas'])
      ]
    );

    // Create edithe
    const edithe_hash = hashPassword('jyKr%tHzNy6l');
    await connection.execute(
      `INSERT INTO users (email, name, password, role, status, loginMethod, modules, createdAt, updatedAt) 
       VALUES (?, ?, ?, ?, ?, ?, ?, NOW(), NOW())`,
      [
        'edithe.rezende',
        'Edithe Rezende',
        edithe_hash,
        'user',
        'ativo',
        'manual',
        JSON.stringify(['controle_de_advertencias'])
      ]
    );

    console.log('✅ Users created successfully');
    console.log(`Gabriel hash: ${gabriel_hash}`);
    console.log(`Edithe hash: ${edithe_hash}`);

    await connection.end();
  } catch (error) {
    console.error('Error:', error);
    process.exit(1);
  }
}

initUsers();
