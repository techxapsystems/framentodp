import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { getDb } from './server/db.ts';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function importAdministrativeEmployees() {
  try {
    console.log('✅ Iniciando importação de funcionários administrativos...');
    
    // Ler arquivo JSON
    const jsonPath = '/tmp/administrative_employees.json';
    const jsonData = fs.readFileSync(jsonPath, 'utf-8');
    const employees = JSON.parse(jsonData);
    
    console.log(`✅ ${employees.length} funcionários carregados do arquivo`);
    
    // Obter conexão com banco de dados
    const db = await getDb();
    if (!db) {
      throw new Error('Não foi possível conectar ao banco de dados');
    }
    
    console.log('✅ Conectado ao banco de dados');
    
    let imported = 0;
    let updated = 0;
    let errors = 0;
    
    // Importar cada funcionário
    for (const employee of employees) {
      try {
        // Verificar se já existe
        const existing = await db.query.administrativeEmployees
          .findFirst({
            where: (table, { eq }) => eq(table.cpf, employee.cpf)
          });
        
        if (existing) {
          // Atualizar
          await db.update(administrativeEmployees)
            .set({
              nome: employee.nome,
              cargo: employee.cargo,
              admissao: employee.admissao,
              situacao: employee.situacao,
              updatedAt: new Date()
            })
            .where(eq(administrativeEmployees.cpf, employee.cpf));
          
          updated++;
        } else {
          // Inserir
          await db.insert(administrativeEmployees).values({
            cadastro: employee.cadastro,
            tipo: employee.tipo,
            nome: employee.nome,
            admissao: employee.admissao,
            cargo: employee.cargo,
            situacao: employee.situacao,
            cpf: employee.cpf,
            createdAt: new Date(),
            updatedAt: new Date()
          });
          
          imported++;
        }
        
        if ((imported + updated) % 100 === 0) {
          console.log(`📊 ${imported + updated} funcionários processados...`);
        }
      } catch (err) {
        console.error(`❌ Erro ao importar ${employee.nome}: ${err.message}`);
        errors++;
      }
    }
    
    console.log(`\n✅ IMPORTAÇÃO CONCLUÍDA`);
    console.log(`✅ Novos registros: ${imported}`);
    console.log(`🔄 Registros atualizados: ${updated}`);
    console.log(`❌ Erros: ${errors}`);
    console.log(`📊 Total processado: ${imported + updated + errors}`);
    
    process.exit(0);
  } catch (error) {
    console.error('❌ Erro fatal:', error.message);
    process.exit(1);
  }
}

importAdministrativeEmployees();
