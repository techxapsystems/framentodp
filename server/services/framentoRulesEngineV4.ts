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
    
    // Formato HH:MM ou HH:MM:SS
    const timeMatch = trimmed.match(/^(\d{1,2}):(\d{2})(?::(\d{2}))?$/);
    if (timeMatch) {
      const hours = parseInt(timeMatch[1], 10);
      const minutes = parseInt(timeMatch[2], 10);
      return hours * 60 + minutes;
    }

    // Tenta decimal (0.354166 = 08:30)
    const decimal = parseFloat(trimmed);
    if (!isNaN(decimal) && decimal > 0 && decimal < 24) {
      return Math.round(decimal * 60);
    }
  }

  // Se for número (Excel datetime)
  if (typeof value === 'number') {
    if (value > 0 && value < 24) {
      return Math.round(value * 60);
    }
  }

  return null;
}

/**
 * Formata minutos para HH:MM
 */
export function minutesToHHMM(minutes: number): string {
  if (minutes === null || minutes === undefined) return '-';
  const hours = Math.floor(minutes / 60);
  const mins = minutes % 60;
  return `${String(hours).padStart(2, '0')}h${String(mins).padStart(2, '0')}`;
}

/**
 * Detecta infrações baseado em regras
 */
export function detectarInfracoes(row: ParsedRow): InfracaoDetectada[] {
  const infracoes: InfracaoDetectada[] = [];

  // Jornada: máximo 10h (8h + 2h autorizado)
  if (row.jornada_sem_refeicao && row.jornada_sem_refeicao > 600) {
    infracoes.push({
      tipo: 'jornada',
      descricao: 'Jornada acima do limite',
      valor: minutesToHHMM(row.jornada_sem_refeicao),
      limite: '10h00',
    });
  }

  // Interstício: mínimo 11h
  if (row.intersticio && row.intersticio < 660) {
    infracoes.push({
      tipo: 'intersticio',
      descricao: 'Interstício abaixo do limite',
      valor: minutesToHHMM(row.intersticio),
      limite: '11h00',
    });
  }

  // Refeição: mínimo 1h
  if (row.refeicao !== null && row.refeicao !== undefined) {
    if (row.refeicao === 0) {
      infracoes.push({
        tipo: 'refeicao',
        descricao: 'Sem intrajornada',
        valor: '0h00',
        limite: '01h00',
      });
    } else if (row.refeicao < 60) {
      infracoes.push({
        tipo: 'refeicao',
        descricao: 'Refeição abaixo do limite',
        valor: minutesToHHMM(row.refeicao),
        limite: '01h00',
      });
    }
  }

  return infracoes;
}

/**
 * Formata data para português
 */
function formatarData(data: Date): string {
  return data.toLocaleDateString('pt-BR', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });
}

/**
 * Gera texto da advertência conforme template oficial v4
 * INTELIGENTE: Usa estrutura de múltiplas infrações no mesmo dia
 */
export function gerarTextoAdvertencia(
  row: ParsedRow,
  infracoes: InfracaoDetectada[],
  diaInfo: { data: Date; dia: string }
): string {
  if (infracoes.length === 0) return '';

  const dataInfracao = formatarData(diaInfo.data);
  
  // Template base conforme exemplo fornecido
  let textoInfracoes = '';
  
  // Jornada
  const jornadaInf = infracoes.find(i => i.tipo === 'jornada');
  if (jornadaInf) {
    textoInfracoes += `No dia ${dataInfracao}, foi constatada jornada aberta com duração de ${jornadaInf.valor}, ultrapassando o limite permitido que é de 08h00 podendo ser estendida por duas horas com AUTORIZAÇÃO do gestor`;
  }

  // Interstício
  const interstícioInf = infracoes.find(i => i.tipo === 'intersticio');
  if (interstícioInf) {
    if (textoInfracoes) {
      textoInfracoes += `, Também foram suprimidos os intervalos para descanso, sendo realizado um intervalo interjornada (intervalo de uma jornada para outra) de apenas ${interstícioInf.valor}, quando o mínimo exigido por lei e orientado pela empresa é de 11h00`;
    } else {
      textoInfracoes += `No dia ${dataInfracao}, foram suprimidos os intervalos para descanso, sendo realizado um intervalo interjornada (intervalo de uma jornada para outra) de apenas ${interstícioInf.valor}, quando o mínimo exigido por lei e orientado pela empresa é de 11h00`;
    }
  }

  // Refeição
  const refeicaoInf = infracoes.find(i => i.tipo === 'refeicao');
  if (refeicaoInf) {
    if (textoInfracoes) {
      if (refeicaoInf.descricao === 'Sem intrajornada') {
        textoInfracoes += ` e neste mesmo dia NÃO teve descanso intrajornada (intervalo de almoço) sendo que o exigido em Lei é de no mínimo 01h00`;
      } else {
        textoInfracoes += ` e neste mesmo dia realizou descanso intrajornada (intervalo de almoço) de apenas ${refeicaoInf.valor}, inferior ao mínimo de 01h00 exigido em Lei`;
      }
    } else {
      if (refeicaoInf.descricao === 'Sem intrajornada') {
        textoInfracoes += `No dia ${dataInfracao}, NÃO teve descanso intrajornada (intervalo de almoço) sendo que o exigido em Lei é de no mínimo 01h00`;
      } else {
        textoInfracoes += `No dia ${dataInfracao}, realizou descanso intrajornada (intervalo de almoço) de apenas ${refeicaoInf.valor}, inferior ao mínimo de 01h00 exigido em Lei`;
      }
    }
  }

  // Adiciona ponto final se necessário
  if (textoInfracoes && !textoInfracoes.endsWith('.')) {
    textoInfracoes += '.';
  }

  // Template completo conforme exemplo
  const texto = `A empresa Transportes Framento, no exercício regular de seu poder diretivo e disciplinar, conforme disposto no artigo 2º da Consolidação das Leis do Trabalho (CLT), vem, por meio deste documento, aplicar ADVERTÊNCIA FORMAL a Vossa Senhoria, na função de motorista profissional, pelos fatos que seguem. Durante análise de sua jornada de trabalho das últimas duas semanas, foram identificadas as seguintes irregularidades: ${textoInfracoes} Tais condutas configuram descumprimento de obrigações contratuais e ato de indisciplina, nos termos do artigo 482, alíneas "h" (indisciplina ou insubordinação) da CLT, além de descumprir as normas internas da empresa. Diante do exposto, a empresa ADVERTE formalmente Vossa Senhoria, solicitando o imediato ajuste de conduta e o cumprimento rigoroso dos horários estabelecidos em contrato e orientações internas. Em caso de reincidência, será aplicado sanções mais severas, conforme previsto na legislação vigente e nas normas da empresa. Ressalta-se que esta medida está sendo adotada em conformidade com o princípio da imediatidade da ação disciplinar. Solicita-se que Vossa Senhoria assine o presente documento, declarando ciência de seu conteúdo. Em caso de recusa, a empresa procederá com o registro da entrega por meio da assinatura de duas testemunhas, conforme previsto em norma interna.`;

  return texto;
}

/**
 * Detecta status baseado em codigoSistema
 */
export function detectarStatus(codigoSistema?: number): 'ADVERTENCIA' | 'EM_REVISAO' | 'CONFERENCIA_MANUAL' {
  if (codigoSistema === 1) return 'ADVERTENCIA';
  if (codigoSistema === 2) return 'EM_REVISAO';
  return 'CONFERENCIA_MANUAL';
}

/**
 * Encontra coluna por nome (com normalização)
 */
export function encontrarColuna(headers: string[], procurar: string): number {
  const procurarNorm = procurar.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
  
  for (let i = 0; i < headers.length; i++) {
    const headerNorm = headers[i].toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
    if (headerNorm === procurarNorm) {
      return i;
    }
  }
  
  return -1;
}

/**
 * Valida e processa uma linha
 */
export function validarLinha(
  row: ParsedRow,
  rowIndex: number
): { valid: boolean; warning?: WarningResult; error?: string } {
  // Validar CPF
  const cpfValidation = normalizeCPF(row.cpf);
  if (!cpfValidation.valid) {
    return {
      valid: false,
      error: `Linha ${rowIndex}: CPF inválido (${row.cpf})`,
    };
  }

  row.cpf = cpfValidation.value;

  // Validar data
  if (!row.data || isNaN(row.data.getTime())) {
    return {
      valid: false,
      error: `Linha ${rowIndex}: Data ilegível`,
    };
  }

  // Normalizar placa
  row.placa = normalizePlaca(row.placa);

  // Detectar infrações
  const infracoes = detectarInfracoes(row);

  // Se não há infrações, pula
  if (infracoes.length === 0) {
    return {
      valid: false,
      error: `Linha ${rowIndex}: Nenhuma infração detectada`,
    };
  }

  // Detectar status
  const status = detectarStatus(row.codigoSistema);

  // Se status é EM_REVISAO, marca como "será ajustado"
  let textoAdvertencia = '';
  if (status === 'EM_REVISAO') {
    textoAdvertencia = 'Será ajustado (não foi trabalho de fato)';
  } else {
    // Gerar texto da advertência
    const diaInfo = {
      data: row.data,
      dia: row.data.toLocaleDateString('pt-BR', { weekday: 'long' }),
    };
    textoAdvertencia = gerarTextoAdvertencia(row, infracoes, diaInfo);
  }

  const warning: WarningResult = {
    condutor: row.condutor,
    cpf: row.cpf,
    placa: row.placa,
    operacao: row.operacao,
    data: row.data,
    diaSemana: row.data.toLocaleDateString('pt-BR', { weekday: 'long' }),
    status,
    infracos: infracoes,
    textoAdvertencia,
    matricula: row.matricula,
  };

  return { valid: true, warning };
}
