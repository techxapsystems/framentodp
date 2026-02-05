import { eq, and, gte, lte, desc, inArray, or } from "drizzle-orm";
import { drizzle } from "drizzle-orm/mysql2";
import { InsertUser, users, journeys, recurrences, warnings, imports, configurations } from "../drizzle/schema";
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
    .orderBy(desc(imports.criadoEm))
    .limit(1);
  
  return result.length > 0 ? result[0].rowCount : 0;
}

export async function createImportLog(rowCount: number, status: string) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  
  await db.insert(imports).values({
    rowCount,
    status,
    criadoEm: new Date(),
  });
}

export async function getReincidentsWithWarnings() {
  const db = await getDb();
  if (!db) return [];
  
  // Buscar advertências já registradas
  const allWarnings = await db.select().from(warnings);
  const warningsByDriver = new Map<string, any[]>();
  for (const w of allWarnings) {
    if (!warningsByDriver.has(w.conductorName)) {
      warningsByDriver.set(w.conductorName, []);
    }
    warningsByDriver.get(w.conductorName)!.push(w);
  }
  
  // Buscar TODOS os motoristas com jornadas "pouco rodado" (ociosos)
  // Independente de ter reincidências ou não
  const ociosJourneys = await db
    .select()
    .from(journeys)
    .where(eq(journeys.poucoRodado, true));
  
  // Agrupar motoristas únicos
  const motoristasUnicos = new Set<string>();
  const ultimaJornadaPorMotorista = new Map<string, any>();
  
  for (const j of ociosJourneys) {
    motoristasUnicos.add(j.conductorName);
    const existing = ultimaJornadaPorMotorista.get(j.conductorName);
    if (!existing || new Date(j.data) > new Date(existing.data)) {
      ultimaJornadaPorMotorista.set(j.conductorName, j);
    }
  }
  
  // Buscar reincidências para cada motorista
  const grouped = new Map<string, any>();
  
  for (const conductorName of motoristasUnicos) {
    const journey = ultimaJornadaPorMotorista.get(conductorName)!;
    
    // Buscar reincidências se existirem
    const recurrenceData = await db
      .select()
      .from(recurrences)
      .where(eq(recurrences.conductorName, conductorName))
      .orderBy(desc(recurrences.data))
      .limit(1);
    
    const rec = recurrenceData.length > 0 ? recurrenceData[0] : null;
    
    grouped.set(conductorName, {
      conductorName,
      placa: journey.placa || "N/A",
      avisosPoucoRodado: 0,
      avisosHorasExtras: 0,
      ultimoAviso: rec?.data || journey.data,
      historico: warningsByDriver.get(conductorName) || [],
      reincidencias: rec ? {
        poucoRodado7d: rec.ocorPoucoJanela,
        poucoRodado30d: rec.ocorPouco30d,
        horasExtras7d: rec.ocorHeJanela,
        horasExtras30d: rec.ocorHe30d,
      } : {
        poucoRodado7d: 0,
        poucoRodado30d: 0,
        horasExtras7d: 0,
        horasExtras30d: 0,
      },
    });
  }
  
  // Calcular nível de aviso baseado em reincidências
  for (const item of grouped.values()) {
    const r = item.reincidencias;
    if (r.poucoRodado7d >= 2 || r.poucoRodado30d >= 3) {
      item.avisosPoucoRodado = r.poucoRodado30d >= 3 ? 3 : (r.poucoRodado7d >= 2 ? 2 : 1);
    }
    if (r.horasExtras7d >= 2 || r.horasExtras30d >= 3) {
      item.avisosHorasExtras = r.horasExtras30d >= 3 ? 3 : (r.horasExtras7d >= 2 ? 2 : 1);
    }
  }
  
  return Array.from(grouped.values()).sort(
    (a, b) => new Date(b.ultimoAviso).getTime() - new Date(a.ultimoAviso).getTime()
  );
}


export async function getImportHistory() {
  const db = await getDb();
  if (!db) return [];
  
  const result = await db
    .select()
    .from(imports)
    .orderBy(desc(imports.criadoEm))
    .limit(20);
  
  return result;
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

export async function createWarning(data: any) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  
  const result = await db.insert(warnings).values({
    conductorName: data.conductorName,
    tipo: data.tipo,
    nivelAdvertencia: data.nivelAdvertencia,
    motivo: data.motivo,
    observacao: data.observacao,
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
  
  let query = db
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
    query = query.where(inArray(journeys.gestor, gestores));
  }
  
  if (operacoes && operacoes.length > 0) {
    query = query.where(inArray(journeys.operacao, operacoes));
  }
  
  const result = await query;
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
export async function createImport(rowCount: number, status: string) {
  return createImportLog(rowCount, status);
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
