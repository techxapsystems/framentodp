import { getDb } from './server/_core/db.ts';
import { imports } from './drizzle/schema.ts';
import { desc } from 'drizzle-orm';

const db = await getDb();
if (!db) {
  console.log('❌ Banco de dados não conectado');
  process.exit(1);
}

try {
  const result = await db
    .select()
    .from(imports)
    .orderBy(desc(imports.importedAt))
    .limit(5);
  
  console.log('✅ Registros encontrados:', result.length);
  result.forEach((imp, i) => {
    console.log(`\n${i + 1}. ${imp.fileName}`);
    console.log(`   - Importado em: ${imp.importedAt}`);
    console.log(`   - Total: ${imp.rowCount}, Novos: ${imp.newRowsCount}`);
  });
} catch (error) {
  console.error('❌ Erro:', error.message);
}
