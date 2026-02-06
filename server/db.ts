import { eq, and, gte, lte, desc, inArray, or, isNotNull, count } from "drizzle-orm";
import { drizzle } from "drizzle-orm/mysql2";
import { InsertUser, users, journeys, recurrences, warnings, imports, configurations, orientations, warningPdfHistory } from "../drizzle/schema";
import { ENV } from './_core/env';

let _db: ReturnType<typeof drizzle> | null = null;

// Lazily create the drizzle instance so local tooling can run without a DB.
export async function getDb() {
  if (!_db && process.env.DATABASE_URL) {
    try {
      _db = drizzle(process.env.DATABASE_URL);
    } catch (error) {
      console.warn("[Database] Failed to connect:", error);
      _db = null;
    }
  }
  return _db;
}

export async function upsertUser(user: InsertUser): Promise<void> {
  if (!user.openId) {
    throw new Error("User openId is required for upsert");
  }

  const db = await getDb();
  if (!db) {
    console.warn("[Database] Cannot upsert user: database not available");
    return;
  }

  try {
    const values: InsertUser = {
      openId: user.openId,
    };
    const updateSet: Record<string, unknown> = {};

    const textFields = ["name", "email", "loginMethod"] as const;
    type TextField = (typeof textFields)[number];

    const assignNullable = (field: TextField) => {
      const value = user[field];
      if (value === undefined) return;
      const normalized = value ?? null;
      values[field] = normalized;
      updateSet[field] = normalized;
    };

    textFields.forEach(assignNullable);

    if (user.lastSignedIn !== undefined) {
      values.lastSignedIn = user.lastSignedIn;
      updateSet.lastSignedIn = user.lastSignedIn;
    }
    if (user.role !== undefined) {
      values.role = user.role;
      updateSet.role = user.role;
    } else if (user.openId === ENV.ownerOpenId) {
      values.role = 'admin';
      updateSet.role = 'admin';
    }

    if (!values.lastSignedIn) {
      values.lastSignedIn = new Date();
    }

    if (Object.keys(updateSet).length === 0) {
      updateSet.lastSignedIn = new Date();
    }

    await db.insert(users).values(values).onDuplicateKeyUpdate({
      set: updateSet,
    });
  } catch (error) {
    console.error("[Database] Failed to upsert user:", error);
    throw error;
  }
}

export async function getUserByOpenId(openId: string) {
  const db = await getDb();
  if (!db) {
    console.warn("[Database] Cannot get user: database not available");
    return undefined;
  }

  const result = await db.select().from(users).where(eq(users.openId, openId)).limit(1);

  return result.length > 0 ? result[0] : undefined;
}

export async function createJourneys(data: any[]) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  
  // Batch insert em chunks de 500
  const chunkSize = 500;
  for (let i = 0; i < data.length; i += chunkSize) {
    const chunk = data.slice(i, i + chunkSize);
    await db.insert(journeys).values(chunk);
  }
}

export async function getLastImportRowCount() {
  const db = await getDb();
  if (!db) return 0;
  
  const result = await db
    .select({ rowCount: imports.rowCount })
    .from(imports)
    .orderBy(desc(imports.importedAt))
    .limit(1);
  
  return result.length > 0 ? result[0].rowCount : 0;
}

export async function createImportLog(data: { fileName: string; fileHash: string; rowCount: number; newRowsCount: number; importedBy: string }) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  
  const result = await db.insert(imports).values({
    fileName: data.fileName,
    fileHash: data.fileHash,
    rowCount: data.rowCount,
    newRowsCount: data.newRowsCount,
    importedBy: data.importedBy,
  });
  
  return result;
}

export async function getReincidentsWithWarnings() {
  const db = await getDb();
  if (!db) return [];
  
  // Buscar APENAS motoristas que têm advertências registradas
  const allWarnings = await db.select().from(warnings);
  
  if (allWarnings.length === 0) {
    return [];
  }
  
  const motoristasComAdvertencias = new Set(allWarnings.map(w => w.conductorName));
  const warningsByDriver = new Map<string, any[]>();
  
  for (const w of allWarnings) {
    if (!warningsByDriver.has(w.conductorName)) {
      warningsByDriver.set(w.conductorName, []);
    }
    warningsByDriver.get(w.conductorName)!.push(w);
  }
  
  // Buscar dados dos motoristas com advertências
  const grouped = new Map<string, any>();
  
  for (const conductorName of Array.from(motoristasComAdvertencias)) {
    // Buscar última jornada do motorista
    const journeyData = await db
      .select()
      .from(journeys)
      .where(eq(journeys.conductorName, conductorName))
      .orderBy(desc(journeys.data))
      .limit(1);
    
    const journey = journeyData.length > 0 ? journeyData[0] : null;
    
    // Buscar reincidências
    const recurrenceData = await db
      .select()
      .from(recurrences)
      .where(eq(recurrences.conductorName, conductorName))
      .orderBy(desc(recurrences.data))
      .limit(1);
    
    const rec = recurrenceData.length > 0 ? recurrenceData[0] : null;
    
    // Calcular nível máximo de aviso por tipo
    const driverWarnings = warningsByDriver.get(conductorName) || [];
    const avisosPoucoRodado = Math.max(
      ...driverWarnings
        .filter(w => w.tipo === "pouco_rodado")
        .map(w => w.nivelAdvertencia),
      0
    );
    const avisosHorasExtras = Math.max(
      ...driverWarnings
        .filter(w => w.tipo === "horas_extras")
        .map(w => w.nivelAdvertencia),
      0
    );
    
    grouped.set(conductorName, {
      conductorName,
      placa: journey?.placa || "N/A",
      avisosPoucoRodado,
      avisosHorasExtras,
      ultimoAviso:
        driverWarnings.length > 0
          ? new Date(
              Math.max(
                ...driverWarnings.map(w => new Date(w.criadoEm).getTime())
              )
            )
          : journey?.data,
      historico: driverWarnings,
      reincidencias: rec
        ? {
            poucoRodado7d: rec.ocorPoucoJanela,
            poucoRodado30d: rec.ocorPouco30d,
            horasExtras7d: rec.ocorHeJanela,
            horasExtras30d: rec.ocorHe30d,
          }
        : {
            poucoRodado7d: 0,
            poucoRodado30d: 0,
            horasExtras7d: 0,
            horasExtras30d: 0,
          },
    });
  }
  
  return Array.from(grouped.values()).sort(
    (a, b) =>
      new Date(b.ultimoAviso).getTime() - new Date(a.ultimoAviso).getTime()
  );
}


/**
 * Busca TODOS os motoristas com jornadas ociosas (pouco rodado)
 * Usado para o dialog de nova advertencia
 */
export async function getAllIdleDrivers() {
  const db = await getDb();
  if (!db) return [];
  
  // Buscar todos os motoristas com jornadas "pouco rodado" (ociosos)
  const ociosJourneys = await db
    .select()
    .from(journeys)
    .where(eq(journeys.poucoRodado, true));
  
  // Agrupar motoristas unicos com ultima jornada
  const motoristasUnicos = new Map<string, any>();
  
  for (const j of ociosJourneys) {
    const existing = motoristasUnicos.get(j.conductorName);
    if (!existing || new Date(j.data) > new Date(existing.data)) {
      motoristasUnicos.set(j.conductorName, {
        conductorName: j.conductorName,
        placa: j.placa || "N/A",
        data: j.data,
        operacao: j.operacao || "N/A",
      });
    }
  }
  
  return Array.from(motoristasUnicos.values()).sort(
    (a, b) => new Date(b.data).getTime() - new Date(a.data).getTime()
  );
}

export async function getImportHistory() {
  const db = await getDb();
  if (!db) return [];
  
  const result = await db
    .select()
    .from(imports)
    .orderBy(desc(imports.importedAt))
    .limit(20);
  
  return result;
}

export async function updateWarning(warningId: number, data: any) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  
  await db
    .update(warnings)
    .set({
      tipo: data.tipo,
      nivelAdvertencia: data.nivelAdvertencia,
      motivo: data.motivo,
      observacao: data.observacao,
    })
    .where(eq(warnings.id, warningId));
}

export async function updateWarningStatus(warningId: number, advertenciaGerada: boolean, advertenciaAplicada: boolean, dataAplicacao?: Date) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  
  await db
    .update(warnings)
    .set({
      advertenciaGerada,
      advertenciaAplicada,
      dataAplicacao: advertenciaAplicada ? (dataAplicacao || new Date()) : null,
    })
    .where(eq(warnings.id, warningId));
}

/**
 * Busca advertências para relatório com filtros
 */
export async function getWarningsReport(filters: any) {
  const db = await getDb();
  if (!db) return [];
  
  let query: any = db.select().from(warnings);
  
  // Filtrar por data
  if (filters.dateStart) {
    const startDate = new Date(filters.dateStart);
    startDate.setHours(0, 0, 0, 0);
    query = query.where(gte(warnings.criadoEm, startDate));
  }
  
  if (filters.dateEnd) {
    const endDate = new Date(filters.dateEnd);
    endDate.setHours(23, 59, 59, 999);
    query = query.where(lte(warnings.criadoEm, endDate));
  }
  
  // Filtrar por motorista
  if (filters.conductorName) {
    query = query.where(eq(warnings.conductorName, filters.conductorName));
  }
  
  // Filtrar por tipo
  if (filters.tipo) {
    query = query.where(eq(warnings.tipo, filters.tipo as any));
  }
  
  return query.orderBy(desc(warnings.criadoEm)) as any;
}

export async function createWarning(data: any) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  
  const result = await db.insert(warnings).values({
    conductorName: data.conductorName,
    tipo: data.tipo,
    nivelAdvertencia: data.nivelAdvertencia,
    motivo: data.motivo,
    observacao: data.observacao || "",
    aplicadoPor: data.aplicadoPor,
    advertenciaGerada: true,
    advertenciaAplicada: false,
    criadoEm: new Date(),
  });
  
  return result;
}

export async function getWarningsByConductor(conductorName: string) {
  const db = await getDb();
  if (!db) return [];
  
  const result = await db
    .select()
    .from(warnings)
    .where(eq(warnings.conductorName, conductorName))
    .orderBy(desc(warnings.criadoEm));
  
  return result;
}

export async function getTodayData(dateFrom: Date, dateTo: Date, gestores?: string[], operacoes?: string[]) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  
  let query: any = db
    .select()
    .from(journeys)
    .where(
      and(
        gte(journeys.data, dateFrom),
        lte(journeys.data, dateTo),
        eq(journeys.poucoRodado, true)
      )
    );
  
  if (gestores && gestores.length > 0) {
    query = query.where(inArray(journeys.gestorName, gestores));
  }
  
  if (operacoes && operacoes.length > 0) {
    query = query.where(inArray(journeys.operacao, operacoes));
  }
  
  const result = await query as any[];
  return result;
}

export async function getConfigurations() {
  const db = await getDb();
  if (!db) return null;
  
  const result = await db.select().from(configurations).limit(1);
  return result.length > 0 ? result[0] : null;
}

export async function updateConfiguration(data: any) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  
  const existing = await getConfigurations();
  
  if (existing) {
    await db
      .update(configurations)
      .set(data)
      .where(eq(configurations.id, existing.id));
  } else {
    await db.insert(configurations).values(data);
  }
}

// Aliases para compatibilidade
export async function createImport(data: { fileName: string; fileHash: string; rowCount: number; newRowsCount: number; importedBy: string }) {
  return createImportLog(data);
}

export async function getLastImport() {
  return getLastImportRowCount();
}

export async function updateConfigurations(data: any) {
  return updateConfiguration(data);
}


// Estatísticas de advertências por motorista
export async function getWarningsStatsByDriver() {
  const db = await getDb();
  if (!db) return [];
  
  const allWarnings = await db.select().from(warnings);
  
  const statsByDriver = new Map<string, { motorista: string; total: number; aviso1: number; aviso2: number; aviso3: number }>();
  
  for (const w of allWarnings) {
    if (!statsByDriver.has(w.conductorName)) {
      statsByDriver.set(w.conductorName, {
        motorista: w.conductorName,
        total: 0,
        aviso1: 0,
        aviso2: 0,
        aviso3: 0,
      });
    }
    
    const stats = statsByDriver.get(w.conductorName)!;
    stats.total++;
    
    if (w.nivelAdvertencia === 1) stats.aviso1++;
    else if (w.nivelAdvertencia === 2) stats.aviso2++;
    else if (w.nivelAdvertencia === 3) stats.aviso3++;
  }
  
  return Array.from(statsByDriver.values()).sort((a, b) => b.total - a.total);
}

// Estatísticas de advertências por operação
export async function getWarningsStatsByOperation() {
  const db = await getDb();
  if (!db) return [];
  
  const allWarnings = await db.select().from(warnings);
  const allJourneys = await db.select().from(journeys);
  
  // Criar mapa de motorista -> operação
  const operacaoByDriver = new Map<string, string>();
  for (const j of allJourneys) {
    if (!operacaoByDriver.has(j.conductorName)) {
      operacaoByDriver.set(j.conductorName, j.operacao || "Desconhecida");
    }
  }
  
  const statsByOperation = new Map<string, { operacao: string; total: number; aviso1: number; aviso2: number; aviso3: number }>();
  
  for (const w of allWarnings) {
    const operacao = operacaoByDriver.get(w.conductorName) || "Desconhecida";
    
    if (!statsByOperation.has(operacao)) {
      statsByOperation.set(operacao, {
        operacao,
        total: 0,
        aviso1: 0,
        aviso2: 0,
        aviso3: 0,
      });
    }
    
    const stats = statsByOperation.get(operacao)!;
    stats.total++;
    
    if (w.nivelAdvertencia === 1) stats.aviso1++;
    else if (w.nivelAdvertencia === 2) stats.aviso2++;
    else if (w.nivelAdvertencia === 3) stats.aviso3++;
  }
  
  return Array.from(statsByOperation.values()).sort((a, b) => b.total - a.total);
}


/**
 * Registrar uma orientação para um motorista
 * Na 3ª orientação, gera automaticamente uma Advertência (Aviso 1)
 */
export async function createOrientation(data: any) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  
  // Contar orientações anteriores ANTES de inserir
  const previousOrientations = await db
    .select()
    .from(orientations)
    .where(
      and(
        eq(orientations.conductorName, data.conductorName),
        eq(orientations.tipo, data.tipo)
      )
    );
  
  // Inserir orientação
  await db.insert(orientations).values({
    conductorName: data.conductorName,
    tipo: data.tipo,
    motivo: data.motivo,
    orientadoPor: data.orientadoPor,
    criadoEm: new Date(),
  });
  
  // Se chegou a 3 orientações (contadas ANTES de inserir), gerar advertência automática
  if (previousOrientations.length === 2) { // 2 anteriores + 1 nova = 3 total
    await db.insert(warnings).values({
      conductorName: data.conductorName,
      tipo: data.tipo,
      nivelAdvertencia: 1, // Aviso 1
      motivo: `Advertência automática gerada após 3 orientações. Motivo: ${data.motivo}`,
      observacao: "Gerada automaticamente após 3 orientações",
      aplicadoPor: data.orientadoPor,
      advertenciaGerada: true,
      advertenciaAplicada: false,
      geradaAutomaticamente: true,
      criadoEm: new Date(),
    });
  }
}

/**
 * Obter orientações de um motorista
 */
export async function getOrientationsByConductor(conductorName: string) {
  const db = await getDb();
  if (!db) return [];
  
  const result = await db
    .select()
    .from(orientations)
    .where(eq(orientations.conductorName, conductorName))
    .orderBy(desc(orientations.criadoEm));
  
  return result;
}

/**
 * Contar orientações por motorista e tipo
 */
export async function countOrientations(conductorName: string, tipo: string) {
  const db = await getDb();
  if (!db) return 0;
  
  const result = await db
    .select()
    .from(orientations)
    .where(
      and(
        eq(orientations.conductorName, conductorName),
        eq(orientations.tipo, tipo as any)
      )
    );
  
  return result.length;
}


/**
 * Obter estatísticas de advertências por período e operação
 */
export async function getWarningsStats(filters: {
  startDate?: Date;
  endDate?: Date;
  operacao?: string;
}) {
  const db = await getDb();
  if (!db) return null;

  try {
    const conditions = [];
    
    if (filters.startDate) {
      conditions.push(gte(warnings.criadoEm, filters.startDate));
    }
    if (filters.endDate) {
      conditions.push(lte(warnings.criadoEm, filters.endDate));
    }

    let query: any = db.select().from(warnings);
    
    if (conditions.length > 0) {
      query = query.where(and(...conditions));
    }

    const allWarnings = await query as any[];

    // Filtrar por operação se necessário (através de join com journeys)
    let filteredWarnings = allWarnings;
    if (filters.operacao) {
      const journeysWithOp = await db
        .select()
        .from(journeys)
        .where(eq(journeys.operacao, filters.operacao));
      
      const conductorNamesWithOp = new Set(
        journeysWithOp.map(j => j.conductorName)
      );
      
      filteredWarnings = allWarnings.filter(w =>
        conductorNamesWithOp.has(w.conductorName)
      );
    }

    // Calcular estatísticas
    const total = filteredWarnings.length;
    const assinadas = filteredWarnings.filter(w => w.assinada).length;
    const naoAssinadas = total - assinadas;
    const taxaDevolucao = total > 0 ? Math.round((assinadas / total) * 100) : 0;

    return {
      total,
      assinadas,
      naoAssinadas,
      taxaDevolucao,
      warnings: filteredWarnings,
    };
  } catch (error) {
    console.error("[DB] Error getting warnings stats:", error);
    return null;
  }
}

/**
 * Obter advertências agrupadas por período (dia/semana/mês)
 */
export async function getWarningsTrend(filters: {
  startDate: Date;
  endDate: Date;
  groupBy: "day" | "week" | "month";
  operacao?: string;
}) {
  const db = await getDb();
  if (!db) return [];

  try {
    const conditions = [
      gte(warnings.criadoEm, filters.startDate),
      lte(warnings.criadoEm, filters.endDate),
    ];

    let query: any = db.select().from(warnings);
    
    if (conditions.length > 0) {
      query = query.where(and(...conditions));
    }

    const allWarnings = await query as any[];

    // Filtrar por operação se necessário
    let filteredWarnings = allWarnings;
    if (filters.operacao) {
      const journeysWithOp = await db
        .select()
        .from(journeys)
        .where(eq(journeys.operacao, filters.operacao));
      
      const conductorNamesWithOp = new Set(
        journeysWithOp.map(j => j.conductorName)
      );
      
      filteredWarnings = allWarnings.filter(w =>
        conductorNamesWithOp.has(w.conductorName)
      );
    }

    // Agrupar por período
    const grouped: Record<string, { total: number; assinadas: number }> = {};

    filteredWarnings.forEach(warning => {
      const date = new Date(warning.criadoEm);
      let key: string;

      if (filters.groupBy === "day") {
        key = date.toISOString().split("T")[0];
      } else if (filters.groupBy === "week") {
        const weekStart = new Date(date);
        weekStart.setDate(date.getDate() - date.getDay());
        key = weekStart.toISOString().split("T")[0];
      } else {
        key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;
      }

      if (!grouped[key]) {
        grouped[key] = { total: 0, assinadas: 0 };
      }
      grouped[key].total++;
      if (warning.assinada) {
        grouped[key].assinadas++;
      }
    });

    return Object.entries(grouped)
      .map(([period, data]) => ({
        period,
        total: data.total,
        assinadas: data.assinadas,
        naoAssinadas: data.total - data.assinadas,
        taxaDevolucao: data.total > 0 ? Math.round((data.assinadas / data.total) * 100) : 0,
      }))
      .sort((a, b) => a.period.localeCompare(b.period));
  } catch (error) {
    console.error("[DB] Error getting warnings trend:", error);
    return [];
  }
}

/**
 * Obter advertências por operação
 */
export async function getWarningsByOperation(filters: {
  startDate?: Date;
  endDate?: Date;
}) {
  const db = await getDb();
  if (!db) return [];

  try {
    const conditions = [];
    
    if (filters.startDate) {
      conditions.push(gte(warnings.criadoEm, filters.startDate));
    }
    if (filters.endDate) {
      conditions.push(lte(warnings.criadoEm, filters.endDate));
    }

    let query: any = db.select().from(warnings);
    
    if (conditions.length > 0) {
      query = query.where(and(...conditions));
    }

    const allWarnings = await query as any[];

    // Agrupar por operação
    const grouped: Record<string, { total: number; assinadas: number }> = {};

    for (const warning of allWarnings) {
      const journey = await db
        .select()
        .from(journeys)
        .where(eq(journeys.conductorName, warning.conductorName))
        .limit(1);

      const operacao = journey[0]?.operacao || "Desconhecida";

      if (!grouped[operacao]) {
        grouped[operacao] = { total: 0, assinadas: 0 };
      }
      grouped[operacao].total++;
      if (warning.advertenciaAplicada) {
        grouped[operacao].assinadas++;
      }
    }

    return Object.entries(grouped)
      .map(([operacao, data]) => ({
        operacao,
        total: data.total,
        assinadas: data.assinadas,
        naoAssinadas: data.total - data.assinadas,
        taxaDevolucao: data.total > 0 ? Math.round((data.assinadas / data.total) * 100) : 0,
      }))
      .sort((a, b) => b.total - a.total);
  } catch (error) {
    console.error("[DB] Error getting warnings by operation:", error);
    return [];
  }
}

/**
 * Obter todas as operações únicas
 */
export async function getAllOperations() {
  const db = await getDb();
  if (!db) return [];

  try {
    const result = await db
      .selectDistinct({ operacao: journeys.operacao })
      .from(journeys)
      .where(isNotNull(journeys.operacao));

    return result
      .map(r => r.operacao)
      .filter((op): op is string => op !== null)
      .sort();
  } catch (error) {
    console.error("[DB] Error getting operations:", error);
    return [];
  }
}


/**
 * Salvar PDF no histórico de auditoria
 */
export async function savePdfHistory(data: {
  warningId: number;
  conductorName: string;
  licensePlate: string;
  operacao: string;
  pdfUrl: string;
  pdfKey: string;
  fileSize: number;
  geradoPor: string;
}) {
  const db = await getDb();
  if (!db) {
    console.warn("[Database] Cannot save PDF history: database not available");
    return null;
  }

  try {
    const result = await db.insert(warningPdfHistory).values(data);
    return result;
  } catch (error) {
    console.error("[DB] Error saving PDF history:", error);
    throw error;
  }
}

/**
 * Obter histórico de PDFs de uma advertência
 */
export async function getPdfHistoryByWarningId(warningId: number) {
  const db = await getDb();
  if (!db) return [];

  try {
    const result = await db
      .select()
      .from(warningPdfHistory)
      .where(eq(warningPdfHistory.warningId, warningId))
      .orderBy(desc(warningPdfHistory.criadoEm));

    return result;
  } catch (error) {
    console.error("[DB] Error getting PDF history:", error);
    return [];
  }
}

/**
 * Obter histórico de PDFs de um motorista
 */
export async function getPdfHistoryByDriver(conductorName: string) {
  const db = await getDb();
  if (!db) return [];

  try {
    const result = await db
      .select()
      .from(warningPdfHistory)
      .where(eq(warningPdfHistory.conductorName, conductorName))
      .orderBy(desc(warningPdfHistory.criadoEm));

    return result;
  } catch (error) {
    console.error("[DB] Error getting PDF history by driver:", error);
    return [];
  }
}

/**
 * Obter histórico de PDFs com filtros
 */
export async function getPdfHistoryFiltered(filters: {
  conductorName?: string;
  startDate?: Date;
  endDate?: Date;
  operacao?: string;
}) {
  const db = await getDb();
  if (!db) return [];

  try {
    let query: any = db.select().from(warningPdfHistory);
    const conditions: any[] = [];

    if (filters.conductorName) {
      conditions.push(eq(warningPdfHistory.conductorName, filters.conductorName));
    }

    if (filters.operacao) {
      conditions.push(eq(warningPdfHistory.operacao, filters.operacao));
    }

    if (filters.startDate) {
      conditions.push(gte(warningPdfHistory.criadoEm, filters.startDate));
    }

    if (filters.endDate) {
      conditions.push(lte(warningPdfHistory.criadoEm, filters.endDate));
    }

    if (conditions.length > 0) {
      query = query.where(and(...conditions));
    }

    const result = await query.orderBy(desc(warningPdfHistory.criadoEm));
    return result as any[];
  } catch (error) {
    console.error("[DB] Error getting filtered PDF history:", error);
    return [];
  }
}

/**
 * Contar PDFs gerados por período
 */
export async function countPdfsByPeriod(startDate: Date, endDate: Date) {
  const db = await getDb();
  if (!db) return 0;

  try {
    const result = await db
      .select({ count: count() })
      .from(warningPdfHistory)
      .where(
        and(
          gte(warningPdfHistory.criadoEm, startDate),
          lte(warningPdfHistory.criadoEm, endDate)
        )
      );

    return result[0]?.count || 0;
  } catch (error) {
    console.error("[DB] Error counting PDFs:", error);
    return 0;
  }
}
