import { eq, and, gte, lte, or, desc } from "drizzle-orm";
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

// TODO: add feature queries here as your schema grows.

export async function createJourneys(data: any[]) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  const BATCH_SIZE = 500;
  for (let i = 0; i < data.length; i += BATCH_SIZE) {
    const batch = data.slice(i, i + BATCH_SIZE);
    await db.insert(journeys).values(batch as any).onDuplicateKeyUpdate({
      set: {
        tempoTotalDirigido: journeys.tempoTotalDirigido,
        poucoRodado: journeys.poucoRodado,
        temHe: journeys.temHe,
        heAlerta: journeys.heAlerta,
      },
    });
  }
}

export async function getLastImportRowCount() {
  const db = await getDb();
  if (!db) return 0;

  const result = await db
    .select({ rowCount: journeys.rowCount })
    .from(journeys)
    .orderBy(desc(journeys.data))
    .limit(1);

  return result.length > 0 ? result[0].rowCount : 0;
}

export async function getReincidentsWithWarnings() {
  const db = await getDb();
  if (!db) return [];
  
  // Buscar reincidências (motoristas com múltiplas ocorrências)
  const reincurrences = await db
    .select()
    .from(recurrences)
    .where(
      or(
        gte(recurrences.ocorPoucoJanela, 2),
        gte(recurrences.ocorPouco30d, 3),
        gte(recurrences.ocorHeJanela, 2),
        gte(recurrences.ocorHe30d, 3)
      )
    )
    .orderBy(desc(recurrences.data));
  
  // Buscar advertências já registradas
  const allWarnings = await db.select().from(warnings);
  const warningsByDriver = new Map<string, any[]>();
  for (const w of allWarnings) {
    if (!warningsByDriver.has(w.conductorName)) {
      warningsByDriver.set(w.conductorName, []);
    }
    warningsByDriver.get(w.conductorName)!.push(w);
  }
  
  // Agrupar reincidências por motorista
  const grouped = new Map<string, any>();
  for (const r of reincurrences) {
    if (!grouped.has(r.conductorName)) {
      grouped.set(r.conductorName, {
        conductorName: r.conductorName,
        avisosPoucoRodado: 0,
        avisosHorasExtras: 0,
        ultimoAviso: r.data,
        historico: warningsByDriver.get(r.conductorName) || [],
        reincidencias: {
          poucoRodado7d: r.ocorPoucoJanela,
          poucoRodado30d: r.ocorPouco30d,
          horasExtras7d: r.ocorHeJanela,
          horasExtras30d: r.ocorHe30d,
        },
      });
    }
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
  
  const imports = await db
    .select()
    .from(journeys)
    .orderBy(desc(journeys.data))
    .limit(100);
  
  return imports;
}

export async function getLastImport() {
  const db = await getDb();
  if (!db) return null;
  
  const result = await db
    .select()
    .from(journeys)
    .orderBy(desc(journeys.data))
    .limit(1);
  
  return result.length > 0 ? result[0] : null;
}

export async function getConfigurations() {
  const db = await getDb();
  if (!db) return {};
  
  const result = await db.select().from(configurations).limit(1);
  return result.length > 0 ? result[0] : {};
}


export async function createImport(data: any) {
  const db = await getDb();
  if (!db) return null;
  
  const result = await db.insert(imports).values(data);
  return result;
}

export async function updateConfigurations(data: any) {
  const db = await getDb();
  if (!db) return null;
  
  const result = await db.insert(configurations).values(data).onDuplicateKeyUpdate({
    set: data,
  });
  return result;
}

export async function createWarning(data: any) {
  const db = await getDb();
  if (!db) return null;
  
  const result = await db.insert(warnings).values(data);
  return result;
}
