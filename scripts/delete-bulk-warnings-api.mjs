/**
 * DELETE BULK WARNINGS via tRPC API
 * Chama a mutation deleteWarningsByDateRange através da API
 */

import fetch from 'node-fetch';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// Configuração
const API_URL = process.env.API_URL || 'http://localhost:3000/api/trpc';
const ADMIN_TOKEN = process.env.ADMIN_TOKEN || 'test-token';
const DAYS_BACK = 2; // Últimos 2 dias

async function callDeleteMutation() {
  const auditLog = [];
  
  try {
    console.log('🔍 Iniciando limpeza de advertências em massa...\n');
    
    // 1. Chamar mutation deleteWarningsByDateRange
    console.log(`📋 Deletando advertências criadas nos últimos ${DAYS_BACK} dias pelo admin...\n`);
    
    const payload = {
      daysBack: DAYS_BACK,
    };
    
    const response = await fetch(`${API_URL}/dashboard.deleteWarningsByDateRange`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${ADMIN_TOKEN}`,
      },
      body: JSON.stringify({
        json: payload,
      }),
    });
    
    if (!response.ok) {
      throw new Error(`API Error: ${response.status} ${response.statusText}`);
    }
    
    const result = await response.json();
    console.log('✅ Resposta da API:', JSON.stringify(result, null, 2));
    
    auditLog.push({
      timestamp: new Date().toISOString(),
      action: 'DELETE_VIA_API',
      description: 'Deletadas advertências do admin',
      daysBack: DAYS_BACK,
      result: result,
    });
    
    // 2. Salvar log de auditoria
    console.log('\n📝 Salvando log de auditoria...');
    
    const auditDir = path.join(__dirname, '../audit-logs');
    if (!fs.existsSync(auditDir)) {
      fs.mkdirSync(auditDir, { recursive: true });
    }
    
    const auditFile = path.join(auditDir, `delete-${Date.now()}.json`);
    fs.writeFileSync(auditFile, JSON.stringify(auditLog, null, 2));
    console.log(`✅ Log de auditoria salvo: ${auditFile}`);
    
    // 3. RESUMO
    console.log('\n' + '='.repeat(60));
    console.log('📊 RESUMO DA OPERAÇÃO');
    console.log('='.repeat(60));
    console.log(`✅ Operação concluída com sucesso`);
    console.log(`✅ Auditoria registrada: ${auditFile}`);
    console.log('='.repeat(60));
    
  } catch (error) {
    console.error('❌ Erro:', error.message);
    auditLog.push({
      timestamp: new Date().toISOString(),
      action: 'ERROR',
      description: error.message,
    });
    throw error;
  }
}

callDeleteMutation().catch(console.error);
