import fs from 'fs';
import * as XLSX from 'xlsx';

const filePath = '/home/ubuntu/upload/CópiadeJornada-Blacklist20260526-UPDATED.xlsx';
const buffer = fs.readFileSync(filePath);
const workbook = XLSX.read(buffer);

const sheetName = workbook.SheetNames.find(s => s.toLowerCase().includes('advertencia'));
const worksheet = workbook.Sheets[sheetName];
const dados = XLSX.utils.sheet_to_json(worksheet, { header: 1 });

console.log('=== XLSX HEADER DEBUG ===');
console.log(`Last 3 headers:`);
const headers = dados[0];
for (let i = headers.length - 3; i < headers.length; i++) {
  const h = headers[i];
  console.log(`  [${i}] "${h}"`);
  console.log(`      Type: ${typeof h}`);
  console.log(`      Bytes: ${Array.from(h).map(c => c.charCodeAt(0)).join(', ')}`);
  console.log(`      Includes 'codigo': ${h.toLowerCase().includes('codigo')}`);
  
  const normalized = h
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .trim();
  console.log(`      Normalized: "${normalized}"`);
}

