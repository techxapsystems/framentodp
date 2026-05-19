import { ParsedImportRow, GroupedMotorista, formatHours } from "./bulkImportParser";

/**
 * Tipos de infrações detectadas
 */
export enum InfracaoTipo {
  JORNADA_EXCESSIVA = "jornada_excessiva", // Jornada > 10h
  INTERSTICIO_INSUFICIENTE = "intersticio_insuficiente", // Interstício < 11h
  REFEICAO_INSUFICIENTE = "refeicao_insuficiente", // Refeição < 1h
  TEMPO_DIRIGIDO_EXCESSIVO = "tempo_dirigido_excessivo", // Dirigido > 9h
}

export interface InfracaoDetectada {
  tipo: InfracaoTipo;
  descricao: string;
  valor: number;
  limite: number;
}

export interface AnaliseMotorista {
  cpf: string;
  nome: string;
  operacao: string;
  placa: string;
  totalOcorrencias: number;
  infracoesDetectadas: InfracaoDetectada[];
  temInfracao: boolean;
  nivelAdvertencia: number;
  textoAdvertencia: string;
  artigos: string[];
}

/**
 * Limites para detecção de infrações (conforme prompt)
 */
const LIMITES = {
  JORNADA_MAX_HORAS: 10, // Jornada > 10h = infração
  INTERSTICIO_MIN_HORAS: 11, // Interstício < 11h = infração
  REFEICAO_MIN_HORAS: 1, // Refeição < 1h = infração
  TEMPO_DIRIGIDO_MAX_HORAS: 9, // Dirigido > 9h = infração
};

/**
 * Artigos da CLT relacionados a infrações
 */
const ARTIGOS_CLT: Record<InfracaoTipo, string> = {
  [InfracaoTipo.JORNADA_EXCESSIVA]: "Art. 58 da CLT - Jornada de trabalho",
  [InfracaoTipo.INTERSTICIO_INSUFICIENTE]: "Art. 66 da CLT - Intervalo entre jornadas",
  [InfracaoTipo.REFEICAO_INSUFICIENTE]: "Art. 71 da CLT - Intervalo para refeição",
  [InfracaoTipo.TEMPO_DIRIGIDO_EXCESSIVO]: "Art. 235 da CLT - Tempo de direção",
};

/**
 * Calcula a jornada total em horas (Fim - Início)
 */
function calcularJornada(row: ParsedImportRow): number {
  const diff = row.fimJornadaDate.getTime() - row.inicioJornadaDate.getTime();
  return diff / (1000 * 60 * 60);
}

/**
 * Detecta infrações em um motorista
 */
export function detectarInfracoes(motorista: GroupedMotorista): InfracaoDetectada[] {
  const infracoesMap = new Map<InfracaoTipo, InfracaoDetectada>();

  for (const linha of motorista.linhas) {
    // Calcula jornada total
    const jornada = calcularJornada(linha);

    // Verifica jornada excessiva
    if (jornada > LIMITES.JORNADA_MAX_HORAS) {
      if (!infracoesMap.has(InfracaoTipo.JORNADA_EXCESSIVA)) {
        infracoesMap.set(InfracaoTipo.JORNADA_EXCESSIVA, {
          tipo: InfracaoTipo.JORNADA_EXCESSIVA,
          descricao: `Jornada excessiva: ${formatHours(jornada)} (limite: ${LIMITES.JORNADA_MAX_HORAS}h)`,
          valor: jornada,
          limite: LIMITES.JORNADA_MAX_HORAS,
        });
      }
    }

    // Verifica interstício insuficiente
    if (linha.intersticio_horas > 0 && linha.intersticio_horas < LIMITES.INTERSTICIO_MIN_HORAS) {
      if (!infracoesMap.has(InfracaoTipo.INTERSTICIO_INSUFICIENTE)) {
        infracoesMap.set(InfracaoTipo.INTERSTICIO_INSUFICIENTE, {
          tipo: InfracaoTipo.INTERSTICIO_INSUFICIENTE,
          descricao: `Interstício insuficiente: ${formatHours(linha.intersticio_horas)} (limite: ${LIMITES.INTERSTICIO_MIN_HORAS}h)`,
          valor: linha.intersticio_horas,
          limite: LIMITES.INTERSTICIO_MIN_HORAS,
        });
      }
    }

    // Verifica refeição insuficiente
    if (linha.totalRefeicao_horas > 0 && linha.totalRefeicao_horas < LIMITES.REFEICAO_MIN_HORAS) {
      if (!infracoesMap.has(InfracaoTipo.REFEICAO_INSUFICIENTE)) {
        infracoesMap.set(InfracaoTipo.REFEICAO_INSUFICIENTE, {
          tipo: InfracaoTipo.REFEICAO_INSUFICIENTE,
          descricao: `Refeição insuficiente: ${formatHours(linha.totalRefeicao_horas)} (limite: ${LIMITES.REFEICAO_MIN_HORAS}h)`,
          valor: linha.totalRefeicao_horas,
          limite: LIMITES.REFEICAO_MIN_HORAS,
        });
      }
    }

    // Verifica tempo de direção excessivo
    if (linha.tempoTotalDirigido_horas > LIMITES.TEMPO_DIRIGIDO_MAX_HORAS) {
      if (!infracoesMap.has(InfracaoTipo.TEMPO_DIRIGIDO_EXCESSIVO)) {
        infracoesMap.set(InfracaoTipo.TEMPO_DIRIGIDO_EXCESSIVO, {
          tipo: InfracaoTipo.TEMPO_DIRIGIDO_EXCESSIVO,
          descricao: `Tempo de direção excessivo: ${formatHours(linha.tempoTotalDirigido_horas)} (limite: ${LIMITES.TEMPO_DIRIGIDO_MAX_HORAS}h)`,
          valor: linha.tempoTotalDirigido_horas,
          limite: LIMITES.TEMPO_DIRIGIDO_MAX_HORAS,
        });
      }
    }
  }

  return Array.from(infracoesMap.values());
}

/**
 * Gera o texto da advertência baseado nas infrações
 */
export function gerarTextoAdvertencia(infracoesDetectadas: InfracaoDetectada[]): string {
  if (infracoesDetectadas.length === 0) {
    return "";
  }

  const linhas: string[] = [
    "MOTIVO DA ADVERTÊNCIA:",
    "",
    "Foram detectadas as seguintes infrações à legislação trabalhista:",
    "",
  ];

  for (const infracao of infracoesDetectadas) {
    linhas.push(`• ${infracao.descricao}`);
  }

  linhas.push("");
  linhas.push("ARTIGOS INFRINGIDOS:");
  linhas.push("");

  const artigos = new Set<string>();
  infracoesDetectadas.forEach((infracao) => {
    const artigo = ARTIGOS_CLT[infracao.tipo];
    if (artigo) {
      artigos.add(artigo);
    }
  });

  Array.from(artigos).forEach((artigo) => {
    linhas.push(`• ${artigo}`);
  });

  linhas.push("");
  linhas.push(
    "Esta advertência é emitida conforme as disposições da Consolidação das Leis do Trabalho (CLT) e das normas de segurança e conformidade regulatória da empresa."
  );

  return linhas.join("\n");
}

/**
 * Determina o nível de advertência baseado na quantidade e tipo de infrações
 */
export function determinarNivelAdvertencia(infracoesDetectadas: InfracaoDetectada[]): number {
  if (infracoesDetectadas.length === 0) return 0;
  if (infracoesDetectadas.length === 1) return 1;
  if (infracoesDetectadas.length === 2) return 2;
  return 3;
}

/**
 * Analisa um motorista e retorna resultado completo
 */
export function analisarMotorista(motorista: GroupedMotorista): AnaliseMotorista {
  const infracoesDetectadas = detectarInfracoes(motorista);
  const temInfracao = infracoesDetectadas.length > 0;
  const nivelAdvertencia = determinarNivelAdvertencia(infracoesDetectadas);
  const textoAdvertencia = gerarTextoAdvertencia(infracoesDetectadas);

  const artigos = new Set<string>();
  infracoesDetectadas.forEach((infracao) => {
    const artigo = ARTIGOS_CLT[infracao.tipo];
    if (artigo) {
      artigos.add(artigo);
    }
  });

  return {
    cpf: motorista.cpfFormatado,
    nome: motorista.nome,
    operacao: motorista.operacao,
    placa: motorista.linhas[0]?.placa || "",
    totalOcorrencias: motorista.linhas.length,
    infracoesDetectadas,
    temInfracao,
    nivelAdvertencia,
    textoAdvertencia,
    artigos: Array.from(artigos),
  };
}

/**
 * Analisa todos os motoristas de um lote
 */
export function analisarLote(motoristas: GroupedMotorista[]): AnaliseMotorista[] {
  return motoristas.map(analisarMotorista);
}
