import fs from 'fs';
import { parse as csvParse } from 'csv-parse/sync';
import mysql from 'mysql2/promise';
import dotenv from 'dotenv';

dotenv.config();

const DATABASE_URL = process.env.DATABASE_URL;

async function importConductors() {
  // Ler arquivo CSV
  const csvContent = fs.readFileSync('/home/ubuntu/upload/TODOS11_LIMPO.csv', 'utf-8');
  const records = csvParse(csvContent, {
    columns: true,
    skip_empty_lines: true,
  });

  console.log(`📊 Total de registros no arquivo: ${records.length}`);

  // Conectar ao banco
  const connection = await mysql.createConnection(DATABASE_URL);

  try {
    // Limpar tabela de motoristas (manter histórico de advertências)
    console.log('🗑️  Limpando tabela de motoristas...');
    await connection.execute('DELETE FROM conductors');
    console.log('✓ Tabela limpa');

    // Preparar dados para inserção
    const conductorsData = records.map((record) => [
      record.Condutor.trim(),
      record.CPF.trim(),
      record.Matrícula.trim(),
      record.Operação.trim(),
      record.Cargo.trim(),
      record.Placa.trim(),
      'ativo', // status
    ]);

    console.log(`\n📝 Preparando inserção de ${conductorsData.length} motoristas...`);

    // Inserir em lotes (500 por vez)
    const batchSize = 500;
    let inserted = 0;
    let errors = 0;

    for (let i = 0; i < conductorsData.length; i += batchSize) {
      const batch = conductorsData.slice(i, i + batchSize);
      const placeholders = batch.map(() => '(?, ?, ?, ?, ?, ?, ?)').join(',');

      const sql = `
        INSERT INTO conductors (nome, cpf, matricula, operacao, cargo, placa, status)
        VALUES ${placeholders}
      `;

      const values = batch.flat();

      try {
        const [result] = await connection.execute(sql, values);
        inserted += result.affectedRows;
        console.log(
          `✓ Lote ${Math.floor(i / batchSize) + 1}: ${result.affectedRows} motoristas inseridos (total: ${inserted})`
        );
      } catch (error) {
        console.error(`❌ Erro ao inserir lote ${Math.floor(i / batchSize) + 1}:`, error.message);
        errors++;
      }
    }

    console.log(`\n✅ Importação concluída!`);
    console.log(`   - Motoristas inseridos: ${inserted}`);
    console.log(`   - Erros: ${errors}`);

    // Validação final
    const [countResult] = await connection.execute('SELECT COUNT(*) as count FROM conductors');
    const totalInDatabase = countResult[0].count;
    console.log(`\n🔍 Validação: ${totalInDatabase} motoristas no banco de dados`);

    if (totalInDatabase === records.length) {
      console.log('✅ SUCESSO! Todos os motoristas foram importados corretamente!');
    } else {
      console.log(
        `⚠️  AVISO: Esperado ${records.length}, mas encontrado ${totalInDatabase} no banco`
      );
    }

    // Exibir amostra dos dados
    console.log('\n📋 Amostra dos primeiros 5 motoristas importados:');
    const [sample] = await connection.execute(
      'SELECT id, nome, cpf, matricula, operacao, cargo, placa FROM conductors LIMIT 5'
    );
    sample.forEach((row, idx) => {
      console.log(
        `${idx + 1}. ${row.nome} | CPF: ${row.cpf} | Matrícula: ${row.matricula} | Operação: ${row.operacao} | Cargo: ${row.cargo} | Placa: ${row.placa}`
      );
    });
  } catch (error) {
    console.error('❌ Erro durante importação:', error);
    process.exit(1);
  } finally {
    await connection.end();
  }
}

importConductors();
