/**
 * FRAMENTO RULES ENGINE v4
 * Implementa as regras oficiais de importação em massa de advertências
 * Segue exatamente o documento PROMPT_MANUS_Importacao_Advertencias_v4.md
 */

export type InfractionType = 'jornada' | 'refeicao' | 'intersticio';
export type WarningStatus = 'ADVERTÊNCIA' | 'EM REVISÃO' | 'CONFERÊNCIA MANUAL';

export interface ColumnMapping {
  condutor?: string;
  cpf?: string;
  placa?: string;
  jornada_sem_refeicao?: string;
  inicio?: string;
  operacao?: string;
  cargo?: string;
  intersticio?: string;
  refeicao?: string;
  fim?: string;
  matricula?: string;
  data?: string;
}

export interface ParsedRow {
  condutor: string;
  cpf: string;
  placa: string;
  jornada_sem_refeicao: number; // minutos
  inicio: Date;
  operacao?: string;
  cargo?: string;
  intersticio?: number; // minutos
  refeicao?: number; // minutos
  fim?: Date;
  matricula?: string;
  data?: Date;
  cor?: string; // #FFFF00, #FFCC00, etc
}

export interface Infraction {
  type: InfractionType;
  value: number; // minutos
  limit: number; // minutos
  text: string;
}

export interface WarningData {
  condutor: string;
  cpf: string;
  placa: string;
  operacao?: string;
  status: WarningStatus;
  infractions: Infraction[];
  datas: string[]; // múltiplas datas se agrupadas
  textoAdvertencia: string;
  protocolo?: string;
  cnpj?: string;
  ctps?: string;
  endereco?: string;
}

/**
 * Normaliza CPF: remove pontos, traços, espaços
 * Retorna 11 dígitos ou null se inválido
 */
export function normalizeCPF(cpf: string): string | null {
  if (!cpf) return null;
  const clean = cpf.replace(/\D/g, '');
  if (clean.length !== 11) return null;
  return clean;
}

/**
 * Normaliza PLACA: maiúsculas, sem espaços
 */
export function normalizePlaca(placa: string): string {
  return placa.toUpperCase().replace(/\s/g, '');
}

/**
 * Converte tempo HH:MM ou decimal para minutos
 * Trata ausentes: "", "-", " - ", "—", "00:00" é zero real
 */
export function timeToMinutes(value: any): number | null {
  if (!value && value !== 0) return null;
  
  const str = String(value).trim();
  
  // Ausentes
  if (str === '' || str === '-' || str === ' - ' || str === '—') return null;
  
  // HH:MM (check first to avoid parsing as decimal)
  const match = str.match(/(\d+):(\d+)/);
  if (match) {
    const hours = parseInt(match[1]);
    const minutes = parseInt(match[2]);
    return hours * 60 + minutes;
  }
  
  // Decimal (ex: 0.354166 = 08:30)
  const decimal = parseFloat(str);
  if (!isNaN(decimal)) {
    if (decimal >= 0 && decimal <= 1) {
      return Math.round(decimal * 24 * 60);
    }
    return Math.round(decimal);
  }
  
  return null;
}

/**
 * Extrai data de string DD/MM/YYYY ou de datetime
 */
export function parseDate(value: any): Date | null {
  if (!value) return null;
  
  const str = String(value).trim();
  
  // DD/MM/YYYY
  const match = str.match(/(\d{2})\/(\d{2})\/(\d{4})/);
  if (match) {
    const day = parseInt(match[1]);
    const month = parseInt(match[2]);
    const year = parseInt(match[3]);
    return new Date(year, month - 1, day);
  }
  
  // Tenta parse direto
  const date = new Date(str);
  if (!isNaN(date.getTime())) {
    return date;
  }
  
  return null;
}

/**
 * Calcula dia da semana (0=domingo, 1=segunda, ..., 6=sábado)
 */
export function getDayOfWeek(date: Date): number {
  return date.getDay();
}

/**
 * Retorna limite de jornada baseado no dia da semana
 * seg-sex = 480min (08:00), sáb = 240min (04:00), dom/feriado = 0min
 */
export function getJornadeLimit(date: Date): number {
  const dayOfWeek = getDayOfWeek(date);
  
  if (dayOfWeek === 0) return 0; // domingo
  if (dayOfWeek === 6) return 240; // sábado (04:00)
  return 480; // seg-sex (08:00)
}

/**
 * Detecta infrações em uma linha
 */
export function detectInfractions(row: ParsedRow): Infraction[] {
  const infractions: Infraction[] = [];
  const dayOfWeek = getDayOfWeek(row.inicio);
  
  // (A) EXCESSO DE JORNADA
  const jornadeLimit = getJornadeLimit(row.inicio);
  if (row.jornada_sem_refeicao > jornadeLimit) {
    infractions.push({
      type: 'jornada',
      value: row.jornada_sem_refeicao,
      limit: jornadeLimit,
      text: `Jornada de ${minutesToHHMM(row.jornada_sem_refeicao)} (limite: ${minutesToHHMM(jornadeLimit)})`,
    });
  }
  
  // (B) REFEIÇÃO (intrajornada)
  if (row.refeicao !== undefined && row.refeicao !== null) {
    if (row.refeicao < 60) {
      infractions.push({
        type: 'refeicao',
        value: row.refeicao,
        limit: 60,
        text: `Refeição insuficiente: ${minutesToHHMM(row.refeicao)} (mínimo: 01h00)`,
      });
    }
  } else {
    // Sem refeição
    infractions.push({
      type: 'refeicao',
      value: 0,
      limit: 60,
      text: 'Sem descanso intrajornada (intervalo de almoço)',
    });
  }
  
  // (C) INTERSTÍCIO (interjornada)
  if (row.intersticio !== undefined && row.intersticio !== null) {
    if (row.intersticio < 660) { // 11:00
      infractions.push({
        type: 'intersticio',
        value: row.intersticio,
        limit: 660,
        text: `Interstício insuficiente: ${minutesToHHMM(row.intersticio)} (mínimo: 11h00)`,
      });
    }
  }
  
  return infractions;
}

/**
 * Converte minutos para formato HHhMM (ex: 14h50, 09h37)
 */
export function minutesToHHMM(minutes: number): string {
  const hours = Math.floor(minutes / 60);
  const mins = minutes % 60;
  return `${String(hours).padStart(2, '0')}h${String(mins).padStart(2, '0')}`;
}

/**
 * Gera texto de advertência conforme template oficial
 */
export function generateWarningText(
  data: WarningData,
  datas: string[],
  infractions: Infraction[]
): string {
  const dataAnalise = new Date().toLocaleDateString('pt-BR', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });
  
  const dataInfracao = datas.join(', ');
  
  // Monta parágrafo de infrações
  let paragrafInfracoes = '';
  
  const temJornada = infractions.some(i => i.type === 'jornada');
  const temRefeicao = infractions.some(i => i.type === 'refeicao');
  const temIntersticio = infractions.some(i => i.type === 'intersticio');
  
  if (temJornada) {
    const jornada = infractions.find(i => i.type === 'jornada');
    paragrafInfracoes += `No dia ${dataInfracao}, foi constatada jornada aberta com duração de ${minutesToHHMM(jornada!.value)}, ultrapassando o limite permitido que é de 08h00 podendo ser estendida por duas horas com AUTORIZAÇÃO do gestor`;
  }
  
  if (temIntersticio) {
    const intersticio = infractions.find(i => i.type === 'intersticio');
    const conector = temJornada ? ', Também foram suprimidos os intervalos para descanso, sendo realizado um intervalo interjornada (intervalo de uma jornada para outra) de apenas' : '. Também foram suprimidos os intervalos para descanso, sendo realizado um intervalo interjornada (intervalo de uma jornada para outra) de apenas';
    paragrafInfracoes += `${conector} ${minutesToHHMM(intersticio!.value)}, quando o mínimo exigido por lei e orientado pela empresa é de 11h00`;
  }
  
  if (temRefeicao) {
    const refeicao = infractions.find(i => i.type === 'refeicao');
    let conector = '';
    
    if (temJornada || temIntersticio) {
      conector = ' e neste mesmo dia';
    } else {
      conector = '. Também, neste mesmo dia,';
    }
    
    if (refeicao!.value === 0) {
      paragrafInfracoes += `${conector} NÃO teve descanso intrajornada (intervalo de almoço) sendo que o exigido em Lei é de no mínimo 01h00`;
    } else {
      paragrafInfracoes += `${conector} realizou descanso intrajornada (intervalo de almoço) de apenas ${minutesToHHMM(refeicao!.value)}, inferior ao mínimo de 01h00 exigido em Lei`;
    }
  }
  
  // Encerra com ponto se não há mais infrações
  if (!temRefeicao && !temIntersticio && temJornada) {
    paragrafInfracoes += '.';
  }
  
  const texto = `Tem esta a finalidade de aplicar-lhe a pena de advertência disciplinar, em razão da(s) seguinte(s) ocorrência(a):

Apos analise realizada no dia ${dataAnalise}.

A empresa Transportes Framento, no exercício regular de seu poder diretivo e disciplinar, conforme disposto no artigo 2º da Consolidação das Leis do Trabalho (CLT), vem, por meio deste documento, aplicar ADVERTÊNCIA FORMAL a Vossa Senhoria, na função de motorista profissional, pelos fatos que seguem. Durante análise de sua jornada de trabalho das últimas duas semanas, foram identificadas as seguintes irregularidades: ${paragrafInfracoes} Tais condutas configuram descumprimento de obrigações contratuais e ato de indisciplina, nos termos do artigo 482, alíneas "h" (indisciplina ou insubordinação) da CLT, além de descumprir as normas internas da empresa. Diante do exposto, a empresa ADVERTE formalmente Vossa Senhoria, solicitando o imediato ajuste de conduta e o cumprimento rigoroso dos horários estabelecidos em contrato e orientações internas. Em caso de reincidência, será aplicado sanções mais severas, conforme previsto na legislação vigente e nas normas da empresa. Ressalta-se que esta medida está sendo adotada em conformidade com o princípio da imediatidade da ação disciplinar. Solicita-se que Vossa Senhoria assine o presente documento, declarando ciência de seu conteúdo. Em caso de recusa, a empresa procederá com o registro da entrega por meio da assinatura de duas testemunhas, conforme previsto em norma interna.

Esclarecemos, ainda, que a repetição de procedimentos como este(s) poderá ser considerada como ato faltoso, passível de dispensa por Justa Causa. Para que não tenhamos, no futuro, de tomar as medidas que nos facultam a legislação vigente, solicitamos-lhe que observe as normas reguladoras da relação de emprego.`;
  
  return texto;
}

/**
 * Detecta status baseado na cor da célula
 * #FFFF00 (amarelo vivo) = ADVERTÊNCIA
 * #FFCC00 (amarelo-ouro) = EM REVISÃO
 * Sem cor / desconhecida = CONFERÊNCIA MANUAL
 */
export function detectStatusByColor(color?: string): WarningStatus {
  if (!color) return 'CONFERÊNCIA MANUAL';
  
  const normalized = color.toUpperCase().replace('#', '');
  
  if (normalized === 'FFFF00') return 'ADVERTÊNCIA';
  if (normalized === 'FFCC00') return 'EM REVISÃO';
  
  return 'CONFERÊNCIA MANUAL';
}

/**
 * Valida se todos os campos obrigatórios estão presentes
 */
export function validateRequiredColumns(headers: string[]): { valid: boolean; missing: string[] } {
  const required = ['condutor', 'cpf', 'placa', 'jornada_sem_refeicao', 'inicio'];
  const normalized = headers.map(h => normalizeHeaderName(h));
  
  const synonyms = {
    condutor: ['condutor'],
    cpf: ['cpf'],
    placa: ['placa'],
    jornada_sem_refeicao: ['tempo_jornada_s_refeicao', 'tempo_jornada_sem_refeicao', 'tempo_jornada_s_refeicao'],
    inicio: ['inicio_jornada', 'inicio_jornada'],
  };
  
  const missing: string[] = [];
  
  for (const field of required) {
    const syns = synonyms[field as keyof typeof synonyms];
    const found = syns.some(syn => normalized.includes(syn));
    
    if (!found) {
      missing.push(field);
    }
  }
  
  return {
    valid: missing.length === 0,
    missing,
  };
}

/**
 * Normaliza nome de coluna para busca
 */
export function normalizeHeaderName(header: string): string {
  return header
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/\s+/g, '_')
    .replace(/[^\w]/g, '');
}

/**
 * Mapeia colunas por nome com sinônimos
 */
export function mapColumns(headers: string[]): ColumnMapping {
  const mapping: ColumnMapping = {};
  const normalized = headers.map((h, idx) => ({ header: h, normalized: normalizeHeaderName(h), idx }));
  
  const synonyms = {
    condutor: ['condutor'],
    cpf: ['cpf'],
    placa: ['placa'],
    jornada_sem_refeicao: ['tempo_jornada_s_refeicao', 'tempo_jornada_sem_refeicao', 'tempo_jornada_s_refeicao'],
    inicio: ['inicio_jornada', 'inicio_jornada'],
    operacao: ['operacao', 'operacao'],
    cargo: ['cargo'],
    intersticio: ['intersticio', 'intersticio', 'pernoite'],
    refeicao: ['total_refeicao', 'total_refeicao', 'tempo_refeicao'],
    fim: ['fim_jornada'],
    matricula: ['matricula', 'matricula'],
    data: ['data'],
  };
  
  for (const [field, syns] of Object.entries(synonyms)) {
    for (const syn of syns) {
      const found = normalized.find(n => n.normalized === syn);
      if (found) {
        mapping[field as keyof ColumnMapping] = found.header;
        break;
      }
    }
  }
  
  return mapping;
}
