import fs from 'fs';
import path from 'path';

const filePath = '/home/ubuntu/upload/CópiadeJornada-Blacklist20260526-FIXED.xlsx';
const buffer = fs.readFileSync(filePath);

console.log('=== TESTING DRY RUN WITH FIXED FILE ===');
console.log(`File: ${path.basename(filePath)}`);
console.log(`Size: ${buffer.length} bytes`);
console.log('');

const { processarArquivoExcel } = await import('./server/services/framentoBulkImportParserV4.ts');
const { gerarZIPComPDFs } = await import('./server/services/framentoPDFGeneratorV4.ts');

try {
  console.log('1. Processing Excel file...');
  const resultado = await processarArquivoExcel(buffer);
  
  console.log(`   ✓ Success: ${resultado.success}`);
  console.log(`   - Total: ${resultado.resumo.total}`);
  console.log(`   - Advertências: ${resultado.resumo.advertencias}`);
  console.log(`   - Em Revisão: ${resultado.resumo.emRevisao}`);
  console.log(`   - Conferência: ${resultado.resumo.conferencia}`);
  console.log(`   - Warnings: ${resultado.warnings.length}`);
  
  if (resultado.warnings.length > 0) {
    console.log('\n   Primeiros 3 warnings:');
    resultado.warnings.slice(0, 3).forEach((w, i) => {
      console.log(`     ${i+1}. ${w.condutor} (${w.cpf}) - Status: ${w.status}`);
    });
  }
  
  console.log('');
  console.log('2. Generating PDFs...');
  const pdfs = await gerarZIPComPDFs(resultado.warnings, {
    cnpj: '00.000.000/0000-00',
    empresa: 'Framento Transportes',
    endereco: 'São Paulo, SP',
  });
  
  console.log(`   ✓ Generated: ${pdfs.size} PDFs`);
  if (pdfs.size > 0) {
    console.log('   PDFs:');
    Array.from(pdfs.keys()).slice(0, 5).forEach((name, i) => {
      console.log(`     ${i+1}. ${name}`);
    });
    
    if (pdfs.size > 5) {
      console.log(`     ... and ${pdfs.size - 5} more`);
    }
  }
  
  console.log('');
  console.log('✅ DRY RUN COMPLETED SUCCESSFULLY');
  console.log(`\n📊 RESUMO:`);
  console.log(`   Total processado: ${resultado.resumo.total}`);
  console.log(`   PDFs gerados: ${pdfs.size}`);
  console.log(`   Taxa de sucesso: ${((pdfs.size / resultado.resumo.total) * 100).toFixed(1)}%`);
  
} catch (error) {
  console.error('❌ ERROR:', error.message);
  console.error(error.stack);
  process.exit(1);
}
