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

    if (user.role) {
      values.role = user.role;
      updateSet.role = user.role;
    }

    if (user.departamento) {
      values.departamento = user.departamento;
      updateSet.departamento = user.departamento;
    }

    if (user.setor) {
      values.setor = user.setor;
      updateSet.setor = user.setor;
    }

    if (user.modulos) {
      values.modulos = user.modulos;
      updateSet.modulos = user.modulos;
    }

    if (user.status) {
      values.status = user.status;
      updateSet.status = user.status;
    }

    await db
      .insert(users)
      .values(values)
      .onDuplicateKeyUpdate({
        set: updateSet,
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
      .where(eq(users.openId, openId));
    return result[0] || null;
  } catch (error) {
    console.error("[Database] Error getting user:", error);
    return null;
  }
}

export async function getOrCreateUser(openId: string, name?: string, email?: string) {
  const existing = await getUser(openId);
  if (existing) return existing;

  await upsertUser({
    openId,
    name,
    email,
  });

  return getUser(openId);
}

export async function getAllUsers() {
  const db = await getDb();
  if (!db) return [];

  try {
    return await db.select().from(users);
  } catch (error) {
    console.error("[Database] Error getting all users:", error);
    return [];
  }
}

export async function updateUser(openId: string, updates: Partial<InsertUser>) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  try {
    await db.update(users).set(updates).where(eq(users.openId, openId));
  } catch (error) {
    console.error("[Database] Error updating user:", error);
    throw error;
  }
}

export async function deleteUser(openId: string) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  try {
    await db.delete(users).where(eq(users.openId, openId));
  } catch (error) {
    console.error("[Database] Error deleting user:", error);
    throw error;
  }
}

export async function getJourneys(userId: number) {
  const db = await getDb();
  if (!db) return [];

  try {
    return await db.select().from(journeys).where(eq(journeys.userId, userId));
  } catch (error) {
    console.error("[Database] Error getting journeys:", error);
    return [];
  }
}

export async function createJourney(
  userId: number,
  data: {
    startTime: Date;
    endTime?: Date;
    distance?: number;
    status?: string;
  }
) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  try {
    await db.insert(journeys).values({
      userId,
      startTime: data.startTime,
      endTime: data.endTime,
      distance: data.distance,
      status: data.status || "active",
    });
  } catch (error) {
    console.error("[Database] Error creating journey:", error);
    throw error;
  }
}

export async function getRecurrences(userId: number) {
  const db = await getDb();
  if (!db) return [];

  try {
    return await db
      .select()
      .from(recurrences)
      .where(eq(recurrences.userId, userId));
  } catch (error) {
    console.error("[Database] Error getting recurrences:", error);
    return [];
  }
}

export async function createRecurrence(
  userId: number,
  data: {
    type: string;
    frequency: string;
    startDate: Date;
    endDate?: Date;
  }
) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  try {
    await db.insert(recurrences).values({
      userId,
      type: data.type,
      frequency: data.frequency,
      startDate: data.startDate,
      endDate: data.endDate,
    });
  } catch (error) {
    console.error("[Database] Error creating recurrence:", error);
    throw error;
  }
}

export async function getWarnings(limit = 100, offset = 0) {
  const db = await getDb();
  if (!db) return [];

  try {
    return await db
      .select()
      .from(warnings)
      .limit(limit)
      .offset(offset)
      .orderBy(desc(warnings.criadoEm));
  } catch (error) {
    console.error("[Database] Error getting warnings:", error);
    return [];
  }
}

export async function getWarningById(id: number) {
  const db = await getDb();
  if (!db) return null;

  try {
    const result = await db.select().from(warnings).where(eq(warnings.id, id));
    return result[0] || null;
  } catch (error) {
    console.error("[Database] Error getting warning:", error);
    return null;
  }
}

export async function getWarningsByConductor(conductorName: string) {
  const db = await getDb();
  if (!db) return [];

  try {
    return await db
      .select()
      .from(warnings)
      .where(eq(warnings.conductorName, conductorName))
      .orderBy(desc(warnings.criadoEm));
  } catch (error) {
    console.error("[Database] Error getting warnings by conductor:", error);
    return [];
  }
}

export async function getReincidentsWithWarnings() {
  const db = await getDb();
  if (!db) return [];

  try {
    const result = await db
      .select()
      .from(warnings)
      .where(isNotNull(warnings.conductorName))
      .orderBy(desc(warnings.criadoEm));

    const grouped: Record<string, any> = {};
    result.forEach((warning: any) => {
      if (!grouped[warning.conductorName]) {
        grouped[warning.conductorName] = {
          conductorName: warning.conductorName,
          warnings: [],
          maxLevel: 0,
          categoryCounts: {},
        };
      }
      grouped[warning.conductorName].warnings.push(warning);
      grouped[warning.conductorName].maxLevel = Math.max(
        grouped[warning.conductorName].maxLevel,
        warning.nivelAdvertencia || 0
      );

      const cat = warning.categoria || "unknown";
      grouped[warning.conductorName].categoryCounts[cat] =
        (grouped[warning.conductorName].categoryCounts[cat] || 0) + 1;
    });

    return Object.values(grouped);
  } catch (error) {
    console.error("[Database] Error getting reincidents:", error);
    return [];
  }
}

export async function createWarning(data: any) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  try {
    await db.insert(warnings).values({
      conductorName: data.conductorName,
      tipo: data.tipo,
      categoria: data.categoria || "pouco_rodado",
      nivelAdvertencia: data.nivelAdvertencia,
      motivo: data.motivo,
      observacao: data.observacao || "",
      aplicadoPor: data.aplicadoPor,
      advertenciaGerada: true,
      advertenciaAplicada: false,
      criadoEm: new Date(),
    });

    // Buscar a advertência criada para obter o ID
    const created = await db
      .select()
      .from(warnings)
      .where(eq(warnings.conductorName, data.conductorName))
      .orderBy(desc(warnings.id))
      .limit(1);

    if (!created || created.length === 0) {
      throw new Error("Falha ao criar advertência");
    }

    return { success: true, id: created[0].id, message: "Advertência criada com sucesso" };
  } catch (error) {
    console.error("[Database] Error creating warning:", error);
    throw error;
  }
}

export async function updateWarning(id: number, updates: any) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  try {
    await db.update(warnings).set(updates).where(eq(warnings.id, id));
  } catch (error) {
    console.error("[Database] Error updating warning:", error);
    throw error;
  }
}

export async function deleteWarning(id: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  try {
    await db.delete(warnings).where(eq(warnings.id, id));
  } catch (error) {
    console.error("[Database] Error deleting warning:", error);
    throw error;
  }
}

export async function getWarningTemplates() {
  const db = await getDb();
  if (!db) return [];

  try {
    const result = await db.select().from(warningPdfHistory);
    return result;
  } catch (error) {
    console.error("[Database] Error getting warning templates:", error);
    return [];
  }
}

export async function createWarningPdfHistory(data: any) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  try {
    await db.insert(warningPdfHistory).values({
      conductorName: data.conductorName,
      pdfUrl: data.pdfUrl,
      geradoEm: new Date(),
    });
  } catch (error) {
    console.error("[Database] Error creating warning pdf history:", error);
    throw error;
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

export async function updateConfiguration(key: string, value: string) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  try {
    const existing = await db
      .select()
      .from(configurations)
      .where(eq(configurations.key, key));

    if (existing.length > 0) {
      await db
        .update(configurations)
        .set({ value })
        .where(eq(configurations.key, key));
    } else {
      await db.insert(configurations).values({ key, value });
    }
  } catch (error) {
    console.error("[Database] Error updating configuration:", error);
    throw error;
  }
}

export async function getOrientations(conductorName: string) {
  const db = await getDb();
  if (!db) return [];

  try {
    return await db
      .select()
      .from(orientations)
      .where(eq(orientations.conductorName, conductorName))
      .orderBy(desc(orientations.criadoEm));
  } catch (error) {
    console.error("[Database] Error getting orientations:", error);
    return [];
  }
}

export async function createOrientation(data: any) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  try {
    await db.insert(orientations).values({
      conductorName: data.conductorName,
      tipo: data.tipo,
      descricao: data.descricao,
      aplicadoPor: data.aplicadoPor,
      criadoEm: new Date(),
    });
  } catch (error) {
    console.error("[Database] Error creating orientation:", error);
    throw error;
  }
}

export async function getImports() {
  const db = await getDb();
  if (!db) return [];

  try {
    return await db.select().from(imports).orderBy(desc(imports.criadoEm));
  } catch (error) {
    console.error("[Database] Error getting imports:", error);
    return [];
  }
}

export async function createImport(data: any) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  try {
    await db.insert(imports).values({
      nomeArquivo: data.nomeArquivo,
      status: data.status || "pendente",
      criadoEm: new Date(),
    });
  } catch (error) {
    console.error("[Database] Error creating import:", error);
    throw error;
  }
}
