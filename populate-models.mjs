import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Importar dados
const modelsData = JSON.parse(fs.readFileSync(path.join(__dirname, 'models_data.json'), 'utf-8'));

// Importar db
import { getDb } from './server/db.ts';
import { warningTemplates, modelCategories } from './drizzle/schema.ts';

async function populateModels() {
  try {
    const db = await getDb();
    
    console.log(`\n📚 Iniciando população de ${modelsData.length} modelos...\n`);
    
    // Extrair categorias únicas
    const uniqueCategories = [...new Set(modelsData.map(m => m.category))];
    
    // Inserir categorias
    console.log(`📁 Inserindo ${uniqueCategories.length} categorias...`);
    for (const category of uniqueCategories) {
      await db.insert(modelCategories).values({
        name: category,
        description: `Modelos de ${category}`,
      }).onDuplicateKeyUpdate({ set: { name: category } });
    }
    console.log(`✓ ${uniqueCategories.length} categorias inseridas\n`);
    
    // Inserir modelos
    console.log(`📄 Inserindo ${modelsData.length} modelos...`);
    let inserted = 0;
    for (const model of modelsData) {
      try {
        await db.insert(warningTemplates).values({
          title: model.title,
          category: model.category,
          type: model.type,
          content: model.content,
          isActive: true,
        });
        inserted++;
        if (inserted % 10 === 0) {
          console.log(`  ✓ ${inserted}/${modelsData.length} modelos inseridos...`);
        }
      } catch (error) {
        console.error(`  ✗ Erro ao inserir "${model.title}": ${error.message}`);
      }
    }
    
    console.log(`\n✅ População concluída!`);
    console.log(`   Total de modelos inseridos: ${inserted}/${modelsData.length}`);
    console.log(`   Categorias: ${uniqueCategories.length}`);
    
    process.exit(0);
  } catch (error) {
    console.error('❌ Erro ao popular modelos:', error);
    process.exit(1);
  }
}

populateModels();
