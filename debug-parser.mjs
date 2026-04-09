import * as XLSX from 'xlsx';
import fs from 'fs';

const masterPath = '/home/ubuntu/upload/CópiadeEficiênciaTemperatura-Março26retornoaté08abril18h.xlsx';
const buffer = fs.readFileSync(masterPath);
const workbook = XLSX.read(buffer);

console.log('Sheet names:', workbook.SheetNames);
const sheet = workbook.Sheets[workbook.SheetNames[0]];
const data = XLSX.utils.sheet_to_json(sheet);

console.log('Total rows:', data.length);
console.log('First row:', JSON.stringify(data[0], null, 2));
console.log('Column names:', Object.keys(data[0] || {}));
