/**
 * Framento Rules Engine v4
 * Implementação completa das regras de detecção de infrações
 * Segue exatamente o prompt v4 oficial
 */

export interface ParsedRow {
  condutor: string;
  cpf: string;
  placa: string;
  jornada_sem_refeicao: number; // em minutos
  inicio: Date;
  operacao?: string;
  cargo?: string;
  intersticio?: number; // em minutos
  refeicao?: number; // em minutos
  fim?: Date;
  matricula?: string;
  data?: Date;
  cellColor?: string; // #FFFF00, #FFCC00, etc.
  codigoSistema?: number; // 1=ADVERTENCIA, 2=EM_REVISAO, 3=CONFERENCIA_MANUAL
}

export interface InfracaoDetectada {
  tipo: 'jornada' | 'refeicao' | 'intersticio';
  descricao: string;
  valor: string;
  limite: string;
}

export interface WarningResult {
  condutor: string;
  cpf: string;
  placa: string;
  operacao?: string;
  data: Date;
  diaSemana: string;
  status: 'ADVERTENCIA' | 'EM_REVISAO' | 'CONFERENCIA_MANUAL';
  infracos: InfracaoDetectada[];
  textoAdvertencia: string;
  numeroProtocolo?: number;
  cnpj?: string;
  endereco?: string;
  ctps?: string;
  matricula?: string;
}

// Mapeamento de colunas com sinônimos
const COLUMN_MAPPINGS: Record<string, string[]> = {
  condutor: ['condutor'],
  cpf: ['cpf'],
  placa: ['placa'],
  jornada_sem_refeicao: ['tempo jornada s/ refeicao', 'tempo jornada sem refeicao', 'tempo jornada s/ refeição'],
  inicio: ['inicio jornada', 'início jornada'],
  operacao: ['operacao', 'operação'],
  cargo: ['cargo'],
  intersticio: ['intersticio', 'interstício', 'pernoite'],
  refeicao: ['total refeicao', 'total refeição', 'tempo refeicao'],
  fim: ['fim jornada'],
  matricula: ['matricula', 'matrícula'],
  data: ['data'],
  codigoSistema: ['código sistema', 'codigo sistema', 'código', 'codigo'],
};

/**
 * Normaliza CPF: remove pontos/traços/espaços, valida 11 dígitos
 */
export function normalizeCPF(cpf: string): { valid: boolean; value: string } {
  if (!cpf) return { valid: false, value: '' };
  
  const cleaned = cpf.replace(/[\s.\-]/g, '');
  if (!/^\d{11}$/.test(cleaned)) {
    return { valid: false, value: cleaned };
  }
  
  return { valid: true, value: cleaned };
}

/**
 * Normaliza PLACA: maiúsculas, sem espaços
 */
export function normalizePlaca(placa: string): string {
  if (!placa) return '';
  return placa.toUpperCase().replace(/\s/g, '');
}

/**
 * Converte tempo em minutos
 * Aceita: "HH:MM", "HH:MM:SS", decimal (0.354166 = 08:30), datetime do Excel
 */
export function timeToMinutes(value: any): number | null {
  if (!value || value === '-' || value === '—' || value === ' - ') {
    return null; // Ausente
  }

  // Se for string
  if (typeof value === 'string') {
    const trimmed = value.trim();
    
    // Formato HH:MM
    if (/^\d{1,2}:\d{2}$/.test(trimmed)) {
      const [hours, minutes] = trimmed.split(':').map(Number);
      return hours * 60 + minutes;
    }
    
    // Formato HH:MM:SS
    if (/^\d{1,2}:\d{2}:\d{2}$/.test(trimmed)) {
      const [hours, minutes, seconds] = trimmed.split(':').map(Number);
      return hours * 60 + minutes + Math.round(seconds / 60);
    }
    
    // Tenta converter como número
    const num = parseFloat(trimmed.replace(',', '.'));
    if (!isNaN(num) && num > 0) {
      return Math.round(num * 24 * 60); // Converte fração de dia para minutos
    }
  }

  // Se for número (decimal)
  if (typeof value === 'number' && value > 0) {
    return Math.round(value * 24 * 60); // Converte fração de dia para minutos
  }

  // Se for Date (datetime do Excel)
  if (value instanceof Date) {
    const hours = value.getHours();
    const minutes = value.getMinutes();
    return hours * 60 + minutes;
  }

  return null;
}

/**
 * Converte minutos para formato "HHhMM"
 */
export function minutesToFormat(minutes: number | null): string {
  if (minutes === null || minutes === undefined) return '';
  
  const hours = Math.floor(minutes / 60);
  const mins = minutes % 60;
  return `${hours}h${mins.toString().padStart(2, '0')}`;
}

/**
 * Extrai data e calcula dia da semana
 */
export function parseDataAndDia(data?: Date, inicioStr?: string): { data: Date; dia: string } | null {
  let date: Date | null = null;

  if (data instanceof Date && !isNaN(data.getTime())) {
    date = data;
  } else if (typeof inicioStr === 'string') {
    // Tenta extrair DD/MM/YYYY dos 10 primeiros caracteres
    const match = inicioStr.match(/(\d{2})\/(\d{2})\/(\d{4})/);
    if (match) {
      const [, day, month, year] = match;
      date = new Date(`${year}-${month}-${day}`);
    }
  }

  if (!date || isNaN(date.getTime())) {
    return null;
  }

  const dias = ['domingo', 'segunda', 'terça', 'quarta', 'quinta', 'sexta', 'sábado'];
  const dia = dias[date.getDay()];

  return { data: date, dia };
}

/**
 * Calcula limite de jornada baseado no dia da semana
 */
export function getLimiteJornada(dia: string): number {
  // seg–sex = 08:00 | sáb = 04:00 | dom/feriado = 00:00
  if (dia === 'segunda' || dia === 'terça' || dia === 'quarta' || dia === 'quinta' || dia === 'sexta') {
    return 8 * 60; // 08:00
  }
  if (dia === 'sábado') {
    return 4 * 60; // 04:00
  }
  return 0; // domingo/feriado
}

/**
 * Detecta infrações baseado nas regras v4
 */
export function detectarInfracoes(row: ParsedRow): InfracaoDetectada[] {
  const infracoes: InfracaoDetectada[] = [];

  // (A) EXCESSO DE JORNADA
  if (row.jornada_sem_refeicao !== null && row.jornada_sem_refeicao !== undefined) {
    const diaInfo = parseDataAndDia(row.data, row.inicio?.toISOString());
    if (diaInfo) {
      const limite = getLimiteJornada(diaInfo.dia);
      if (row.jornada_sem_refeicao > limite) {
        infracoes.push({
          tipo: 'jornada',
          descricao: 'Excesso de jornada',
          valor: minutesToFormat(row.jornada_sem_refeicao),
          limite: '08h00',
        });
      }
    }
  }

  // (B) REFEIÇÃO (intrajornada) - mínimo 01:00
  if (row.refeicao !== null && row.refeicao !== undefined) {
    if (row.refeicao === 0 || row.refeicao < 0) {
      // Ausente
      infracoes.push({
        tipo: 'refeicao',
        descricao: 'Sem intrajornada',
        valor: 'Não teve almoço',
        limite: '01h00',
      });
    } else if (row.refeicao < 60) {
      // Insuficiente
      infracoes.push({
        tipo: 'refeicao',
        descricao: 'Intrajornada insuficiente',
        valor: minutesToFormat(row.refeicao),
        limite: '01h00',
      });
    }
  }

  // (C) INTERSTÍCIO (interjornada) - mínimo 11:00
  if (row.intersticio !== null && row.intersticio !== undefined && row.intersticio > 0) {
    if (row.intersticio < 660) { // 11 * 60 = 660
      infracoes.push({
        tipo: 'intersticio',
        descricao: 'Interjornada insuficiente',
        valor: minutesToFormat(row.intersticio),
        limite: '11h00',
      });
    }
  }

  return infracoes;
}

/**
 * Detecta status baseado na cor da célula
 */
export function detectarStatus(cellColor?: string, codigoSistema?: number): 'ADVERTENCIA' | 'EM_REVISAO' | 'CONFERENCIA_MANUAL' {
  if (codigoSistema === 1) return 'ADVERTENCIA';
  if (codigoSistema === 2) return 'EM_REVISAO';
  if (codigoSistema === 3) return 'CONFERENCIA_MANUAL';

  if (!cellColor) return 'CONFERENCIA_MANUAL';

  const normalized = cellColor.toUpperCase();
  
  if (normalized === '#FFFF00') return 'ADVERTENCIA';
  if (normalized === '#FFCC00') return 'EM_REVISAO';
  
  return 'CONFERENCIA_MANUAL';
}

/**
 * Gera texto da advertência conforme template oficial v4
 */
export function gerarTextoAdvertencia(
  row: ParsedRow,
  infracoes: InfracaoDetectada[],
  diaInfo: { data: Date; dia: string }
): string {
  if (infracoes.length === 0) return '';

  let texto = '';

  // Formata data de análise
  const dataAnalise = new Date().toLocaleDateString('pt-BR', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });

  // Formata data da infração
  const dataInfracao = diaInfo.data.toLocaleDateString('pt-BR', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });

  // Monta o parágrafo de infrações
  let paragrafos: string[] = [];

  // Infração de jornada
  const jornadaInf = infracoes.find(i => i.tipo === 'jornada');
  if (jornadaInf) {
    paragrafos.push(
      `No dia ${dataInfracao}, foi constatada jornada aberta com duração de ${jornadaInf.valor}, ultrapassando o limite permitido que é de 08h00 podendo ser estendida por duas horas com AUTORIZAÇÃO do gestor`
    );
  }

  // Infração de interstício
  const interstícioInf = infracoes.find(i => i.tipo === 'intersticio');
  if (interstícioInf) {
    const conector = paragrafos.length > 0 ? '. Também foram suprimidos os intervalos para descanso, sendo realizado um intervalo interjornada (intervalo de uma jornada para outra) de apenas' : 'Também foram suprimidos os intervalos para descanso, sendo realizado um intervalo interjornada (intervalo de uma jornada para outra) de apenas';
    paragrafos.push(
      `${conector} ${interstícioInf.valor}, quando o mínimo exigido por lei e orientado pela empresa é de 11h00`
    );
  }

  // Infração de refeição
  const refeicaoInf = infracoes.find(i => i.tipo === 'refeicao');
  if (refeicaoInf) {
    const conector = paragrafos.length > 0 ? ' e neste mesmo dia' : '. Também, neste mesmo dia,';
    if (refeicaoInf.descricao === 'Sem intrajornada') {
      paragrafos.push(`${conector} NÃO teve descanso intrajornada (intervalo de almoço) sendo que o exigido em Lei é de no mínimo 01h00`);
    } else {
      paragrafos.push(`${conector} realizou descanso intrajornada (intervalo de almoço) de apenas ${refeicaoInf.valor}, inferior ao mínimo de 01h00 exigido em Lei`);
    }
  }

  // Junta todos os parágrafos
  texto = paragrafos.join('');
  if (texto && !texto.endsWith('.')) {
    texto += '.';
  }

  return texto;
}

/**
 * Valida linha e retorna resultado
 */
export function validarLinha(
  row: ParsedRow,
  numeroProtocolo?: number,
  cnpj?: string,
  endereco?: string,
  ctps?: string
): WarningResult | null {
  // Validar CPF
  const cpfValidacao = normalizeCPF(row.cpf);
  if (!cpfValidacao.valid) {
    return {
      condutor: row.condutor,
      cpf: row.cpf,
      placa: row.placa,
      operacao: row.operacao,
      data: row.data || new Date(),
      diaSemana: 'desconhecido',
      status: 'CONFERENCIA_MANUAL',
      infracos: [],
      textoAdvertencia: 'CPF inválido',
    };
  }

  // Validar data
  const diaInfo = parseDataAndDia(row.data, row.inicio?.toISOString());
  if (!diaInfo) {
    return {
      condutor: row.condutor,
      cpf: cpfValidacao.value,
      placa: row.placa,
      operacao: row.operacao,
      data: new Date(),
      diaSemana: 'desconhecido',
      status: 'CONFERENCIA_MANUAL',
      infracos: [],
      textoAdvertencia: 'Data ilegível',
    };
  }

  // Detectar infrações
  const infracoes = detectarInfracoes(row);

  // Se nenhuma infração, marcar para conferência manual
  if (infracoes.length === 0) {
    return {
      condutor: row.condutor,
      cpf: cpfValidacao.value,
      placa: row.placa,
      operacao: row.operacao,
      data: diaInfo.data,
      diaSemana: diaInfo.dia,
      status: 'CONFERENCIA_MANUAL',
      infracos: [],
      textoAdvertencia: 'Nenhuma infração detectada',
    };
  }

  // Detectar status pelo Código Sistema ou cor
  const status = detectarStatus(row.cellColor, row.codigoSistema);

  // Se status for EM_REVISAO, não gerar PDF
  if (status === 'EM_REVISAO') {
    return {
      condutor: row.condutor,
      cpf: cpfValidacao.value,
      placa: row.placa,
      operacao: row.operacao,
      data: diaInfo.data,
      diaSemana: diaInfo.dia,
      status: 'EM_REVISAO',
      infracos: infracoes,
      textoAdvertencia: 'Será ajustado (não foi trabalho de fato)',
    };
  }

  // Gerar texto da advertência
  const textoAdvertencia = gerarTextoAdvertencia(row, infracoes, diaInfo);

  return {
    condutor: row.condutor,
    cpf: cpfValidacao.value,
    placa: row.placa,
    operacao: row.operacao,
    data: diaInfo.data,
    diaSemana: diaInfo.dia,
    status,
    infracos: infracoes,
    textoAdvertencia,
    numeroProtocolo,
    cnpj,
    endereco,
    ctps,
    matricula: row.matricula,
  };
}

/**
 * Encontra coluna pelo nome normalizado
 */
export function encontrarColuna(headers: string[], fieldName: keyof typeof COLUMN_MAPPINGS): number {
  const synonyms = COLUMN_MAPPINGS[fieldName];
  
  for (let i = 0; i < headers.length; i++) {
    const normalized = headers[i]
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .trim();
    
    for (const synonym of synonyms) {
      if (normalized.includes(synonym.toLowerCase())) {
        return i;
      }
    }
  }
  
  return -1;
}

/**
 * Valida colunas obrigatórias
 */
export function validarColunasObrigatorias(headers: string[]): { valid: boolean; missing: string[] } {
  const obrigatorias = ['condutor', 'cpf', 'placa', 'jornada_sem_refeicao', 'inicio'] as const;
  const missing: string[] = [];

  for (const field of obrigatorias) {
    if (encontrarColuna(headers, field) === -1) {
      missing.push(field);
    }
  }

  return {
    valid: missing.length === 0,
    missing,
  };
}
