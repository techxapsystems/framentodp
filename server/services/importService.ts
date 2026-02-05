import * as XLSX from "xlsx";
import { createHash } from "crypto";
import { getConfigurations, getDb } from "../db";
import type { InsertJourney } from "../../drizzle/schema";

/**
 * Mapeia strings de tempo (HH:MM ou HH:MM:SS) para minutos
 */
export function timeStringToMinutes(timeStr: string | null | undefined): number {
  if (!timeStr || timeStr === "-" || timeStr === "") return 0;

  const trimmed = String(timeStr).trim();
  if (trimmed === "-" || trimmed === "") return 0;

  try {
    const parts = trimmed.split(":").map((p) => parseInt(p, 10));
    if (parts.length === 2) {
      return parts[0] * 60 + parts[1];
    } else if (parts.length === 3) {
      return parts[0] * 60 + parts[1] + Math.floor(parts[2] / 60);
    }
  } catch {
    return 0;
  }

  return 0;
}

/**
 * Converte string de data para Date
 */
export function parseDate(dateStr: string | null | undefined): Date | null {
  if (!dateStr || dateStr === "-" || dateStr === "") return null;

  try {
    const trimmed = String(dateStr).trim();
    // Tenta formato DD/MM/YYYY
    const match = trimmed.match(/(\d{1,2})\/(\d{1,2})\/(\d{4})/);
    if (match) {
      const [, day, month, year] = match;
      return new Date(parseInt(year), parseInt(month) - 1, parseInt(day));
    }

    // Tenta ISO format
    const date = new Date(trimmed);
    if (!isNaN(date.getTime())) {
      return date;
    }
  } catch {
    return null;
  }

  return null;
}

/**
 * Detecta automaticamente a aba com dados brutos
 */
function detectDataSheet(workbook: XLSX.WorkBook): XLSX.WorkSheet | null {
  // Preferir "1_DADOS_BRUTOS"
  if (workbook.SheetNames.includes("1_DADOS_BRUTOS")) {
    return workbook.Sheets["1_DADOS_BRUTOS"];
  }

  // Procurar por aba que contenha as colunas esperadas
  const expectedColumns = [
    "Condutor",
    "Data",
    "Tempo Total Dirigido",
    "Horas Extras 50%",
    "Horas Extras 100%",
  ];

  for (const sheetName of workbook.SheetNames) {
    const sheet = workbook.Sheets[sheetName];
    const data = XLSX.utils.sheet_to_json(sheet, { defval: "" });

    if (data.length > 0) {
      const firstRow = data[0] as Record<string, unknown>;
      const hasAllColumns = expectedColumns.every((col) => col in firstRow);

      if (hasAllColumns) {
        return sheet;
      }
    }
  }

  return null;
}

/**
 * Normaliza uma linha do Excel em Journey
 */
function normalizeJourneyRow(
  row: Record<string, unknown>,
  importId: number,
  config: any
): InsertJourney {
  const conductorName = String(row["Condutor"] || "").trim();
  const gestorName = String(row["Gestor"] || "").trim() || null;
  const operacao = String(row["Operação"] || "").trim() || null;
  const cargo = String(row["Cargo"] || "").trim() || null;
  const placa = String(row["Placa"] || "").trim() || null;

  // Datas e tempos
  const data = parseDate(String(row["Data"] || ""));
  const inicioJornada = parseDate(String(row["Início Jornada"] || ""));
  const fimJornada = parseDate(String(row["Fim Jornada"] || ""));

  // Tempos em minutos
  const dirigidoMin = timeStringToMinutes(String(row["Tempo Total Dirigido"] || ""));
  const he50Min = timeStringToMinutes(String(row["Horas Extras 50%"] || ""));
  const he100Min = timeStringToMinutes(String(row["Horas Extras 100%"] || ""));
  const heMin = he50Min + he100Min;
  const tempoEsperaMin = timeStringToMinutes(String(row["Tempo Espera"] || ""));
  const tempoDescansoMin = timeStringToMinutes(
    String(row["Tempo Total Descanso"] || "")
  );

  // Flags - OCIOSIDADE: jornada > 10h E direcao < 2h (120 min)
  const jornada = inicioJornada && fimJornada 
    ? (fimJornada.getTime() - inicioJornada.getTime()) / (1000 * 60) 
    : 0;
  const ocioso = jornada > 600 && dirigidoMin < 120;
  const poucoRodado = ocioso;
  const temHe = heMin > 0;
  const heAlerta = heMin >= config.limiteHeAlertaMin;

  const tratativaOperacional = String(row["Tratativa operacional"] || "").trim() || null;

  return {
    importId,
    conductorName,
    gestorName,
    operacao,
    cargo,
    placa,
    data: data || new Date(),
    inicioJornada,
    fimJornada,
    dirigidoMin,
    he50Min,
    he100Min,
    heMin,
    tempoEsperaMin,
    tempoDescansoMin,
    poucoRodado,
    temHe,
    heAlerta,
    tratativaOperacional,
    rawData: JSON.stringify(row),
  };
}

/**
 * Calcula hash MD5 do arquivo
 */
function calculateFileHash(buffer: Buffer): string {
  return createHash("md5").update(buffer).digest("hex");
}

/**
 * Interface para resultado de importação
 */
export interface ImportResult {
  success: boolean;
  message: string;
  totalRows: number;
  newRows: number;
  newJourneys: InsertJourney[];
  error?: string;
}

/**
 * Importa Excel incrementalmente
 * - Detecta última importação
 * - Lê apenas linhas novas baseado em row_count
 * - Normaliza dados
 * - Retorna journeys para inserção
 */
export async function importExcelIncremental(
  buffer: Buffer,
  fileName: string
): Promise<ImportResult> {
  try {
    const workbook = XLSX.read(buffer);
    const sheet = detectDataSheet(workbook);

    if (!sheet) {
      return {
        success: false,
        message: "Nenhuma aba com dados encontrada",
        totalRows: 0,
        newRows: 0,
        newJourneys: [],
        error: "Sheet not found",
      };
    }

    // Ler todos os dados
    const allData = XLSX.utils.sheet_to_json(sheet, { defval: "" });
    const totalRows = allData.length;

    // Obter última importação
    const db = await getDb();
    if (!db) {
      return {
        success: false,
        message: "Banco de dados indisponível",
        totalRows,
        newRows: 0,
        newJourneys: [],
        error: "Database not available",
      };
    }

    const lastImport = await db
      .select()
      .from(await import("../../drizzle/schema").then((m) => m.imports))
      .orderBy(
        (await import("../../drizzle/schema").then((m) => m.imports)).importedAt
      )
      .limit(1);

    const lastRowCount = lastImport.length > 0 ? lastImport[0].rowCount : 0;

    // Validar se arquivo não ficou menor
    if (totalRows < lastRowCount) {
      return {
        success: false,
        message: `Arquivo contém ${totalRows} linhas, mas última importação tinha ${lastRowCount}. Possível erro de dados.`,
        totalRows,
        newRows: 0,
        newJourneys: [],
        error: "File size decreased",
      };
    }

    // Extrair linhas novas
    const newRowsData = allData.slice(lastRowCount);
    const newRowsCount = newRowsData.length;

    if (newRowsCount === 0) {
      return {
        success: true,
        message: "Nenhuma linha nova para importar",
        totalRows,
        newRows: 0,
        newJourneys: [],
      };
    }

    // Normalizar linhas novas
    const config = await getConfigurations();
    const newJourneys = newRowsData.map((row: any, idx: number) =>
      normalizeJourneyRow(row as Record<string, unknown>, 0, config)
    );

    return {
      success: true,
      message: `${newRowsCount} nova(s) linha(s) detectada(s)`,
      totalRows,
      newRows: newRowsCount,
      newJourneys,
    };
  } catch (error) {
    console.error("[ImportService] Error:", error);
    return {
      success: false,
      message: "Erro ao processar arquivo",
      totalRows: 0,
      newRows: 0,
      newJourneys: [],
      error: String(error),
    };
  }
}

/**
 * Valida estrutura do Excel
 */
export function validateExcelStructure(buffer: Buffer): {
  valid: boolean;
  message: string;
  sheetName?: string;
} {
  try {
    const workbook = XLSX.read(buffer);
    const sheet = detectDataSheet(workbook);

    if (!sheet) {
      return {
        valid: false,
        message: "Nenhuma aba com as colunas esperadas encontrada",
      };
    }

    const data = XLSX.utils.sheet_to_json(sheet, { defval: "" });

    if (data.length === 0) {
      return {
        valid: false,
        message: "Aba selecionada está vazia",
      };
    }

    const expectedColumns = [
      "Condutor",
      "Data",
      "Tempo Total Dirigido",
      "Horas Extras 50%",
      "Horas Extras 100%",
    ];

    const firstRow = data[0] as Record<string, unknown>;
    const missingColumns = expectedColumns.filter((col) => !(col in firstRow));

    if (missingColumns.length > 0) {
      return {
        valid: false,
        message: `Colunas obrigatórias faltando: ${missingColumns.join(", ")}`,
      };
    }

    return {
      valid: true,
      message: "Estrutura válida",
      sheetName: Object.keys(workbook.Sheets)[0],
    };
  } catch (error) {
    return {
      valid: false,
      message: `Erro ao validar: ${String(error)}`,
    };
  }
}
