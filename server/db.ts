import { eq, and, gte, lte, desc, asc, inArray } from "drizzle-orm";
import { drizzle } from "drizzle-orm/mysql2";
import {
  InsertUser,
  users,
  emailAllowlist,
  imports,
  journeys,
  recurrences,
  treatments,
  configurations,
  emailLogs,
  aiInsights,
  suggestedActions,
  type Journey,
  type Treatment,
  type Recurrence,
  type Configuration,
} from "../drizzle/schema";
import { ENV } from "./_core/env";

let _db: ReturnType<typeof drizzle> | null = null;

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

// ============ AUTH ============

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
      values.role = "admin";
      updateSet.role = "admin";
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

  const result = await db
    .select()
    .from(users)
    .where(eq(users.openId, openId))
    .limit(1);

  return result.length > 0 ? result[0] : undefined;
}

// ============ EMAIL ALLOWLIST ============

export async function isEmailAllowed(email: string): Promise<boolean> {
  const db = await getDb();
  if (!db) return false;

  const result = await db
    .select()
    .from(emailAllowlist)
    .where(eq(emailAllowlist.email, email))
    .limit(1);

  return result.length > 0;
}

export async function addEmailToAllowlist(email: string): Promise<void> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  await db.insert(emailAllowlist).values({ email }).onDuplicateKeyUpdate({
    set: { email },
  });
}

// ============ IMPORTS ============

export async function getLastImport() {
  const db = await getDb();
  if (!db) return null;

  const result = await db
    .select()
    .from(imports)
    .orderBy(desc(imports.importedAt))
    .limit(1);

  return result.length > 0 ? result[0] : null;
}

export async function createImport(data: {
  fileName: string;
  fileHash: string;
  rowCount: number;
  newRowsCount: number;
  importedBy: number;
}) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  const result = await db.insert(imports).values(data);
  return result;
}

export async function getImportHistory(limit: number = 20) {
  const db = await getDb();
  if (!db) return [];

  return db
    .select()
    .from(imports)
    .orderBy(desc(imports.importedAt))
    .limit(limit);
}

// ============ JOURNEYS ============

export async function createJourneys(journeyList: typeof journeys.$inferInsert[]) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  return db.insert(journeys).values(journeyList);
}

export async function getJourneysByDate(data: Date) {
  const db = await getDb();
  if (!db) return [];

  const startOfDay = new Date(data);
  startOfDay.setHours(0, 0, 0, 0);
  const endOfDay = new Date(data);
  endOfDay.setHours(23, 59, 59, 999);

  return db
    .select()
    .from(journeys)
    .where(and(gte(journeys.data, startOfDay), lte(journeys.data, endOfDay)))
    .orderBy(asc(journeys.conductorName));
}

export async function getJourneysByDateRange(startDate: Date, endDate: Date) {
  const db = await getDb();
  if (!db) return [];

  return db
    .select()
    .from(journeys)
    .where(and(gte(journeys.data, startDate), lte(journeys.data, endDate)))
    .orderBy(desc(journeys.data), asc(journeys.conductorName));
}

export async function getJourneysByConductor(
  conductorName: string,
  startDate: Date,
  endDate: Date
) {
  const db = await getDb();
  if (!db) return [];

  return db
    .select()
    .from(journeys)
    .where(
      and(
        eq(journeys.conductorName, conductorName),
        gte(journeys.data, startDate),
        lte(journeys.data, endDate)
      )
    )
    .orderBy(desc(journeys.data));
}

// ============ RECURRENCES ============

export async function upsertRecurrence(data: typeof recurrences.$inferInsert) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  return db
    .insert(recurrences)
    .values(data)
    .onDuplicateKeyUpdate({
      set: {
        ocorPoucoJanela: data.ocorPoucoJanela,
        ocorPouco30d: data.ocorPouco30d,
        ocorHeJanela: data.ocorHeJanela,
        ocorHe30d: data.ocorHe30d,
        updatedAt: new Date(),
      },
    });
}

export async function getRecurrence(conductorName: string, data: Date) {
  const db = await getDb();
  if (!db) return null;

  const result = await db
    .select()
    .from(recurrences)
    .where(
      and(
        eq(recurrences.conductorName, conductorName),
        eq(recurrences.data, data)
      )
    )
    .limit(1);

  return result.length > 0 ? result[0] : null;
}

// ============ TREATMENTS ============

export async function upsertTreatment(data: typeof treatments.$inferInsert) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  return db
    .insert(treatments)
    .values(data)
    .onDuplicateKeyUpdate({
      set: {
        status: data.status,
        observacao: data.observacao,
        atualizadoPor: data.atualizadoPor,
        atualizadoEm: new Date(),
      },
    });
}

export async function getTreatment(journeyId: number, tipo: string) {
  const db = await getDb();
  if (!db) return null;

  const result = await db
    .select()
    .from(treatments)
    .where(
      and(eq(treatments.journeyId, journeyId), eq(treatments.tipo, tipo as any))
    )
    .limit(1);

  return result.length > 0 ? result[0] : null;
}

export async function getTreatmentsByDateRange(startDate: Date, endDate: Date) {
  const db = await getDb();
  if (!db) return [];

  return db
    .select()
    .from(treatments)
    .where(and(gte(treatments.data, startDate), lte(treatments.data, endDate)))
    .orderBy(desc(treatments.data));
}

// ============ CONFIGURATIONS ============

export async function getConfigurations(): Promise<Configuration> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  const result = await db.select().from(configurations).limit(1);

  if (result.length > 0) {
    return result[0];
  }

  // Criar configuração padrão se não existir
  const defaults = {
    limitePoucoRodadoMin: 120,
    limiteHeAlertaMin: 90,
    janelaReincidenciaDias: 7,
    janelaCronicoDias: 30,
    thresholdPoucoRodado1: 1,
    thresholdPoucoRodado2: 2,
    thresholdPoucoRodado3: 3,
    thresholdPouco30d: 5,
    thresholdHe30d: 5,
  };

  await db.insert(configurations).values(defaults);
  return { ...defaults, id: 1, atualizadoEm: new Date(), criadoEm: new Date() };
}

export async function updateConfigurations(data: Partial<Configuration>) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  const config = await db.select().from(configurations).limit(1);
  const configId = config.length > 0 ? config[0].id : 1;

  return db
    .update(configurations)
    .set({ ...data, atualizadoEm: new Date() })
    .where(eq(configurations.id, configId));
}

// ============ SUGGESTED ACTIONS ============

export async function createSuggestedActions(
  actions: typeof suggestedActions.$inferInsert[]
) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  return db.insert(suggestedActions).values(actions);
}

export async function getSuggestedActionsByDate(data: Date) {
  const db = await getDb();
  if (!db) return [];

  const startOfDay = new Date(data);
  startOfDay.setHours(0, 0, 0, 0);
  const endOfDay = new Date(data);
  endOfDay.setHours(23, 59, 59, 999);

  return db
    .select()
    .from(suggestedActions)
    .where(and(gte(suggestedActions.data, startOfDay), lte(suggestedActions.data, endOfDay)))
    .orderBy(desc(suggestedActions.severidade), desc(suggestedActions.data));
}

// ============ EMAIL LOGS ============

export async function createEmailLog(data: typeof emailLogs.$inferInsert) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  return db.insert(emailLogs).values(data);
}

export async function getEmailLogsByStatus(status: string) {
  const db = await getDb();
  if (!db) return [];

  return db
    .select()
    .from(emailLogs)
    .where(eq(emailLogs.status, status as any))
    .orderBy(asc(emailLogs.criadoEm));
}

export async function updateEmailLogStatus(
  id: number,
  status: string,
  enviadoEm?: Date
) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  return db
    .update(emailLogs)
    .set({
      status: status as any,
      enviadoEm: enviadoEm || new Date(),
    })
    .where(eq(emailLogs.id, id));
}

// ============ AI INSIGHTS ============

export async function createAiInsight(data: typeof aiInsights.$inferInsert) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  return db.insert(aiInsights).values(data);
}

export async function getAiInsightsByConductor(
  conductorName: string,
  limit: number = 10
) {
  const db = await getDb();
  if (!db) return [];

  return db
    .select()
    .from(aiInsights)
    .where(eq(aiInsights.conductorName, conductorName))
    .orderBy(desc(aiInsights.criadoEm))
    .limit(limit);
}
