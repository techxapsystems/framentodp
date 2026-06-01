import mysql from 'mysql2/promise';

async function clearAllData() {
  const connection = await mysql.createConnection(process.env.DATABASE_URL);
  
  try {
    console.log('🔄 Iniciando limpeza de dados...\n');
    
    // Desabilitar foreign key checks
    await connection.execute('SET FOREIGN_KEY_CHECKS = 0');
    
    // Tabelas para limpar (mantendo estrutura)
    const tablesToClear = [
      'txtemp_analysis_results',
      'txtemp_trips',
      'txtemp_imports',
      'warnings',
      'warnings_history',
      'journey_hours',
      'journeys',
      'imports',
      'email_allowlist'
    ];
    
    for (const table of tablesToClear) {
      try {
        const [result] = await connection.execute(`DELETE FROM ${table}`);
        console.log(`✅ ${table}: ${result.affectedRows} registros deletados`);
      } catch (error) {
        // Tabela pode não existir, ignorar
        console.log(`⏭️  ${table}: não encontrada ou erro ao deletar`);
      }
    }
    
    // Reabilitar foreign key checks
    await connection.execute('SET FOREIGN_KEY_CHECKS = 1');
    
    console.log('\n✅ Limpeza concluída com sucesso!');
    console.log('📊 Sistema zerado - pronto para novos dados');
    
  } catch (error) {
    console.error('❌ Erro durante limpeza:', error.message);
  } finally {
    await connection.end();
  }
}

clearAllData();
