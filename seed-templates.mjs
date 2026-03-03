import { drizzle } from 'drizzle-orm/mysql2/http';
import { modelCategories, warningTemplates } from './drizzle/schema.ts';
import { Document } from 'docx';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// Conectar ao banco
const db = drizzle(process.env.DATABASE_URL);

// Categorias mapeadas dos nomes dos arquivos
const categoryMap = {
  'velocidade': { name: 'Excesso de Velocidade', type: 'advertencia' },
  'falta': { name: 'Falta Injustificada', type: 'advertencia' },
  'insubordinação': { name: 'Insubordinação', type: 'advertencia' },
  'celular': { name: 'Uso de Celular', type: 'advertencia' },
  'carrona': { name: 'Carrona', type: 'advertencia' },
  'atolar': { name: 'Atolar Veículo', type: 'advertencia' },
  'atraso': { name: 'Atraso', type: 'advertencia' },
  'dissidia': { name: 'Dissidia', type: 'advertencia' },
  'intervalo': { name: 'Intervalo de Almoço', type: 'advertencia' },
  'jornada': { name: 'Jornada', type: 'advertencia' },
  'pernoites': { name: 'Pernoites', type: 'advertencia' },
  'improbidade': { name: 'Ato de Improbidade', type: 'advertencia' },
  'toxicológico': { name: 'Exame Toxicológico', type: 'advertencia' },
  'calço': { name: 'Falta de Calço', type: 'suspensao' },
  'colidir': { name: 'Colisão de Veículo', type: 'suspensao' },
  'desvio': { name: 'Desvio de Rota', type: 'suspensao' },
  'entrega': { name: 'Atraso na Entrega', type: 'suspensao' },
  'deslocamento': { name: 'Deslocamento Não Autorizado', type: 'suspensao' },
  'ameaça': { name: 'Ameaça', type: 'suspensao' },
  'ignição': { name: 'Ignição Ligada', type: 'suspensao' },
  'cinto': { name: 'Cinto de Segurança', type: 'advertencia' },
  'necessidades': { name: 'Necessidades em Local Proibido', type: 'advertencia' },
};

async function seedTemplates() {
  console.log('🌱 Iniciando seed de modelos de advertências...');
  
  try {
    // Ler JSON com modelos extraídos
    const modelsJson = JSON.parse(fs.readFileSync('/home/ubuntu/driver-dashboard/models_extracted.json', 'utf-8'));
    
    // Criar categorias
    const categories = {};
    for (const [key, value] of Object.entries(categoryMap)) {
      try {
        const result = await db.insert(modelCategories).values({
          name: value.name,
          type: value.type,
          description: `Modelos para ${value.name.toLowerCase()}`,
          isActive: true,
        });
        categories[value.name] = result;
        console.log(`✅ Categoria criada: ${value.name}`);
      } catch (e) {
        // Categoria pode já existir
        console.log(`⚠️  Categoria já existe: ${value.name}`);
      }
    }
    
    // Inserir modelos
    let inserted = 0;
    for (const model of modelsJson) {
      try {
        // Determinar categoria
        let categoryName = 'Geral';
        for (const [key, value] of Object.entries(categoryMap)) {
          if (model.categoria.toLowerCase().includes(key)) {
            categoryName = value.name;
            break;
          }
        }
        
        // Encontrar ID da categoria
        const category = await db.query.modelCategories.findFirst({
          where: (table, { eq }) => eq(table.name, categoryName)
        });
        
        if (category) {
          await db.insert(warningTemplates).values({
            categoryId: category.id,
            title: model.categoria,
            type: model.tipo === 'Suspensão' ? 'suspensao' : 'advertencia',
            content: model.conteudo,
            summary: model.conteudo.substring(0, 200),
            sourceFile: model.filename,
            isActive: true,
          });
          inserted++;
        }
      } catch (e) {
        console.error(`Erro ao inserir modelo ${model.filename}:`, e.message);
      }
    }
    
    console.log(`✅ ${inserted} modelos inseridos com sucesso!`);
    process.exit(0);
  } catch (error) {
    console.error('❌ Erro ao fazer seed:', error);
    process.exit(1);
  }
}

seedTemplates();
