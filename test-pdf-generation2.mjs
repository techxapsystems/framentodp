import { processarArquivoExcel } from './server/services/framentoBulkImportParserV4.ts';
import { gerarZIPComPDFs } from './server/services/framentoPDFGeneratorV4.ts';
import fs from 'fs';

const filePath = '/home/ubuntu/upload/CópiadeJornada-Blacklist20260526-FIXED.xlsx';
const fileBuffer = fs.readFileSync(filePath);

try {
  console.log('=== PROCESSANDO ARQUIVO ===');
  const result = await processarArquivoExcel(fileBuffer);
  
  console.log(`Warnings gerados: ${result.warnings.length}`);
  
  if (result.warnings.length > 0) {
    console.log('\n=== GERANDO PDFs ===');
    const pdfMap = await gerarZIPComPDFs(result.warnings);
    
    console.log(`PDFs gerados: ${pdfMap.size}`);
    
    // Salvar os PDFs
    let count = 0;
    for (const [filename, pdfBuffer] of pdfMap) {
      const outputPath = `/home/ubuntu/upload/${filename}`;
      fs.writeFileSync(outputPath, pdfBuffer);
      console.log(`✅ ${filename} (${(pdfBuffer.length / 1024).toFixed(2)} KB)`);
      count++;
      if (count >= 3) break; // Apenas primeiros 3
    }
    
    // Mostrar primeiro warning completo
    const warning = result.warnings[0];
    console.log('\n=== PRIMEIRO WARNING (COMPLETO) ===');
    console.log(`Condutor: ${warning.condutor}`);
    console.log(`CPF: ${warning.cpf}`);
    console.log(`Data: ${warning.data}`);
    console.log(`Status: ${warning.status}`);
    console.log(`\nTEXTO (primeiros 800 chars):`);
    console.log(warning.textoAdvertencia.substring(0, 800));
  }
} catch (error) {
  console.error('Erro:', error.message);
}
