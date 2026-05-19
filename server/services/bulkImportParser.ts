import * as XLSX from "xlsx";

/**
 * Tipos para o parser de importação em massa
 */
export interface RawImportRow {
  condutor: string;
  cpf: string;
  matricula: string;
  operacao: string;
  cargo: string;
  placa: string;
  intersticio: string;
  inicioJornada: string;
  fimJornada: string;
  totalRefeicao: string;
  tempoTotalDirigido: string;
  tempoJornadaSemRefeicao: string;
}

export interface ParsedImportRow extends RawImportRow {
  cpfNormalizado: string;
  dataInfracao: Date;
  inicioJornadaDate: Date;
  fimJornadaDate: Date;
  intersticio_horas: number;
  totalRefeicao_horas: number;
  tempoJornadaSemRefeicao_horas: number;
  tempoTotalDirigido_horas: number;
}

export interface GroupedMotorista {
  cpf: string;
  cpfFormatado: string;
  nome: string;
  matricula: string;
  operacao: string;
  cargo: string;
  linhas: ParsedImportRow[];
}

/**
 * Normaliza tempo no formato "HH:MM" ou "HHhMM" para horas decimais
 */
function parseTimeToHours(timeStr: string | number | undefined | null): number {
  if (!timeStr) return 0;

  if (typeof timeStr === "number") {
    // Número decimal do Excel (ex: 0.354166 = 8.5 horas)
    return timeStr * 24;
  }

  const str = String(timeStr).trim();
  if (!str) return 0;

  // Tenta formato "HH:MM" ou "H:MM"
  if (str.includes(":")) {
    const [h, m] = str.split(":").map(Number);
    return h + m / 60;
  }

  // Tenta formato "HHhMM" ou "HhMM"
  if (str.includes("h")) {
    const [h, m] = str.split("h").map((x) => Number(x.replace("min", "").trim()));
    return h + (m || 0) / 60;
  }

  return 0;
}

/**
 * Formata horas decimais para "HHhMM"
 */
export function formatHours(horas: number): string {
  const h = Math.floor(horas);
  const m = Math.round((horas - h) * 60);
  return `${h}h${String(m).padStart(2, "0")}`;
}

/**
 * Normaliza CPF removendo pontos e traços
 */
function normalizeCPF(cpf: string): string {
  return String(cpf).replace(/\D/g, "");
}

/**
 * Formata CPF para "XXX.XXX.XXX-XX"
 */
export function formatCPF(cpf: string): string {
  const normalized = normalizeCPF(cpf);
  if (normalized.length !== 11) return normalized;
  return `${normalized.substring(0, 3)}.${normalized.substring(3, 6)}.${normalized.substring(6, 9)}-${normalized.substring(9)}`;
}

/**
 * Valida dígitos verificadores do CPF
 */
export function isValidCPF(cpf: string): boolean {
  const normalized = normalizeCPF(cpf);
  if (normalized.length !== 11) return false;
  if (/^(\d)\1{10}$/.test(normalized)) return false;

  let sum = 0;
  let remainder;

  // Primeiro dígito verificador
  for (let i = 1; i <= 9; i++) {
    sum += parseInt(normalized.substring(i - 1, i)) * (11 - i);
  }
  remainder = (sum * 10) % 11;
  if (remainder === 10 || remainder === 11) remainder = 0;
  if (remainder !== parseInt(normalized.substring(9, 10))) return false;

  // Segundo dígito verificador
  sum = 0;
  for (let i = 1; i <= 10; i++) {
    sum += parseInt(normalized.substring(i - 1, i)) * (12 - i);
  }
  remainder = (sum * 10) % 11;
  if (remainder === 10 || remainder === 11) remainder = 0;
  if (remainder !== parseInt(normalized.substring(10, 11))) return false;

  return true;
}

/**
 * Parseia data no formato "DD/MM/AAAA HH:MM"
 */
function parseDateTime(dateStr: string | Date | undefined): Date | null {
  if (!dateStr) return null;

  if (dateStr instanceof Date) return dateStr;

  const str = String(dateStr).trim();

  // Tenta formato "DD/MM/AAAA HH:MM"
  const match = str.match(/(\d{1,2})\/(\d{1,2})\/(\d{4})\s+(\d{1,2}):(\d{2})/);
  if (match) {
    const [, day, month, year, hour, min] = match;
    return new Date(
      parseInt(year),
      parseInt(month) - 1,
      parseInt(day),
      parseInt(hour),
      parseInt(min)
    );
  }

  // Tenta ISO format
  const date = new Date(str);
  if (!isNaN(date.getTime())) return date;

  return null;
}

/**
 * Extrai apenas a data (sem hora) de um DateTime
 */
function getDateOnly(date: Date): Date {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate());
}

/**
 * Parseia arquivo Excel e retorna linhas normalizadas
 */
export async function parseExcelFile(
  buffer: Buffer
): Promise<{ rows: ParsedImportRow[]; errors: string[] }> {
  const errors: string[] = [];
  const rows: ParsedImportRow[] = [];

  try {
    const workbook = XLSX.read(buffer, { type: "buffer" });
    const worksheet = workbook.Sheets[workbook.SheetNames[0]];

    if (!worksheet) {
      errors.push("Nenhuma planilha encontrada no arquivo");
      return { rows, errors };
    }

    // Extrai dados como array
    const data = XLSX.utils.sheet_to_json(worksheet, { header: 1 }) as (string | number)[][];

    if (data.length < 2) {
      errors.push("Planilha vazia ou sem cabeçalho");
      return { rows, errors };
    }

    // Extrai cabeçalho
    const headers = data[0] as string[];
    const headerMap: Record<string, number> = {};

    const expectedHeaders = [
      "Condutor",
      "CPF",
      "Matrícula",
      "Operação",
      "Cargo",
      "Placa",
      "Interstício",
      "Início Jornada",
      "Fim Jornada",
      "Total Refeição",
      "Tempo Total Dirigido",
      "Tempo Jornada s/ Refeição",
    ];

    for (const expected of expectedHeaders) {
      const idx = headers.findIndex(
        (h) => h?.toString().toLowerCase().trim() === expected.toLowerCase().trim()
      );
      if (idx === -1) {
        errors.push(`Coluna obrigatória não encontrada: "${expected}"`);
      } else {
        headerMap[expected] = idx;
      }
    }

    if (errors.length > 0) {
      return { rows, errors };
    }

    // Processa cada linha
    for (let rowIdx = 1; rowIdx < data.length; rowIdx++) {
      const row = data[rowIdx] as (string | number | undefined)[];
      const rowNum = rowIdx + 1;

      try {
        const condutor = String(row[headerMap["Condutor"]] || "").trim();
        const cpf = String(row[headerMap["CPF"]] || "").trim();
        const matricula = String(row[headerMap["Matrícula"]] || "").trim();
        const operacao = String(row[headerMap["Operação"]] || "").trim();
        const cargo = String(row[headerMap["Cargo"]] || "").trim();
        const placa = String(row[headerMap["Placa"]] || "").trim();
        const intersticio = String(row[headerMap["Interstício"]] || "").trim();
        const inicioJornada = row[headerMap["Início Jornada"]];
        const fimJornada = row[headerMap["Fim Jornada"]];
        const totalRefeicao = String(row[headerMap["Total Refeição"]] || "").trim();
        const tempoTotalDirigido = String(row[headerMap["Tempo Total Dirigido"]] || "").trim();
        const tempoJornadaSemRefeicao = String(
          row[headerMap["Tempo Jornada s/ Refeição"]] || ""
        ).trim();

        // Validações
        if (!condutor) {
          errors.push(`Linha ${rowNum}: Campo "Condutor" vazio`);
          continue;
        }

        if (!cpf) {
          errors.push(`Linha ${rowNum}: Campo "CPF" vazio`);
          continue;
        }

        const cpfNormalizado = normalizeCPF(cpf);
        if (!isValidCPF(cpf)) {
          errors.push(`Linha ${rowNum}: CPF inválido (${cpf})`);
          continue;
        }

        if (!operacao) {
          errors.push(`Linha ${rowNum}: Campo "Operação" vazio`);
          continue;
        }

        if (!placa) {
          errors.push(`Linha ${rowNum}: Campo "Placa" vazio`);
          continue;
        }

        const inicioJornadaDate = parseDateTime(inicioJornada as string | Date | undefined);
        if (!inicioJornadaDate) {
          errors.push(
            `Linha ${rowNum}: Formato de "Início Jornada" inválido (${inicioJornada})`
          );
          continue;
        }

        const fimJornadaDate = parseDateTime(fimJornada as string | Date | undefined);
        if (!fimJornadaDate) {
          errors.push(`Linha ${rowNum}: Formato de "Fim Jornada" inválido (${fimJornada})`);
          continue;
        }

        // Parseia tempos
        const intersticio_horas = parseTimeToHours(intersticio);
        const totalRefeicao_horas = parseTimeToHours(totalRefeicao);
        const tempoJornadaSemRefeicao_horas = parseTimeToHours(tempoJornadaSemRefeicao);
        const tempoTotalDirigido_horas = parseTimeToHours(tempoTotalDirigido);

        rows.push({
          condutor,
          cpf,
          matricula,
          operacao,
          cargo,
          placa: placa.toUpperCase(),
          intersticio,
          inicioJornada: inicioJornada?.toString() || "",
          fimJornada: fimJornada?.toString() || "",
          totalRefeicao,
          tempoTotalDirigido,
          tempoJornadaSemRefeicao,
          cpfNormalizado,
          dataInfracao: getDateOnly(inicioJornadaDate),
          inicioJornadaDate,
          fimJornadaDate,
          intersticio_horas,
          totalRefeicao_horas,
          tempoJornadaSemRefeicao_horas,
          tempoTotalDirigido_horas,
        });
      } catch (error) {
        errors.push(`Linha ${rowNum}: Erro ao processar (${String(error)})`);
      }
    }

    return { rows, errors };
  } catch (error) {
    errors.push(`Erro ao ler arquivo Excel: ${String(error)}`);
    return { rows, errors };
  }
}

/**
 * Agrupa linhas por CPF do motorista
 */
export function groupByMotorista(rows: ParsedImportRow[]): GroupedMotorista[] {
  const grouped = new Map<string, GroupedMotorista>();

  for (const row of rows) {
    if (!grouped.has(row.cpfNormalizado)) {
      grouped.set(row.cpfNormalizado, {
        cpf: row.cpfNormalizado,
        cpfFormatado: formatCPF(row.cpfNormalizado),
        nome: row.condutor,
        matricula: row.matricula,
        operacao: row.operacao,
        cargo: row.cargo,
        linhas: [],
      });
    }

    grouped.get(row.cpfNormalizado)!.linhas.push(row);
  }

  return Array.from(grouped.values());
}
