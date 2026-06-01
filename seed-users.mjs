import mysql from 'mysql2/promise';
import crypto from 'crypto';

// Gerar IDs únicos para openId (simulando OAuth)
function generateOpenId() {
  return crypto.randomBytes(32).toString('hex');
}

// Gerar senhas aleatórias
function generatePassword() {
  return crypto.randomBytes(8).toString('hex');
}

async function seedUsers() {
  const connection = await mysql.createConnection({
    host: process.env.DATABASE_HOST || 'localhost',
    user: process.env.DATABASE_USER || 'root',
    password: process.env.DATABASE_PASSWORD || '',
    database: process.env.DATABASE_NAME || 'driver_dashboard',
  });

  try {
    // Dados dos usuários
    const users = [
      {
        openId: generateOpenId(),
        name: 'Giovana Lucatteli',
        email: 'giovana.lucatteli@transframento.com',
        loginMethod: 'oauth',
        role: 'user',
        department: 'dp',
        modules: JSON.stringify(['advertencias']), // Apenas módulo de advertências
      },
      {
        openId: generateOpenId(),
        name: 'Gabriel Ferreira',
        email: 'gabriel.ferreira@transframento.com.br',
        loginMethod: 'oauth',
        role: 'admin',
        department: 'geral',
        modules: JSON.stringify(['ociosidade', 'jornada', 'advertencias', 'orientacoes', 'relatorios', 'configuracoes']), // Todos os módulos
      },
    ];

    // Inserir usuários
    for (const user of users) {
      const query = `
        INSERT INTO users (openId, name, email, loginMethod, role, department, modules, createdAt, updatedAt, lastSignedIn)
        VALUES (?, ?, ?, ?, ?, ?, ?, NOW(), NOW(), NOW())
        ON DUPLICATE KEY UPDATE
        name = VALUES(name),
        role = VALUES(role),
        department = VALUES(department),
        modules = VALUES(modules),
        updatedAt = NOW()
      `;

      await connection.execute(query, [
        user.openId,
        user.name,
        user.email,
        user.loginMethod,
        user.role,
        user.department,
        user.modules,
      ]);

      console.log(`✅ Usuário criado: ${user.name} (${user.email})`);
      console.log(`   Departamento: ${user.department}`);
      console.log(`   Módulos: ${user.modules}`);
      console.log('');
    }

    console.log('✅ Usuários inseridos com sucesso!');
  } catch (error) {
    console.error('❌ Erro ao inserir usuários:', error);
  } finally {
    await connection.end();
  }
}

seedUsers();
