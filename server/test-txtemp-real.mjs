#!/usr/bin/env node

/**
 * Test TXTEMP with real GABRIEL0703.xlsx file
 * This script validates the complete analysis pipeline
 */

import fs from 'fs';
import path from 'path';
import XLSX from 'xlsx';

// Import our modules (using dynamic import since they're TypeScript)
const { parseMasterFile } = await import('./txtemp-master-parser.ts');
const { analyzeTrips, calculateKPIs, getEfficiencyDistribution, getWorstTrips } = await import('./txtemp-analysis-engine.ts');

const masterFilePath = '/home/ubuntu/upload/GABRIEL0703.xlsx';

console.log('🔍 TXTEMP Real File Test');
console.log('========================\n');

// Check if file exists
if (!fs.existsSync(masterFilePath)) {
  console.error(`❌ File not found: ${masterFilePath}`);
  process.exit(1);
}

console.log(`📂 Loading master file: ${masterFilePath}`);
const masterBuffer = fs.readFileSync(masterFilePath);

// Parse master file
console.log('📊 Parsing master file...');
const trips = parseMasterFile(masterBuffer);
console.log(`✅ Found ${trips.length} trips\n`);

if (trips.length === 0) {
  console.error('❌ No trips found in master file');
  process.exit(1);
}

// Show first 5 trips
console.log('📋 First 5 trips:');
trips.slice(0, 5).forEach((trip, idx) => {
  console.log(`  ${idx + 1}. ${trip.placa} | ${trip.origem} → ${trip.destino}`);
  console.log(`     Faixa: ${trip.faixa} (${trip.rangeMin}°C a ${trip.rangeMax}°C)`);
  console.log(`     Início: ${trip.inicioViagem.toLocaleString('pt-BR')}`);
  console.log(`     Fim: ${trip.fimViagem.toLocaleString('pt-BR')}`);
  console.log();
});

// For now, show that parsing works
console.log('✅ Master file parsing successful!');
console.log(`\n📌 Next step: Load ZIP file with telemetry data`);
console.log(`   The analysis will be complete once ZIP processor is integrated`);
