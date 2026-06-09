import { processarArquivoExcel } from './server/services/framentoBulkImportParserV4.ts';
import { gerarZIPComPDFs } from './server/services/framentoPDFGeneratorV4.ts';
import fs from 'fs';
import path from 'path';

const filePath = '/home/ubuntu/upload/CópiadeJornada-Blacklist20260526-FIXED.xlsx';
const fileBuffer = fs.readFileSync(filePath);

try {
  console.log('=== PROCESSANDO ARQUIVO ===');
  const result = await processarArquivoExcel(fileBuffer);
  
  console.log(`Warnings gerados: ${result.warnings.length}`);
  
  if (result.warnings.length > 0) {
    console.log('\n=== GERANDO PDFs ===');
    const pdfZip = await gerarZIPComPDFs(result.warnings);
    
    const outputPath = '/home/ubuntu/upload/advertencias.zip';
    fs.writeFileSync(outputPath, pdfZip);
    console.log(`✅ ZIP gerado: ${outputPath}`);
    console.log(`Tamanho: ${(pdfZip.length / 1024).toFixed(2)} KB`);
    
    // Mostrar primeiro warning completo
    const warning = result.warnings[0];
    console.log('\n=== PRIMEIRO WARNING (COMPLETO) ===');
    console.log(`Condutor: ${warning.condutor}`);
    console.log(`CPF: ${warning.cpf}`);
    console.log(`Data: ${warning.data}`);
    console.log(`Status: ${warning.status}`);
    console.log(`\nTEXTO (primeiros 1000 chars):`);
    console.log(warning.textoAdvertencia.substring(0, 1000));
  }
} catch (error) {
  console.error('Erro:', error.message);
  console.error(error.stack);
}
