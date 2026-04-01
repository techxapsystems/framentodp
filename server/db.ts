import { drizzle } from "drizzle-orm/mysql2";
import { InsertUser, users, journeys, recurrences, warnings, imports, configurations, orientations, warningPdfHistory, conductors, InsertConductor } from "../drizzle/schema";
import { ENV } from './_core/env';
import { eq, gte, lte, and, desc, inArray, like, or } from "drizzle-orm";

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
    await db
      .insert(users)
      .values(user)
      .onDuplicateKeyUpdate({
        set: {
          name: user.name,
          email: user.email,
          lastSignedIn: new Date(),
        },
      });
  } catch (error) {
    console.error("[Database] Error upserting user:", error);
    throw error;
  }
}

export async function getUser(openId: string) {
  const db = await getDb();
  if (!db) return null;

  try {
    const result = await db
      .select()
      .from(users)
      .where(eq(users.openId, openId))
      .limit(1);
    return result[0] || null;
  } catch (error) {
    console.error("[Database] Error getting user:", error);
    return null;
  }
}

export async function getConductors() {
  const db = await getDb();
  if (!db) return [];

  try {
    return await db.select().from(conductors);
  } catch (error) {
    console.error("[Database] Error getting conductors:", error);
    return [];
  }
}

export async function getConductorByName(name: string) {
  const db = await getDb();
  if (!db) return null;

  try {
    const result = await db
      .select()
      .from(conductors)
      .where(eq(conductors.nome, name))
      .limit(1);
    return result[0] || null;
  } catch (error) {
    console.error("[Database] Error getting conductor:", error);
    return null;
  }
}

export async function createConductor(data: InsertConductor) {
  const db = await getDb();
  if (!db) return null;

  try {
    const result = await db.insert(conductors).values(data);
    return result;
  } catch (error) {
    console.error("[Database] Error creating conductor:", error);
    return null;
  }
}

export async function getWarnings() {
  const db = await getDb();
  if (!db) return [];

  try {
    return await db.select().from(warnings);
  } catch (error) {
    console.error("[Database] Error getting warnings:", error);
    return [];
  }
}

export async function getWarningById(id: number) {
  const db = await getDb();
  if (!db) return null;

  try {
    const result = await db
      .select()
      .from(warnings)
      .where(eq(warnings.id, id))
      .limit(1);
    return result[0] || null;
  } catch (error) {
    console.error("[Database] Error getting warning:", error);
    return null;
  }
}

export async function createWarning(data: any) {
  const db = await getDb();
  if (!db) return null;

  try {
    const result = await db.insert(warnings).values(data);
    return result;
  } catch (error) {
    console.error("[Database] Error creating warning:", error);
    return null;
  }
}

export async function updateWarning(id: number, data: any) {
  const db = await getDb();
  if (!db) return null;

  try {
    const result = await db
      .update(warnings)
      .set(data)
      .where(eq(warnings.id, id));
    return result;
  } catch (error) {
    console.error("[Database] Error updating warning:", error);
    return null;
  }
}

export async function deleteWarning(id: number) {
  const db = await getDb();
  if (!db) return null;

  try {
    const result = await db
      .delete(warnings)
      .where(eq(warnings.id, id));
    return result;
  } catch (error) {
    console.error("[Database] Error deleting warning:", error);
    return null;
  }
}

export async function getWarningsByType(type: string) {
  const db = await getDb();
  if (!db) return [];

  try {
    return await db
      .select()
      .from(warnings)
      .where(eq(warnings.tipo, type as any));
  } catch (error) {
    console.error("[Database] Error getting warnings by type:", error);
    return [];
  }
}

export async function getWarningsByCategory(category: string) {
  const db = await getDb();
  if (!db) return [];

  try {
    return await db
      .select()
      .from(warnings)
      .where(eq(warnings.categoria, category as any));
  } catch (error) {
    console.error("[Database] Error getting warnings by category:", error);
    return [];
  }
}

export async function getWarningsByConductor(conductorName: string) {
  const db = await getDb();
  if (!db) return [];

  try {
    return await db
      .select()
      .from(warnings)
      .where(eq(warnings.conductorName, conductorName));
  } catch (error) {
    console.error("[Database] Error getting warnings by conductor:", error);
    return [];
  }
}

export async function getWarningsByDateRange(startDate: Date, endDate: Date) {
  const db = await getDb();
  if (!db) return [];

  try {
    const endOfDay = new Date(endDate);
    endOfDay.setHours(23, 59, 59, 999);

    return await db
      .select()
      .from(warnings)
      .where(
        and(
          gte(warnings.criadoEm, startDate),
          lte(warnings.criadoEm, endOfDay)
        )
      );
  } catch (error) {
    console.error("[Database] Error getting warnings by date range:", error);
    return [];
  }
}

export async function getSignedWarnings() {
  const db = await getDb();
  if (!db) return [];

  try {
    return await db
      .select()
      .from(warnings)
      .where(eq(warnings.advertenciaAplicada, true));
  } catch (error) {
    console.error("[Database] Error getting signed warnings:", error);
    return [];
  }
}

export async function getPendingWarnings() {
  const db = await getDb();
  if (!db) return [];

  try {
    return await db
      .select()
      .from(warnings)
      .where(eq(warnings.advertenciaAplicada, false));
  } catch (error) {
    console.error("[Database] Error getting pending warnings:", error);
    return [];
  }
}

export async function signOffWarning(id: number, signedAt: Date = new Date()) {
  const db = await getDb();
  if (!db) return null;

  try {
    const result = await db
      .update(warnings)
      .set({
        advertenciaAplicada: true,
        dataAplicacao: signedAt,
      })
      .where(eq(warnings.id, id));
    return result;
  } catch (error) {
    console.error("[Database] Error signing off warning:", error);
    return null;
  }
}

export async function getConductorWarnings(conductorIdOrName: string | number) {
  const db = await getDb();
  if (!db) return [];

  try {
    let allWarnings: any[] = [];
    
    // If it's a number, search by ID; if it's a string, search by name
    if (typeof conductorIdOrName === 'number') {
      // Get conductor name by ID first
      const conductor = await db
        .select()
        .from(conductors)
        .where(eq(conductors.id, conductorIdOrName))
        .limit(1);
      
      if (conductor.length === 0) return [];
      
      allWarnings = await db
        .select()
        .from(warnings)
        .where(eq(warnings.conductorName, conductor[0].nome));
    } else {
      allWarnings = await db
        .select()
        .from(warnings)
        .where(eq(warnings.conductorName, conductorIdOrName));
    }

    // Map the warnings to match the expected interface
    return allWarnings.map((w: any) => ({
      id: w.id,
      conductorName: w.conductorName,
      categoria: w.categoria,
      criadoEm: w.criadoEm,
      assinada: w.advertenciaAplicada,
      descricao: w.descricao,
    }));
  } catch (error) {
    console.error("[Database] Error getting conductor warnings:", error);
    return [];
  }
}

export async function listConductors(search?: string) {
  const db = await getDb();
  if (!db) return [];

  try {
    let query = db.select().from(conductors);
    
    if (search) {
      // Search by name, CPF, or operation
      const searchTerm = `%${search}%`;
      query = query.where(
        or(
          like(conductors.nome, searchTerm),
          like(conductors.cpf, searchTerm),
          like(conductors.operacao, searchTerm)
        )
      ) as any;
    }
    
    return await query;
  } catch (error) {
    console.error("[Database] Error listing conductors:", error);
    return [];
  }
}

export async function getImportById(id: number) {
  const db = await getDb();
  if (!db) return null;

  try {
    const result = await db
      .select()
      .from(imports)
      .where(eq(imports.id, id))
      .limit(1);
    return result[0] || null;
  } catch (error) {
    console.error("[Database] Error getting import:", error);
    return null;
  }
}

export async function createImport(data: any) {
  const db = await getDb();
  if (!db) return null;

  try {
    const result = await db.insert(imports).values(data);
    return result;
  } catch (error) {
    console.error("[Database] Error creating import:", error);
    return null;
  }
}

export async function getConfigurations() {
  const db = await getDb();
  if (!db) return [];

  try {
    return await db.select().from(configurations);
  } catch (error) {
    console.error("[Database] Error getting configurations:", error);
    return [];
  }
}

export async function getConfigurationByKey(key: string) {
  const db = await getDb();
  if (!db) return null;

  try {
    const result = await db
      .select()
      .from(configurations)
      .where(eq(configurations.chave, key))
      .limit(1);
    return result[0] || null;
  } catch (error) {
    console.error("[Database] Error getting configuration:", error);
    return null;
  }
}

export async function createConfiguration(data: any) {
  const db = await getDb();
  if (!db) return null;

  try {
    const result = await db.insert(configurations).values(data);
    return result;
  } catch (error) {
    console.error("[Database] Error creating configuration:", error);
    return null;
  }
}

export async function updateConfiguration(key: string, data: any) {
  const db = await getDb();
  if (!db) return null;

  try {
    const result = await db
      .update(configurations)
      .set(data)
      .where(eq(configurations.chave, key));
    return result;
  } catch (error) {
    console.error("[Database] Error updating configuration:", error);
    return null;
  }
}

export async function getWarningPdfHistories() {
  const db = await getDb();
  if (!db) return [];

  try {
    return await db.select().from(warningPdfHistory);
  } catch (error) {
    console.error("[Database] Error getting warning PDF histories:", error);
    return [];
  }
}

export async function createWarningPdfHistory(data: any) {
  const db = await getDb();
  if (!db) return null;

  try {
    const result = await db.insert(warningPdfHistory).values(data);
    return result;
  } catch (error) {
    console.error("[Database] Error creating warning PDF history:", error);
    return null;
  }
}

/**
 * Obter estatísticas de advertências
 */
export async function getWarningsStats(params: {
  startDate?: Date;
  endDate?: Date;
  operacao?: string;
}) {
  const db = await getDb();
  if (!db) return null;

  try {
    let conditions: any[] = [];

    // Filtrar por data se fornecido
    if (params.startDate) {
      conditions.push(gte(warnings.criadoEm, params.startDate));
    }
    if (params.endDate) {
      const endOfDay = new Date(params.endDate);
      endOfDay.setHours(23, 59, 59, 999);
      conditions.push(lte(warnings.criadoEm, endOfDay));
    }

    let query = db.select().from(warnings);
    if (conditions.length > 0) {
      query = query.where(and(...conditions)) as any;
    }

    const allWarnings = await query;

    // Se filtrar por operação, buscar dados dos motoristas
    let filteredWarnings = allWarnings;
    if (params.operacao && params.operacao !== 'all') {
      const conductorsData = await db.select().from(conductors);
      const conductorsByOp = conductorsData.filter((c: any) => c.operacao === params.operacao);
      const conductorNames = conductorsByOp.map((c: any) => c.nome);
      filteredWarnings = allWarnings.filter((w: any) => conductorNames.includes(w.conductorName));
    }

    // Contar assinadas vs não assinadas
    const assinadas = filteredWarnings.filter((w: any) => w.advertenciaAplicada).length;
    const naoAssinadas = filteredWarnings.length - assinadas;
    const taxaDevolucao = filteredWarnings.length > 0 ? (naoAssinadas / filteredWarnings.length) * 100 : 0;

    return {
      total: filteredWarnings.length,
      assinadas,
      naoAssinadas,
      taxaDevolucao: parseFloat(taxaDevolucao.toFixed(1)),
      warnings: filteredWarnings,
    };
  } catch (error) {
    console.error("[DB] Error getting warnings stats:", error);
    return null;
  }
}

/**
 * Obter tendência de advertências por período
 */
export async function getWarningsTrend(params: {
  startDate: Date;
  endDate: Date;
  groupBy: "day" | "week" | "month";
  operacao?: string;
}) {
  const db = await getDb();
  if (!db) return [];

  try {
    // Placeholder - retorna array vazio
    return [];
  } catch (error) {
    console.error("[DB] Error getting warnings trend:", error);
    return [];
  }
}

/**
 * Obter advertências agrupadas por operação
 */
export async function getWarningsByOperation(params: {
  startDate?: Date;
  endDate?: Date;
}) {
  const db = await getDb();
  if (!db) return [];

  try {
    // Placeholder - retorna array vazio
    return [];
  } catch (error) {
    console.error("[DB] Error getting warnings by operation:", error);
    return [];
  }
}


/**
 * Obter estatísticas de advertências por operação (agrupado por tipo)
 */
export async function getWarningsStatsByOperation(params?: {
  startDate?: Date;
  endDate?: Date;
  operacao?: string;
}) {
  const db = await getDb();
  if (!db) return [];

  try {
    // Buscar todas as advertências com as datas filtradas
    let conditions: any[] = [];

    if (params?.startDate) {
      conditions.push(gte(warnings.criadoEm, params.startDate));
    }
    if (params?.endDate) {
      const endOfDay = new Date(params.endDate);
      endOfDay.setHours(23, 59, 59, 999);
      conditions.push(lte(warnings.criadoEm, endOfDay));
    }

    let query = db.select().from(warnings);
    if (conditions.length > 0) {
      query = query.where(and(...conditions)) as any;
    }

    const allWarnings = await query;

    // Buscar informação de operação dos motoristas
    const conductorsData = await db.select().from(conductors);
    const conductorMap = new Map(conductorsData.map((c: any) => [c.nome, c.operacao]));

    // Agrupar por operação
    const grouped: Record<string, any> = {};
    allWarnings.forEach((warning: any) => {
      const operacao = conductorMap.get(warning.conductorName) || "Desconhecido";
      
      // Filtrar por operação se fornecido
      if (params?.operacao && params.operacao !== 'all' && operacao !== params.operacao) {
        return;
      }

      if (!grouped[operacao]) {
        grouped[operacao] = {
          operacao: operacao,
          total: 0,
          assinadas: 0,
          naoAssinadas: 0,
        };
      }
      grouped[operacao].total++;
      if (warning.advertenciaAplicada) {
        grouped[operacao].assinadas++;
      } else {
        grouped[operacao].naoAssinadas++;
      }
    });

    return Object.values(grouped);
  } catch (error) {
    console.error("[DB] Error getting warnings stats by operation:", error);
    return [];
  }
}

/**
 * Obter orientações por motorista
 */
export async function getOrientationsByDriver(driverId: number) {
  const db = await getDb();
  if (!db) return [];

  try {
    return [];
  } catch (error) {
    console.error("[DB] Error getting orientations by driver:", error);
    return [];
  }
}

/**
 * Contar orientações
 */
export async function countOrientations() {
  const db = await getDb();
  if (!db) return 0;

  try {
    return 0;
  } catch (error) {
    console.error("[DB] Error counting orientations:", error);
    return 0;
  }
}

/**
 * Obter todas as operações
 */
export async function getAllOperations() {
  const db = await getDb();
  if (!db) return [];

  try {
    const conductorsData = await db.select().from(conductors);
    const operations = new Set(conductorsData.map((c: any) => c.operacao));
    return Array.from(operations).map((op: string) => ({ id: op, nome: op }));
  } catch (error) {
    console.error("[DB] Error getting all operations:", error);
    return [];
  }
}


/**
 * Obter relatório de advertências
 */
export async function getWarningsReport() {
  const db = await getDb();
  if (!db) return [];

  try {
    return [];
  } catch (error) {
    console.error("[DB] Error getting warnings report:", error);
    return [];
  }
}

/**
 * Obter estatísticas de advertências por motorista
 */
export async function getWarningsStatsByDriver() {
  const db = await getDb();
  if (!db) return [];

  try {
    const allWarnings = await db.select().from(warnings);
    
    const grouped: Record<string, any> = {};
    allWarnings.forEach((warning: any) => {
      const motorista = warning.conductorName || "Desconhecido";
      if (!grouped[motorista]) {
        grouped[motorista] = {
          motorista: motorista,
          aviso1: 0,
          aviso2: 0,
          aviso3: 0,
          total: 0,
        };
      }
      grouped[motorista].total++;
    });

    return Object.values(grouped);
  } catch (error) {
    console.error("[DB] Error getting warnings stats by driver:", error);
    return [];
  }
}


export async function getConductorById(id: number) {
  const db = await getDb();
  if (!db) return null;
  try {
    const result = await db
      .select()
      .from(conductors)
      .where(eq(conductors.id, id))
      .limit(1);
    return result[0] || null;
  } catch (error) {
    console.error("[DB] Error getting conductor by ID:", error);
    return null;
  }
}


export async function getAllPendingWarnings() {
  const db = await getDb();
  if (!db) return [];
  try {
    const result = await db
      .select()
      .from(warnings)
      .where(eq(warnings.advertenciaAplicada, false))
      .orderBy(desc(warnings.criadoEm));
    return result;
  } catch (error) {
    console.error("[DB] Error getting all pending warnings:", error);
    return [];
  }
}
