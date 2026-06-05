/**
 * Framento Bulk Import Parser v4
 * Processa arquivo Excel e retorna advertências validadas
 */

import * as XLSX from 'xlsx';
import {
  ParsedRow,
  WarningResult,
  normalizeCPF,
  normalizePlaca,
  timeToMinutes,
  parseDataAndDia,
  validarLinha,
  encontrarColuna,
  validarColunasObrigatorias,
} from './framentoRulesEngineV4';

export interface BulkImportResult {
  success: boolean;
  totalLinhas: number;
  abaSelecionada: string;
  warnings: WarningResult[];
  erros: { linha: number; condutor: string; erro: string }[];
  resumo: {
    total: number;
    advertencias: number;
    emRevisao: number;
    conferencia: number;
  };
}

/**
 * Encontra a aba correta para importar
 * Regras:
 * - Use SOMENTE abas cujo nome normalizado contenha "advert"
 * - Entre as abas "advert", selecione a de MAIOR número de semana
 * - Sem número ou empate, a de maior índice (mais à direita)
 */
export function encontrarAbaCorreta(nomesDasAbas: string[]): { indice: number; nome: string } | null {
  // Filtrar abas com "advert"
  const abasAdvert = nomesDasAbas
    .map((nome, indice) => ({
      nome,
      indice,
      normalizado: nome.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, ''),
    }))
    .filter(aba => aba.normalizado.includes('advert'));

  if (abasAdvert.length === 0) {
    return null;
  }

  // Se houver apenas uma, retorna
  if (abasAdvert.length === 1) {
    return { indice: abasAdvert[0].indice, nome: abasAdvert[0].nome };
  }

  // Procura por número de semana
  let abaComMaiorSemana = abasAdvert[0];
  let maiorSemana = 0;

  for (const aba of abasAdvert) {
    const match = aba.normalizado.match(/semana\s*(\d+)/);
    if (match) {
      const semana = parseInt(match[1], 10);
      if (semana > maiorSemana) {
        maiorSemana = semana;
        abaComMaiorSemana = aba;
      }
    }
  }

  // Se encontrou semana, retorna
  if (maiorSemana > 0) {
    return { indice: abaComMaiorSemana.indice, nome: abaComMaiorSemana.nome };
  }

  // Senão, retorna a última aba (maior índice)
  const ultimaAba = abasAdvert[abasAdvert.length - 1];
  return { indice: ultimaAba.indice, nome: ultimaAba.nome };
}

/**
 * Extrai cor de fundo da célula (para status)
 */
function extrairCorCelula(celula: any): string | undefined {
  if (!celula || !celula.s || !celula.s.fill) {
    return undefined;
  }

  const fill = celula.s.fill;
  if (fill.fgColor && fill.fgColor.rgb) {
    return `#${fill.fgColor.rgb.slice(-6)}`; // Pega últimos 6 caracteres (RGB)
  }

  return undefined;
}

/**
 * Processa arquivo Excel e retorna advertências
 */
export async function processarArquivoExcel(
  buffer: Buffer,
  numeroProtocoloInicial: number = 1
): Promise<BulkImportResult> {
  const resultado: BulkImportResult = {
    success: false,
    totalLinhas: 0,
    abaSelecionada: '',
    warnings: [],
    erros: [],
    resumo: {
      total: 0,
      advertencias: 0,
      emRevisao: 0,
      conferencia: 0,
    },
  };

  try {
    // Ler arquivo Excel
    const workbook = XLSX.read(buffer, {
      cellFormula: false,
      cellStyles: true,
      raw: false,
    });

    // Encontrar aba correta
    const abaInfo = encontrarAbaCorreta(workbook.SheetNames);
    if (!abaInfo) {
      resultado.success = false;
      resultado.erros.push({
        linha: 0,
        condutor: '',
        erro: 'Nenhuma aba com nome contendo "advert" encontrada',
      });
      return resultado;
    }

    resultado.abaSelecionada = abaInfo.nome;

    // Ler dados da aba
    const worksheet = workbook.Sheets[abaInfo.nome];
    const dados = XLSX.utils.sheet_to_json(worksheet, { header: 1 }) as any[][];

    if (dados.length < 2) {
      resultado.success = false;
      resultado.erros.push({
        linha: 0,
        condutor: '',
        erro: 'Aba vazia ou sem dados',
      });
      return resultado;
    }

    // Extrair headers
    const headers = dados[0] as string[];
    resultado.totalLinhas = dados.length - 1;

    // Validar colunas obrigatórias
    const validacao = validarColunasObrigatorias(headers);
    if (!validacao.valid) {
      resultado.success = false;
      resultado.erros.push({
        linha: 0,
        condutor: '',
        erro: `Colunas obrigatórias faltando: ${validacao.missing.join(', ')}`,
      });
      return resultado;
    }

    // Encontrar índices das colunas
    const colIndices = {
      condutor: encontrarColuna(headers, 'condutor'),
      cpf: encontrarColuna(headers, 'cpf'),
      placa: encontrarColuna(headers, 'placa'),
      jornada_sem_refeicao: encontrarColuna(headers, 'jornada_sem_refeicao'),
      inicio: encontrarColuna(headers, 'inicio'),
      operacao: encontrarColuna(headers, 'operacao'),
      cargo: encontrarColuna(headers, 'cargo'),
      intersticio: encontrarColuna(headers, 'intersticio'),
      refeicao: encontrarColuna(headers, 'refeicao'),
      fim: encontrarColuna(headers, 'fim'),
      matricula: encontrarColuna(headers, 'matricula'),
      data: encontrarColuna(headers, 'data'),
    };

    // Processar linhas
    let numeroProtocolo = numeroProtocoloInicial;
    const motoristasProcessados = new Map<string, WarningResult>();

    for (let i = 1; i < dados.length; i++) {
      const linha = dados[i];

      try {
        // Extrair dados da linha
        const condutor = String(linha[colIndices.condutor] || '').trim();
        const cpf = String(linha[colIndices.cpf] || '').trim();
        const placa = String(linha[colIndices.placa] || '').trim();

        if (!condutor || !cpf || !placa) {
          resultado.erros.push({
            linha: i + 1,
            condutor,
            erro: 'Campos obrigatórios vazios (Condutor, CPF, Placa)',
          });
          continue;
        }

        // Extrair tempos
        const jornadaSemRefeicao = timeToMinutes(linha[colIndices.jornada_sem_refeicao]);
        const refeicao = colIndices.refeicao >= 0 ? timeToMinutes(linha[colIndices.refeicao]) : undefined;
        const intersticio = colIndices.intersticio >= 0 ? timeToMinutes(linha[colIndices.intersticio]) : undefined;

        // Extrair datas
        let dataInicio: Date | undefined;
        if (colIndices.inicio >= 0) {
          const inicioVal = linha[colIndices.inicio];
          if (inicioVal instanceof Date) {
            dataInicio = inicioVal;
          } else if (typeof inicioVal === 'string') {
            const match = inicioVal.match(/(\d{2})\/(\d{2})\/(\d{4})/);
            if (match) {
              const [, day, month, year] = match;
              dataInicio = new Date(`${year}-${month}-${day}`);
            }
          }
        }

        let dataRegistro: Date | undefined;
        if (colIndices.data >= 0) {
          const dataVal = linha[colIndices.data];
          if (dataVal instanceof Date) {
            dataRegistro = dataVal;
          }
        }

        // Extrair cor da célula (para status)
        const celulaCor = worksheet[`A${i + 1}`];
        const cor = extrairCorCelula(celulaCor);

        // Montar ParsedRow
        const parsedRow: ParsedRow = {
          condutor,
          cpf,
          placa: normalizePlaca(placa),
          jornada_sem_refeicao: jornadaSemRefeicao || 0,
          inicio: dataInicio || new Date(),
          operacao: colIndices.operacao >= 0 ? String(linha[colIndices.operacao] || '').trim() : undefined,
          cargo: colIndices.cargo >= 0 ? String(linha[colIndices.cargo] || '').trim() : undefined,
          intersticio: intersticio || 0,
          refeicao: refeicao || 0,
          fim: colIndices.fim >= 0 && linha[colIndices.fim] instanceof Date ? linha[colIndices.fim] : undefined,
          matricula: colIndices.matricula >= 0 ? String(linha[colIndices.matricula] || '').trim() : undefined,
          data: dataRegistro || dataInicio,
          cellColor: cor,
        };

        // Validar e gerar advertência
        const warning = validarLinha(parsedRow, numeroProtocolo);
        if (warning) {
          // Se mesmo CPF aparecer múltiplas vezes, agrupar
          const chave = warning.cpf;
          if (motoristasProcessados.has(chave)) {
            // Já existe, não adicionar duplicado
            continue;
          }

          motoristasProcessados.set(chave, warning);
          resultado.warnings.push(warning);

          // Contar por status
          if (warning.status === 'ADVERTENCIA') {
            resultado.resumo.advertencias++;
            numeroProtocolo++;
          } else if (warning.status === 'EM_REVISAO') {
            resultado.resumo.emRevisao++;
          } else {
            resultado.resumo.conferencia++;
          }

          resultado.resumo.total++;
        }
      } catch (erro) {
        resultado.erros.push({
          linha: i + 1,
          condutor: String(linha[colIndices.condutor] || ''),
          erro: `Erro ao processar linha: ${erro instanceof Error ? erro.message : String(erro)}`,
        });
      }
    }

    resultado.success = true;
  } catch (erro) {
    resultado.success = false;
    resultado.erros.push({
      linha: 0,
      condutor: '',
      erro: `Erro ao processar arquivo: ${erro instanceof Error ? erro.message : String(erro)}`,
    });
  }

  return resultado;
}

/**
 * Valida resultado do processamento
 */
export function validarResultado(resultado: BulkImportResult): { valido: boolean; mensagens: string[] } {
  const mensagens: string[] = [];

  if (!resultado.success) {
    mensagens.push('Processamento falhou');
  }

  if (resultado.warnings.length === 0 && resultado.erros.length === 0) {
    mensagens.push('Nenhuma advertência encontrada');
  }

  if (resultado.erros.length > 0) {
    mensagens.push(`${resultado.erros.length} erros encontrados`);
  }

  return {
    valido: resultado.success && resultado.warnings.length > 0,
    mensagens,
  };
}
