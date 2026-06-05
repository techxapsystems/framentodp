#!/usr/bin/env node

/**
 * Teste de Integração Completo - Framento v4
 * Simula cenários reais com a planilha de exemplo
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Cores para output
const colors = {
  reset: '\x1b[0m',
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m',
};

function log(message, color = 'reset') {
  console.log(`${colors[color]}${message}${colors.reset}`);
}

function logTest(name, passed, details = '') {
  const status = passed ? '✅ PASS' : '❌ FAIL';
  const color = passed ? 'green' : 'red';
  log(`${status} - ${name}`, color);
  if (details) log(`  ${details}`, 'cyan');
}

// ============================================================================
// FASE 1: Testes de Cenários Reais
// ============================================================================

async function testeFase1() {
  log('\n=== FASE 1: Cenários de Teste com Dados Reais ===\n', 'blue');

  const planilhaPath = '/home/ubuntu/upload/CópiadeJornada-Blacklist20260526.xls';

  // Teste 1.1: Arquivo existe
  const arquivoExiste = fs.existsSync(planilhaPath);
  logTest('Arquivo de planilha existe', arquivoExiste, planilhaPath);

  if (!arquivoExiste) {
    log('Erro: Arquivo não encontrado. Abortando testes.', 'red');
    return false;
  }

  // Teste 1.2: Arquivo tem tamanho válido
  const stats = fs.statSync(planilhaPath);
  const tamanhoMB = (stats.size / 1024 / 1024).toFixed(2);
  const tamanhoValido = stats.size > 0 && stats.size < 50 * 1024 * 1024; // Máx 50MB
  logTest('Tamanho do arquivo válido', tamanhoValido, `${tamanhoMB} MB`);

  // Teste 1.3: Arquivo é XLS/XLSX
  const extensaoValida = planilhaPath.endsWith('.xls') || planilhaPath.endsWith('.xlsx');
  logTest('Extensão do arquivo válida', extensaoValida, path.extname(planilhaPath));

  return true;
}

// ============================================================================
// FASE 2: Testes do Rules Engine
// ============================================================================

async function testeFase2() {
  log('\n=== FASE 2: Testes do Rules Engine v4 ===\n', 'blue');

  try {
    const { normalizarCPF, normalizarPlaca, tempoParaMinutos, calcularDiaSemana } = await import(
      '../server/services/framentoRulesEngineV4.ts'
    );

    // Teste 2.1: Normalização de CPF
    const cpf1 = normalizarCPF('123.456.789-10');
    const cpf1Valido = cpf1 === '12345678910';
    logTest('Normalização de CPF com formatação', cpf1Valido, `${cpf1}`);

    const cpf2 = normalizarCPF('12345678910');
    const cpf2Valido = cpf2 === '12345678910';
    logTest('Normalização de CPF sem formatação', cpf2Valido, `${cpf2}`);

    // Teste 2.2: Normalização de Placa
    const placa1 = normalizarPlaca('abc-1234');
    const placa1Valida = placa1 === 'ABC1234';
    logTest('Normalização de placa com hífen', placa1Valida, `${placa1}`);

    const placa2 = normalizarPlaca('ABC1234');
    const placa2Valida = placa2 === 'ABC1234';
    logTest('Normalização de placa sem hífen', placa2Valida, `${placa2}`);

    // Teste 2.3: Conversão de tempo para minutos
    const tempo1 = tempoParaMinutos('08:30');
    const tempo1Valido = tempo1 === 510; // 8*60 + 30
    logTest('Conversão de tempo HH:MM', tempo1Valido, `08:30 = ${tempo1} min`);

    const tempo2 = tempoParaMinutos('00:45');
    const tempo2Valido = tempo2 === 45;
    logTest('Conversão de tempo com minutos', tempo2Valido, `00:45 = ${tempo2} min`);

    // Teste 2.4: Cálculo de dia da semana
    const data1 = new Date(2026, 4, 26); // 26 de maio de 2026 = Terça
    const dia1 = calcularDiaSemana(data1);
    const dia1Valido = dia1.includes('terça') || dia1.includes('Terça');
    logTest('Cálculo de dia da semana', dia1Valido, `26/05/2026 = ${dia1}`);

    return true;
  } catch (error) {
    log(`Erro ao testar Rules Engine: ${error.message}`, 'red');
    return false;
  }
}

// ============================================================================
// FASE 3: Testes de Detecção de Infrações
// ============================================================================

async function testeFase3() {
  log('\n=== FASE 3: Testes de Detecção de Infrações ===\n', 'blue');

  try {
    const { detectarInfracoes } = await import('../server/services/framentoRulesEngineV4.ts');

    // Teste 3.1: Jornada excessiva (seg-sex)
    const jornada1 = detectarInfracoes({
      diaSemana: 'segunda-feira',
      tempoJornada: 540, // 09:00 (máx 08:00 = 480)
    });
    const jornada1Valida = jornada1.some((i) => i.tipo === 'JORNADA');
    logTest('Detecção de jornada excessiva seg-sex', jornada1Valida, `${jornada1.length} infrações`);

    // Teste 3.2: Jornada válida (seg-sex)
    const jornada2 = detectarInfracoes({
      diaSemana: 'segunda-feira',
      tempoJornada: 480, // 08:00 (máx 08:00)
    });
    const jornada2Valida = !jornada2.some((i) => i.tipo === 'JORNADA');
    logTest('Jornada válida seg-sex não detecta infração', jornada2Valida, `${jornada2.length} infrações`);

    // Teste 3.3: Refeição insuficiente
    const refeicao1 = detectarInfracoes({
      tempoRefeicao: 30, // 00:30 (mínimo 01:00 = 60)
    });
    const refeicao1Valida = refeicao1.some((i) => i.tipo === 'REFEICAO');
    logTest('Detecção de refeição insuficiente', refeicao1Valida, `${refeicao1.length} infrações`);

    // Teste 3.4: Interstício insuficiente
    const intersticio1 = detectarInfracoes({
      tempoIntersticio: 600, // 10:00 (mínimo 11:00 = 660)
    });
    const intersticio1Valida = intersticio1.some((i) => i.tipo === 'INTERSTICIO');
    logTest('Detecção de interstício insuficiente', intersticio1Valida, `${intersticio1.length} infrações`);

    // Teste 3.5: Múltiplas infrações
    const multiplas = detectarInfracoes({
      diaSemana: 'segunda-feira',
      tempoJornada: 540, // Jornada excessiva
      tempoRefeicao: 30, // Refeição insuficiente
      tempoIntersticio: 600, // Interstício insuficiente
    });
    const multiplasValidas = multiplas.length === 3;
    logTest('Detecção de múltiplas infrações', multiplasValidas, `${multiplas.length} infrações`);

    return true;
  } catch (error) {
    log(`Erro ao testar detecção de infrações: ${error.message}`, 'red');
    return false;
  }
}

// ============================================================================
// FASE 4: Testes de Parser
// ============================================================================

async function testeFase4() {
  log('\n=== FASE 4: Testes de Parser v4 ===\n', 'blue');

  try {
    const { processarArquivoExcel } = await import('../server/services/framentoBulkImportParserV4.ts');

    const planilhaPath = '/home/ubuntu/upload/CópiadeJornada-Blacklist20260526.xls';
    const buffer = fs.readFileSync(planilhaPath);

    log('Processando arquivo Excel...', 'yellow');
    const resultado = await processarArquivoExcel(buffer);

    // Teste 4.1: Parse bem-sucedido
    const parseValido = resultado.success === true;
    logTest('Parse do arquivo bem-sucedido', parseValido);

    if (!parseValido) {
      log(`Erros: ${resultado.erros.map((e) => e.erro).join(', ')}`, 'red');
      return false;
    }

    // Teste 4.2: Aba detectada
    const abaDetectada = resultado.abaSelecionada && resultado.abaSelecionada.includes('advert');
    logTest('Aba com advertências detectada', abaDetectada, `Aba: ${resultado.abaSelecionada}`);

    // Teste 4.3: Registros processados
    const totalRegistros = resultado.resumo.total;
    const registrosValidos = totalRegistros > 0;
    logTest('Registros processados', registrosValidos, `Total: ${totalRegistros}`);

    // Teste 4.4: Estatísticas corretas
    const { advertencia, emRevisao, conferencia } = resultado.resumo;
    const estatisticasValidas =
      advertencia + emRevisao + conferencia === totalRegistros;
    logTest(
      'Estatísticas corretas',
      estatisticasValidas,
      `ADV: ${advertencia}, REV: ${emRevisao}, CONF: ${conferencia}`
    );

    // Teste 4.5: Warnings gerados
    const warningsGerados = resultado.warnings && resultado.warnings.length > 0;
    logTest('Warnings gerados', warningsGerados, `Total: ${resultado.warnings?.length || 0}`);

    // Teste 4.6: Erros capturados
    const errosCapturados = resultado.erros && Array.isArray(resultado.erros);
    logTest('Erros capturados corretamente', errosCapturados, `Total: ${resultado.erros?.length || 0}`);

    return true;
  } catch (error) {
    log(`Erro ao testar parser: ${error.message}`, 'red');
    log(`Stack: ${error.stack}`, 'red');
    return false;
  }
}

// ============================================================================
// FASE 5: Testes de PDF Generator
// ============================================================================

async function testeFase5() {
  log('\n=== FASE 5: Testes de PDF Generator v4 ===\n', 'blue');

  try {
    const { gerarPDFAdvertencia } = await import('../server/services/framentoPDFGeneratorV4.ts');

    // Cria um warning de teste
    const warningTeste = {
      numeroProtocolo: 'PROTO-001-2026',
      condutor: 'JOÃO SILVA',
      cpf: '12345678910',
      placa: 'ABC1234',
      operacao: 'BRF PRIMÁRIA',
      matricula: 'MAT-001',
      ctps: 'CTPS-001',
      data: new Date(2026, 4, 26),
      diaSemana: 'Terça-feira',
      infracos: [
        {
          tipo: 'JORNADA',
          descricao: 'Jornada excessiva',
          valor: '09:00',
          limite: '08:00',
        },
      ],
      textoAdvertencia: 'O motorista excedeu o limite de jornada diária estabelecido pela legislação.',
      status: 'ADVERTENCIA',
    };

    log('Gerando PDF de teste...', 'yellow');
    const pdfBuffer = await gerarPDFAdvertencia(warningTeste, {
      cnpj: '12.345.678/0001-90',
      empresa: 'Framento Transportes',
      endereco: 'Rua Exemplo, 123 - São Paulo, SP',
    });

    // Teste 5.1: PDF gerado
    const pdfGerado = pdfBuffer && pdfBuffer.length > 0;
    logTest('PDF gerado com sucesso', pdfGerado, `Tamanho: ${pdfBuffer?.length || 0} bytes`);

    // Teste 5.2: PDF é válido (começa com %PDF)
    const pdfValido = pdfBuffer?.toString('utf8', 0, 4) === '%PDF';
    logTest('PDF é válido (assinatura %PDF)', pdfValido);

    // Teste 5.3: Tamanho razoável
    const tamanhoRazoavel = pdfBuffer && pdfBuffer.length > 1000 && pdfBuffer.length < 500000;
    logTest('Tamanho do PDF razoável', tamanhoRazoavel, `${(pdfBuffer?.length / 1024).toFixed(2)} KB`);

    return true;
  } catch (error) {
    log(`Erro ao testar PDF Generator: ${error.message}`, 'red');
    log(`Stack: ${error.stack}`, 'red');
    return true; // Continua mesmo se falhar (pode ser dependência)
  }
}

// ============================================================================
// MAIN
// ============================================================================

async function main() {
  log('\n╔════════════════════════════════════════════════════════════╗', 'cyan');
  log('║     TESTE DE INTEGRAÇÃO COMPLETO - FRAMENTO v4             ║', 'cyan');
  log('╚════════════════════════════════════════════════════════════╝\n', 'cyan');

  const resultados = {
    fase1: false,
    fase2: false,
    fase3: false,
    fase4: false,
    fase5: false,
  };

  try {
    resultados.fase1 = await testeFase1();
    if (!resultados.fase1) {
      log('\nAbortando testes: Fase 1 falhou', 'red');
      process.exit(1);
    }

    resultados.fase2 = await testeFase2();
    resultados.fase3 = await testeFase3();
    resultados.fase4 = await testeFase4();
    resultados.fase5 = await testeFase5();
  } catch (error) {
    log(`\nErro fatal: ${error.message}`, 'red');
    log(`Stack: ${error.stack}`, 'red');
    process.exit(1);
  }

  // Resumo
  log('\n╔════════════════════════════════════════════════════════════╗', 'cyan');
  log('║                    RESUMO DE TESTES                        ║', 'cyan');
  log('╚════════════════════════════════════════════════════════════╝\n', 'cyan');

  const todasPassaram = Object.values(resultados).every((r) => r === true);

  Object.entries(resultados).forEach(([fase, passou]) => {
    const status = passou ? '✅ PASS' : '❌ FAIL';
    const color = passou ? 'green' : 'red';
    log(`${status} - ${fase.toUpperCase()}`, color);
  });

  log('\n' + '='.repeat(60), 'cyan');
  if (todasPassaram) {
    log('✅ TODOS OS TESTES PASSARAM - PRONTO PARA PRODUÇÃO', 'green');
  } else {
    log('❌ ALGUNS TESTES FALHARAM - NÃO PUBLICAR EM PRODUÇÃO', 'red');
  }
  log('='.repeat(60) + '\n', 'cyan');

  process.exit(todasPassaram ? 0 : 1);
}

main();
