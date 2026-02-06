import XLSX from "xlsx";
import { getDb, getConfigurations } from "../db";
import { journeys as journeysTable, imports } from "../../drizzle/schema";
import { createHash } from "crypto";
import { desc } from "drizzle-orm";
import type { InsertJourney, Configuration } from "../../drizzle/schema";

/**
 * Detecta aba com dados no workbook
 */
function detectDataSheet(workbook: XLSX.WorkBook): XLSX.WorkSheet | null {
  const sheetNames = workbook.SheetNames;
  
  // Procurar por abas com padrão comum
  for (const name of sheetNames) {
    if (name.toLowerCase().includes("dados") || 
        name.toLowerCase().includes("brutos") ||
        name.toLowerCase().includes("raw")) {
      return workbook.Sheets[name];
    }
  }
  
  // Usar primeira aba se nenhuma corresponder
  return workbook.Sheets[sheetNames[0]] || null;
}

/**
 * Converte string de tempo (HH:MM ou H:MM) para minutos
 */
function timeStringToMinutes(timeStr: string): number {
  if (!timeStr || typeof timeStr !== "string") return 0;
  
  const trimmed = timeStr.trim();
  if (!trimmed) return 0;
  
  const parts = trimmed.split(":");
  if (parts.length < 2) return 0;
  
  const hours = parseInt(parts[0], 10) || 0;
  const minutes = parseInt(parts[1], 10) || 0;
  
  return hours * 60 + minutes;
}

/**
 * Parse data com múltiplos formatos
 */
function parseDate(dateStr: string): Date | null {
  if (!dateStr || typeof dateStr !== "string") return null;
  
  const trimmed = dateStr.trim();
  if (!trimmed) return null;
  
  // Tentar parse direto
  const parsed = new Date(trimmed);
  if (!isNaN(parsed.getTime())) return parsed;
  
  // Tentar formato DD/MM/YYYY
  const match = trimmed.match(/(\d{1,2})\/(\d{1,2})\/(\d{4})/);
  if (match) {
    const day = parseInt(match[1], 10);
    const month = parseInt(match[2], 10) - 1;
    const year = parseInt(match[3], 10);
    return new Date(year, month, day);
  }
  
  return null;
}

/**
 * Normaliza uma linha de jornada
 */
function normalizeJourneyRow(
  row: Record<string, unknown>,
  importId: number,
  config: Configuration
): InsertJourney {
  // Dados do motorista
  const conductorName = String(row["Condutor"] || "").trim() || "Desconhecido";
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
 * Importa Excel incrementalmente com otimizações
 * - Detecta última importação
 * - Lê apenas linhas novas baseado em row_count
 * - Normaliza dados
 * - Retorna journeys para inserção em batch
 */
export async function importExcelIncremental(
  buffer: Buffer,
  fileName: string
): Promise<ImportResult> {
  try {
    // Ler workbook
    const workbook = XLSX.read(buffer, { type: 'buffer' });
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

    // Query otimizada: apenas pegar rowCount da última importação
    const lastImportResult = await db
      .select({ rowCount: imports.rowCount })
      .from(imports)
      .orderBy(desc(imports.importedAt))
      .limit(1);

    const lastRowCount = lastImportResult.length > 0 ? lastImportResult[0].rowCount : 0;

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

    // Normalizar linhas novas em paralelo (chunks de 100)
    const config = await getConfigurations();
    const CHUNK_SIZE = 100;
    const newJourneys: InsertJourney[] = [];

    for (let i = 0; i < newRowsData.length; i += CHUNK_SIZE) {
      const chunk = newRowsData.slice(i, i + CHUNK_SIZE);
      const normalizedChunk = chunk.map((row: any) =>
        normalizeJourneyRow(row as Record<string, unknown>, 0, config)
      );
      newJourneys.push(...normalizedChunk);
    }

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
    const workbook = XLSX.read(buffer, { type: 'buffer' });
    const sheet = detectDataSheet(workbook);

    if (!sheet) {
      return {
        valid: false,
        message: "Nenhuma aba com dados encontrada",
      };
    }

    // Ler primeira linha para validar colunas
    const data = XLSX.utils.sheet_to_json(sheet, { defval: "" });
    if (data.length === 0) {
      return {
        valid: false,
        message: "Arquivo vazio",
      };
    }

    // Validar colunas obrigatórias
    const requiredColumns = [
      "Condutor",
      "Data",
      "Tempo Total Dirigido",
    ];

    const firstRow = data[0] as Record<string, unknown>;
    const missingColumns = requiredColumns.filter(col => !firstRow[col]);

    if (missingColumns.length > 0) {
      return {
        valid: false,
        message: `Colunas obrigatórias faltando: ${missingColumns.join(", ")}`,
      };
    }

    return {
      valid: true,
      message: "Arquivo válido",
      sheetName: detectDataSheet(workbook) ? "Dados encontrados" : "Desconhecido",
    };
  } catch (error) {
    return {
      valid: false,
      message: `Erro ao validar: ${String(error)}`,
    };
  }
}

// Exportar funções para testes
export { normalizeJourneyRow, timeStringToMinutes, parseDate };
