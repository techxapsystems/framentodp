import * as XLSX from 'xlsx';
import fs from 'fs';

const filePath = '/home/ubuntu/upload/CópiadeJornada-Blacklist20260526-FIXED.xlsx';
const fileBuffer = fs.readFileSync(filePath);
const workbook = XLSX.read(fileBuffer, { cellDates: true });

const sheetName = workbook.SheetNames[0];
const sheet = workbook.Sheets[sheetName];
const dados = XLSX.utils.sheet_to_json(sheet, { defval: '' });

console.log('=== PRIMEIRAS 2 LINHAS ===');
dados.slice(0, 2).forEach((row, i) => {
  console.log(`\nLinha ${i + 1}:`);
  Object.entries(row).slice(0, 10).forEach(([key, value]) => {
    console.log(`  ${key}: ${value} (tipo: ${typeof value})`);
  });
});
