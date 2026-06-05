/**
 * CLEANUP SCRIPT - Delete bulk-imported warnings
 * Mantém advertências criadas por Kauana
 * Registra todas as exclusões para auditoria
 */

import mysql from 'mysql2/promise';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// Configuração do banco
const dbConfig = {
  host: process.env.DB_HOST || 'localhost',
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASSWORD || '',
  database: process.env.DB_NAME || 'driver_dashboard',
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0,
};

async function main() {
  let connection;
  const auditLog = [];
  
  try {
    console.log('🔍 Conectando ao banco de dados...');
    connection = await mysql.createConnection(dbConfig);
    
    // 1. QUERY: Identifica advertências criadas pelo admin (você) nos últimos 2 dias
    console.log('\n📋 Consultando advertências criadas nos últimos 2 dias...');
    
    const [adminWarnings] = await connection.execute(`
      SELECT 
        id,
        conductorName,
        aplicadoPor,
        tipo,
        criadoEm,
        DATE(criadoEm) as data_criacao
      FROM warnings
      WHERE aplicadoPor = 'admin'
        AND DATE(criadoEm) >= DATE_SUB(CURDATE(), INTERVAL 2 DAY)
      ORDER BY criadoEm DESC
    `);
    
    console.log(`✅ Encontradas ${adminWarnings.length} advertências criadas por admin`);
    
    // 2. QUERY: Identifica advertências criadas por Kauana
    console.log('\n📋 Consultando advertências criadas por Kauana...');
    
    const [kauanaWarnings] = await connection.execute(`
      SELECT 
        id,
        conductorName,
        aplicadoPor,
        tipo,
        criadoEm,
        DATE(criadoEm) as data_criacao
      FROM warnings
      WHERE aplicadoPor LIKE '%kauana%' OR aplicadoPor LIKE '%Kauana%'
        AND DATE(criadoEm) >= DATE_SUB(CURDATE(), INTERVAL 2 DAY)
      ORDER BY criadoEm DESC
    `);
    
    console.log(`✅ Encontradas ${kauanaWarnings.length} advertências criadas por Kauana`);
    
    // Log de auditoria
    auditLog.push({
      timestamp: new Date().toISOString(),
      action: 'QUERY',
      description: 'Identificação de advertências para limpeza',
      adminWarningsCount: adminWarnings.length,
      kauanaWarningsCount: kauanaWarnings.length,
    });
    
    if (adminWarnings.length === 0) {
      console.log('\n✅ Nenhuma advertência do admin para deletar');
      console.log('\n📊 RESUMO:');
      console.log(`  - Advertências do admin: 0`);
      console.log(`  - Advertências de Kauana: ${kauanaWarnings.length} (PROTEGIDAS)`);
      return;
    }
    
    // 3. CRIAR BACKUP antes de deletar
    console.log('\n💾 Criando backup das advertências que serão deletadas...');
    
    const backupData = {
      timestamp: new Date().toISOString(),
      deletedBy: 'admin',
      reason: 'Limpeza de importação em massa',
      warnings: adminWarnings,
      count: adminWarnings.length,
    };
    
    const backupDir = path.join(__dirname, '../backups');
    if (!fs.existsSync(backupDir)) {
      fs.mkdirSync(backupDir, { recursive: true });
    }
    
    const backupFile = path.join(backupDir, `backup-${Date.now()}.json`);
    fs.writeFileSync(backupFile, JSON.stringify(backupData, null, 2));
    console.log(`✅ Backup criado: ${backupFile}`);
    
    auditLog.push({
      timestamp: new Date().toISOString(),
      action: 'BACKUP',
      description: 'Backup criado antes da exclusão',
      backupFile,
      recordsBackedUp: adminWarnings.length,
    });
    
    // 4. DELETAR advertências do admin
    console.log('\n🗑️  Deletando advertências do admin...');
    
    const idsToDelete = adminWarnings.map(w => w.id);
    const placeholders = idsToDelete.map(() => '?').join(',');
    
    const [deleteResult] = await connection.execute(`
      DELETE FROM warnings
      WHERE id IN (${placeholders})
    `, idsToDelete);
    
    console.log(`✅ ${deleteResult.affectedRows} advertências deletadas`);
    
    auditLog.push({
      timestamp: new Date().toISOString(),
      action: 'DELETE',
      description: 'Advertências deletadas',
      deletedCount: deleteResult.affectedRows,
      deletedIds: idsToDelete,
    });
    
    // 5. VERIFICAR integridade do banco
    console.log('\n🔐 Verificando integridade do banco...');
    
    const [totalWarnings] = await connection.execute(`
      SELECT COUNT(*) as total FROM warnings
    `);
    
    const [adminWarningsAfter] = await connection.execute(`
      SELECT COUNT(*) as total FROM warnings WHERE aplicadoPor = 'admin'
    `);
    
    const [kauanaWarningsAfter] = await connection.execute(`
      SELECT COUNT(*) as total FROM warnings 
      WHERE aplicadoPor LIKE '%kauana%' OR aplicadoPor LIKE '%Kauana%'
    `);
    
    console.log(`✅ Total de advertências no banco: ${totalWarnings[0].total}`);
    console.log(`✅ Advertências do admin restantes: ${adminWarningsAfter[0].total}`);
    console.log(`✅ Advertências de Kauana: ${kauanaWarningsAfter[0].total} (PROTEGIDAS)`);
    
    auditLog.push({
      timestamp: new Date().toISOString(),
      action: 'VERIFY',
      description: 'Verificação de integridade após exclusão',
      totalWarnings: totalWarnings[0].total,
      adminWarningsRemaining: adminWarningsAfter[0].total,
      kauanaWarningsRemaining: kauanaWarningsAfter[0].total,
    });
    
    // 6. SALVAR log de auditoria
    console.log('\n📝 Salvando log de auditoria...');
    
    const auditDir = path.join(__dirname, '../audit-logs');
    if (!fs.existsSync(auditDir)) {
      fs.mkdirSync(auditDir, { recursive: true });
    }
    
    const auditFile = path.join(auditDir, `cleanup-${Date.now()}.json`);
    fs.writeFileSync(auditFile, JSON.stringify(auditLog, null, 2));
    console.log(`✅ Log de auditoria salvo: ${auditFile}`);
    
    // 7. RESUMO FINAL
    console.log('\n' + '='.repeat(60));
    console.log('📊 RESUMO DA OPERAÇÃO');
    console.log('='.repeat(60));
    console.log(`✅ Advertências deletadas: ${deleteResult.affectedRows}`);
    console.log(`✅ Advertências de Kauana protegidas: ${kauanaWarningsAfter[0].total}`);
    console.log(`✅ Backup criado: ${backupFile}`);
    console.log(`✅ Auditoria registrada: ${auditFile}`);
    console.log('='.repeat(60));
    
  } catch (error) {
    console.error('❌ Erro:', error.message);
    auditLog.push({
      timestamp: new Date().toISOString(),
      action: 'ERROR',
      description: error.message,
      stack: error.stack,
    });
    throw error;
  } finally {
    if (connection) {
      await connection.end();
    }
  }
}

main().catch(console.error);
