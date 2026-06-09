import * as XLSX from 'xlsx';
import fs from 'fs';

const filePath = '/home/ubuntu/upload/CópiadeJornada-Blacklist20260526-FIXED.xlsx';
const fileBuffer = fs.readFileSync(filePath);
const workbook = XLSX.read(fileBuffer, { cellDates: true });

const sheetName = workbook.SheetNames[0];
const sheet = workbook.Sheets[sheetName];
const dados = XLSX.utils.sheet_to_json(sheet, { defval: '' });

console.log('=== HEADERS ===');
const headers = Object.keys(dados[0]);
headers.forEach((h, i) => {
  console.log(`${i}: ${h}`);
});

// Procura por colunas de data/inicio
const inicioCol = headers.find(h => h.toLowerCase().includes('inicio'));
console.log(`\n=== COLUNA INICIO ENCONTRADA ===`);
console.log(`Nome: ${inicioCol}`);
console.log(`Valor primeira linha: ${dados[0][inicioCol]}`);
console.log(`Tipo: ${typeof dados[0][inicioCol]}`);
