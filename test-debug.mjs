import { processarArquivoExcel } from './server/services/framentoBulkImportParserV4.ts';
import fs from 'fs';

const filePath = '/home/ubuntu/upload/CópiadeJornada-Blacklist20260526-FIXED.xlsx';
const fileBuffer = fs.readFileSync(filePath);

try {
  const result = await processarArquivoExcel(fileBuffer);
  
  console.log('=== DEBUG ===');
  console.log(`Success: ${result.success}`);
  console.log(`Total linhas: ${result.totalLinhas}`);
  console.log(`Warnings: ${result.warnings.length}`);
  console.log(`Erros: ${result.erros.length}`);
  console.log(`Resumo:`, result.resumo);
  
  if (result.erros.length > 0) {
    console.log('\n=== PRIMEIROS 5 ERROS ===');
    result.erros.slice(0, 5).forEach(err => {
      console.log(`Linha ${err.linha} (${err.condutor}): ${err.erro}`);
    });
  }
} catch (error) {
  console.error('Erro:', error.message);
  console.error(error.stack);
}
