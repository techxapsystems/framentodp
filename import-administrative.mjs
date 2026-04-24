import openpyxl from 'openpyxl';
import mysql from 'mysql2/promise';
import dotenv from 'dotenv';

dotenv.config();

const DATABASE_URL = process.env.DATABASE_URL;

async function importAdministrativeEmployees() {
  let connection;
  
  try {
    // Conectar ao banco de dados
    const config = new URL(DATABASE_URL);
    connection = await mysql.createConnection({
      host: config.hostname,
      user: config.username,
      password: config.password,
      database: config.pathname.slice(1),
    });

    console.log('✅ Conectado ao banco de dados');

    // Ler arquivo XLSX
    const workbook = openpyxl.load_workbook('/home/ubuntu/upload/LISTAATIVOS-OK.xlsx');
    const worksheet = workbook.active;

    // Encontrar linha de cabeçalho
    let headerRowIndex = -1;
    for (let i = 1; i <= worksheet.max_row; i++) {
      const cell = worksheet.cell(i, 1);
      if (cell.value === 'Cadastro') {
        headerRowIndex = i;
        break;
      }
    }

    if (headerRowIndex === -1) {
      throw new Error('Não foi possível encontrar a linha de cabeçalho');
    }

    console.log(`✅ Linha de cabeçalho encontrada em: ${headerRowIndex}`);

    // Processar dados
    let imported = 0;
    let ignored = 0;

    for (let i = headerRowIndex + 1; i <= worksheet.max_row; i++) {
      const cadastro = worksheet.cell(i, 1).value;
      if (!cadastro) break; // Fim dos dados

      const tipo = worksheet.cell(i, 2).value || '';
      const nome = worksheet.cell(i, 3).value || '';
      const admissao = worksheet.cell(i, 4).value || '';
      const cargo = String(worksheet.cell(i, 5).value || '').toUpperCase();
      const situacao = worksheet.cell(i, 7).value || '';
      const cpf = worksheet.cell(i, 8).value || '';

      // Ignorar motoristas e ajudantes
      if (cargo.includes('MOTORISTA') || cargo.includes('AJUDANTE')) {
        ignored++;
        continue;
      }

      try {
        // Verificar se já existe
        const [existing] = await connection.execute(
          'SELECT id FROM administrative_employees WHERE cpf = ?',
          [cpf]
        );

        if (existing.length > 0) {
          // Atualizar
          await connection.execute(
            'UPDATE administrative_employees SET nome = ?, cargo = ?, admissao = ?, situacao = ?, updatedAt = NOW() WHERE cpf = ?',
            [nome, cargo, admissao, situacao, cpf]
          );
        } else {
          // Inserir
          await connection.execute(
            'INSERT INTO administrative_employees (cadastro, tipo, nome, admissao, cargo, situacao, cpf, createdAt, updatedAt) VALUES (?, ?, ?, ?, ?, ?, ?, NOW(), NOW())',
            [cadastro, tipo, nome, admissao, cargo, situacao, cpf]
          );
        }
        imported++;

        if (imported % 100 === 0) {
          console.log(`📊 ${imported} funcionários importados...`);
        }
      } catch (err) {
        console.error(`❌ Erro ao importar ${nome}: ${err.message}`);
      }
    }

    console.log(`\n✅ IMPORTAÇÃO CONCLUÍDA`);
    console.log(`📊 Total de registros: ${imported + ignored}`);
    console.log(`✅ Administrativos importados: ${imported}`);
    console.log(`⏭️  Motoristas/Ajudantes ignorados: ${ignored}`);

    await connection.end();
  } catch (error) {
    console.error('❌ Erro:', error.message);
    if (connection) await connection.end();
    process.exit(1);
  }
}

importAdministrativeEmployees();
