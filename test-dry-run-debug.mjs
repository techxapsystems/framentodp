import fs from 'fs';
import path from 'path';
import * as XLSX from 'xlsx';

const filePath = '/home/ubuntu/upload/CópiadeJornada-Blacklist20260526-UPDATED.xlsx';
const buffer = fs.readFileSync(filePath);
const workbook = XLSX.read(buffer);

console.log('=== DETAILED DEBUG ===');
console.log(`Sheets: ${workbook.SheetNames.join(', ')}`);

// Find ADVERTENCIAS sheet
const sheetName = workbook.SheetNames.find(s => s.toLowerCase().includes('advertencia'));
console.log(`\nSelected sheet: ${sheetName}`);

const worksheet = workbook.Sheets[sheetName];
const dados = XLSX.utils.sheet_to_json(worksheet, { header: 1 });

console.log(`\nRows: ${dados.length}`);
console.log(`Headers (${dados[0].length}):`);
dados[0].forEach((h, i) => {
  console.log(`  ${i}: "${h}"`);
});

// Find codigoSistema column
const codigoSistemaIndex = dados[0].findIndex(h => 
  h && h.toLowerCase().includes('codigo')
);

console.log(`\nCódigo Sistema column index: ${codigoSistemaIndex}`);

if (codigoSistemaIndex >= 0) {
  console.log(`\nFirst 5 values in Código Sistema column:`);
  for (let i = 1; i <= 5 && i < dados.length; i++) {
    const val = dados[i][codigoSistemaIndex];
    console.log(`  Row ${i}: ${val} (type: ${typeof val})`);
  }
}

