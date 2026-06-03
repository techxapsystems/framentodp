/**
 * BULK IMPORT RULES ENGINE
 * Implementa as regras de importação em massa de advertências conforme especificado
 * Versão 3 - Framento Transportes
 */

import { parse } from 'date-fns';
import { ptBR } from 'date-fns/locale';

export interface InfractionRecord {
  type: 'jornada' | 'refeicao' | 'intersticio';
  description: string;
  severity: 'firm' | 'review' | 'manual';
}

export interface ImportedWarning {
  condutor: string;
  cpf: string;
  operacao: string;
  placa: string;
  cargo?: string;
  matricula?: string;
  dataJornada: string;
  diaSemana: string;
  inicioJornada: string;
  fimJornada?: string;
  status: 'ADVERTENCIA' | 'EM_REVISAO' | 'CONFERENCIA_MANUAL';
  infractions: InfractionRecord[];
  warningText?: string;
  cellColor?: string;
  errors: string[];
}

/**
 * Normaliza nome de coluna para comparação
 */
function normalizeColumnName(name: string): string {
  return name
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .trim();
}

/**
 * Encontra coluna pelo nome normalizado
 */
function findColumn(
  headers: string[],
  synonyms: string[]
): number | null {
  for (let i = 0; i < headers.length; i++) {
    const normalized = normalizeColumnName(headers[i]);
    if (synonyms.some(syn => normalizeColumnName(syn) === normalized)) {
      return i;
    }
  }
  return null;
}

/**
 * Normaliza CPF: remove pontos, traços e espaços
 */
function normalizeCPF(cpf: string): string {
  const cleaned = cpf.replace(/[\s.\-]/g, '').trim();
  return cleaned;
}

/**
 * Normaliza placa: remove espaços, traços e converte para maiúsculas
 */
function normalizePlate(plate: string): string {
  return plate.replace(/[\s\-]/g, '').toUpperCase();
}

/**
 * Converte tempo HH:MM para minutos
 */
function timeToMinutes(timeStr: string): number | null {
  if (!timeStr) return null;
  
  const trimmed = timeStr.trim();
  if (trimmed === '' || trimmed === '-' || trimmed === ' - ' || trimmed === '—') {
    return null; // Ausente
  }

  const match = trimmed.match(/^(\d{1,2}):(\d{2})$/);
  if (!match) return null;

  const hours = parseInt(match[1], 10);
  const minutes = parseInt(match[2], 10);
  
  if (hours < 0 || hours > 23 || minutes < 0 || minutes > 59) {
    return null;
  }

  return hours * 60 + minutes;
}

/**
 * Extrai data de uma string no formato DD/MM/YYYY
 */
function extractDate(dateStr: string): Date | null {
  if (!dateStr) return null;

  const match = dateStr.match(/(\d{2})\/(\d{2})\/(\d{4})/);
  if (!match) return null;

  const day = parseInt(match[1], 10);
  const month = parseInt(match[2], 10);
  const year = parseInt(match[3], 10);

  const date = new Date(year, month - 1, day);
  if (isNaN(date.getTime())) return null;

  return date;
}

/**
 * Obtém dia da semana em português
 */
function getDayOfWeekPT(date: Date): string {
  const days = ['domingo', 'segunda', 'terça', 'quarta', 'quinta', 'sexta', 'sábado'];
  return days[date.getDay()];
}

/**
 * Obtém limite de jornada por dia da semana
 */
function getJourneyLimit(dayOfWeek: string): number {
  const day = dayOfWeek.toLowerCase();
  if (day === 'sábado') return 240; // 04:00
  if (day === 'domingo') return 0; // Trabalho em dia de descanso
  return 480; // 08:00 (segunda a sexta)
}

/**
 * Detecta infrações baseado nas regras
 */
function detectInfractions(
  journeyWithoutMeal: number | null,
  mealTime: number | null,
  interstice: number | null,
  dayOfWeek: string,
  journeyStart: string
): InfractionRecord[] {
  const infractions: InfractionRecord[] = [];
  const limit = getJourneyLimit(dayOfWeek);

  // (A) EXCESSO DE JORNADA
  if (journeyWithoutMeal !== null) {
    if (dayOfWeek.toLowerCase() === 'domingo') {
      if (journeyWithoutMeal > 0) {
        infractions.push({
          type: 'jornada',
          description: `Trabalho realizado em dia destinado a descanso (${dayOfWeek}), com jornada efetiva de ${formatMinutes(journeyWithoutMeal)}, sem a folga/compensação correspondente.`,
          severity: 'firm',
        });
      }
    } else if (journeyWithoutMeal > limit) {
      const excess = journeyWithoutMeal - limit;
      infractions.push({
        type: 'jornada',
        description: `Excesso de jornada de trabalho: jornada efetiva de ${formatMinutes(journeyWithoutMeal)} (já descontado o intervalo de refeição), excedendo em ${formatMinutes(excess)} o limite de ${formatMinutes(limit)} estabelecido para o dia.`,
        severity: 'firm',
      });
    }
  }

  // (B) INTERVALO DE REFEIÇÃO
  if (mealTime !== null && mealTime < 60) {
    infractions.push({
      type: 'refeicao',
      description: `Intervalo de refeição inferior ao mínimo: registrado ${formatMinutes(mealTime)}, sendo exigido o mínimo de 01h00.`,
      severity: 'firm',
    });
  } else if (mealTime === null) {
    infractions.push({
      type: 'refeicao',
      description: `Ausência de registro do intervalo de refeição, em descumprimento ao intervalo mínimo de 01h00 (sujeito a confirmação do apontamento).`,
      severity: 'review',
    });
  }

  // (C) DESCANSO INTERJORNADA
  if (interstice !== null && interstice < 660) {
    infractions.push({
      type: 'intersticio',
      description: `Descanso interjornada (interstício) inferior ao mínimo: registrado ${formatMinutes(interstice)}, sendo exigido o mínimo de 11h00.`,
      severity: 'firm',
    });
  }

  return infractions;
}

/**
 * Formata minutos para HH:MM
 */
function formatMinutes(minutes: number): string {
  const hours = Math.floor(minutes / 60);
  const mins = minutes % 60;
  return `${String(hours).padStart(2, '0')}h${String(mins).padStart(2, '0')}`;
}

/**
 * Determina status baseado na cor da célula
 */
function determineStatus(
  cellColor: string | undefined,
  infractions: InfractionRecord[]
): 'ADVERTENCIA' | 'EM_REVISAO' | 'CONFERENCIA_MANUAL' {
  if (!cellColor) return 'CONFERENCIA_MANUAL';

  // Normaliza cor para hex
  const color = cellColor.toUpperCase().replace('#', '');

  if (color === 'FFFF00') {
    return 'ADVERTENCIA'; // Amarelo vivo
  } else if (color === 'FFCC00') {
    return 'EM_REVISAO'; // Amarelo-ouro
  }

  return 'CONFERENCIA_MANUAL';
}

/**
 * Gera texto da advertência
 */
function generateWarningText(warning: ImportedWarning): string {
  const infractions = warning.infractions
    .map((inf, idx) => `${idx + 1}. ${inf.description}`)
    .join('\n');

  const template = `ADVERTÊNCIA DISCIPLINAR

A Framento Transportes comunica formalmente ao(à) colaborador(a) abaixo identificado(a) a presente ADVERTÊNCIA, em razão do descumprimento das normas de jornada de trabalho aplicáveis à atividade de motorista profissional (Lei nº 13.103/2015 e CLT).

Colaborador(a): ${warning.condutor}
CPF: ${warning.cpf}
${warning.cargo ? `Cargo: ${warning.cargo}\n` : ''}${warning.matricula ? `Matrícula: ${warning.matricula}\n` : ''}Operação: ${warning.operacao}
Veículo (placa): ${warning.placa}
Data da jornada: ${warning.dataJornada} (${warning.diaSemana})
Início: ${warning.inicioJornada}${warning.fimJornada ? `   |   Término: ${warning.fimJornada}` : ''}

Foram identificadas as seguintes irregularidades:
${infractions}

O cumprimento dos limites de jornada, do intervalo mínimo de refeição e do descanso interjornada é obrigatório e visa à segurança do colaborador e de terceiros. O(a) colaborador(a) fica ciente de que a reincidência poderá ensejar a aplicação de medidas disciplinares mais severas.

Chapecó/SC, ${new Date().toLocaleDateString('pt-BR')}.


_______________________________        _______________________________
Framento Transportes                   Ciência do(a) colaborador(a)`;

  return template;
}

/**
 * Processa uma linha de dados conforme as regras
 */
export function processWarningRow(
  row: any,
  headers: string[],
  rowIndex: number
): ImportedWarning | null {
  const errors: string[] = [];

  // Encontra colunas obrigatórias
  const conductorCol = findColumn(headers, ['condutor']);
  const cpfCol = findColumn(headers, ['cpf']);
  const operacaoCol = findColumn(headers, ['operacao', 'operação']);
  const placaCol = findColumn(headers, ['placa']);
  const journeyNoMealCol = findColumn(headers, [
    'tempo jornada s/ refeicao',
    'tempo jornada sem refeicao',
    'tempo jornada s/ refeição',
  ]);
  const inicioCol = findColumn(headers, ['inicio jornada', 'início jornada']);

  // Valida colunas obrigatórias
  if (conductorCol === null) errors.push('Coluna "Condutor" não encontrada');
  if (cpfCol === null) errors.push('Coluna "CPF" não encontrada');
  if (operacaoCol === null) errors.push('Coluna "Operação" não encontrada');
  if (placaCol === null) errors.push('Coluna "Placa" não encontrada');
  if (journeyNoMealCol === null) errors.push('Coluna "Tempo Jornada s/ Refeição" não encontrada');
  if (inicioCol === null) errors.push('Coluna "Início Jornada" não encontrada');

  if (errors.length > 0) {
    return null;
  }

  // Extrai dados obrigatórios
  const condutor = String(row[headers[conductorCol!]] || '').trim();
  let cpf = String(row[headers[cpfCol!]] || '').trim();
  const operacao = String(row[headers[operacaoCol!]] || '').trim();
  let placa = String(row[headers[placaCol!]] || '').trim();
  const journeyNoMealStr = String(row[headers[journeyNoMealCol!]] || '').trim();
  const inicioStr = String(row[headers[inicioCol!]] || '').trim();

  // Normaliza dados
  cpf = normalizeCPF(cpf);
  placa = normalizePlate(placa);

  // Valida CPF
  if (cpf.length !== 11 || !/^\d{11}$/.test(cpf)) {
    errors.push(`CPF inválido: ${cpf}`);
  }

  // Extrai dados opcionais
  const cargoCol = findColumn(headers, ['cargo']);
  const matriculaCol = findColumn(headers, ['matricula', 'matrícula']);
  const refeicaoCol = findColumn(headers, ['total refeicao', 'total refeição', 'tempo refeicao']);
  const fimCol = findColumn(headers, ['fim jornada']);
  const intersticeCol = findColumn(headers, ['intersticio', 'interstício', 'pernoite']);
  const dataCol = findColumn(headers, ['data']);

  const cargo = cargoCol !== null ? String(row[headers[cargoCol]] || '').trim() : undefined;
  const matricula = matriculaCol !== null ? String(row[headers[matriculaCol]] || '').trim() : undefined;
  const refeicaoStr = refeicaoCol !== null ? String(row[headers[refeicaoCol]] || '').trim() : '';
  const fimStr = fimCol !== null ? String(row[headers[fimCol]] || '').trim() : '';
  const intersticeStr = intersticeCol !== null ? String(row[headers[intersticeCol]] || '').trim() : '';
  const dataStr = dataCol !== null ? String(row[headers[dataCol]] || '').trim() : '';

  // Converte tempos para minutos
  const journeyNoMeal = timeToMinutes(journeyNoMealStr);
  const refeicao = timeToMinutes(refeicaoStr);
  const interstice = timeToMinutes(intersticeStr);

  // Extrai data
  let date: Date | null = null;
  if (dataStr) {
    date = extractDate(dataStr);
  } else {
    date = extractDate(inicioStr.substring(0, 10));
  }

  if (!date) {
    errors.push('Data ilegível ou ausente');
  }

  const dayOfWeek = date ? getDayOfWeekPT(date) : 'desconhecido';
  const dataJornada = date ? date.toLocaleDateString('pt-BR') : 'N/A';

  // Detecta infrações
  const infractions = detectInfractions(journeyNoMeal, refeicao, interstice, dayOfWeek, inicioStr);

  // Determina status
  const cellColor = row.__color; // Cor da célula (se disponível)
  let status: 'ADVERTENCIA' | 'EM_REVISAO' | 'CONFERENCIA_MANUAL' = 'CONFERENCIA_MANUAL';

  if (infractions.length === 0) {
    status = 'CONFERENCIA_MANUAL';
  } else {
    status = determineStatus(cellColor, infractions);
  }

  // Gera texto da advertência
  let warningText: string | undefined;
  if (status === 'ADVERTENCIA') {
    const warning: ImportedWarning = {
      condutor,
      cpf,
      operacao,
      placa,
      cargo,
      matricula,
      dataJornada,
      diaSemana: dayOfWeek,
      inicioJornada: inicioStr,
      fimJornada: fimStr || undefined,
      status,
      infractions,
      cellColor,
      errors,
    };
    warningText = generateWarningText(warning);
  }

  return {
    condutor,
    cpf,
    operacao,
    placa,
    cargo,
    matricula,
    dataJornada,
    diaSemana: dayOfWeek,
    inicioJornada: inicioStr,
    fimJornada: fimStr || undefined,
    status,
    infractions,
    warningText,
    cellColor,
    errors,
  };
}
