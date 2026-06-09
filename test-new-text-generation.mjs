import { framentoBulkImportParserV4 } from './server/services/framentoBulkImportParserV4.ts';
import fs from 'fs';

const filePath = '/home/ubuntu/upload/CópiadeJornada-Blacklist20260526-FIXED.xlsx';
const fileBuffer = fs.readFileSync(filePath);

try {
  const result = await framentoBulkImportParserV4(fileBuffer);
  
  console.log('=== RESULTADO DA IMPORTAÇÃO ===');
  console.log(`Total de linhas: ${result.totalLinhas}`);
  console.log(`Warnings gerados: ${result.warnings.length}`);
  console.log(`Erros: ${result.erros.length}`);
  
  if (result.warnings.length > 0) {
    const warning = result.warnings[0];
    console.log('\n=== PRIMEIRO WARNING ===');
    console.log(`Condutor: ${warning.condutor}`);
    console.log(`CPF: ${warning.cpf}`);
    console.log(`Status: ${warning.status}`);
    console.log(`\n=== TEXTO DA ADVERTÊNCIA ===`);
    console.log(warning.textoAdvertencia);
  }
  
  if (result.erros.length > 0) {
    console.log('\n=== ERROS ===');
    result.erros.slice(0, 3).forEach(err => {
      console.log(`Linha ${err.linha}: ${err.erro}`);
    });
  }
} catch (error) {
  console.error('Erro:', error);
}
