import { processarArquivoExcel } from './server/services/framentoBulkImportParserV4.ts';
import fs from 'fs';

const filePath = '/home/ubuntu/upload/CópiadeJornada-Blacklist20260526-FIXED.xlsx';
const fileBuffer = fs.readFileSync(filePath);

try {
  const result = await processarArquivoExcel(fileBuffer);
  
  console.log('=== RESULTADO DA IMPORTAÇÃO ===');
  console.log(`Warnings gerados: ${result.warnings.length}`);
  
  if (result.warnings.length > 0) {
    const warning = result.warnings[0];
    console.log('\n=== PRIMEIRO WARNING ===');
    console.log(`Condutor: ${warning.condutor}`);
    console.log(`Status: ${warning.status}`);
    console.log(`\n=== TEXTO DA ADVERTÊNCIA (primeiros 500 chars) ===`);
    console.log(warning.textoAdvertencia.substring(0, 500));
  }
} catch (error) {
  console.error('Erro:', error.message);
}
