import { getDb } from '../server/db';
import { warnings } from '../drizzle/schema';

async function cleanWarnings() {
  try {
    const db = await getDb();
    if (!db) {
      console.log('❌ Erro: Não foi possível conectar ao banco de dados');
      process.exit(1);
    }

    // Deletar todas as advertências
    await db.delete(warnings);
    console.log('✅ Todas as advertências e suspensões foram deletadas');
    process.exit(0);
  } catch (error) {
    console.error('❌ Erro ao limpar warnings:', error);
    process.exit(1);
  }
}

cleanWarnings();
