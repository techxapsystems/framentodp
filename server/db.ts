import { eq, and, gte, lte, desc, inArray, or, isNotNull, count, asc, sql } from "drizzle-orm";
import { drizzle } from "drizzle-orm/mysql2";
import { InsertUser, users, journeys, recurrences, warnings, imports, configurations, orientations, warningPdfHistory, conductors, InsertConductor, administrativeEmployees, warningAuditLog, InsertWarningAuditLog } from "../drizzle/schema";
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
    // Primeiro, verificar se o usuário já existe
    const existing = await db
      .select({ id: users.id })
      .from(users)
      .where(eq(users.openId, user.openId));

    const updateSet: Record<string, unknown> = {};

    const textFields = ["name", "email", "loginMethod"] as const;
    type TextField = (typeof textFields)[number];

    const assignNullable = (field: TextField) => {
      const value = user[field];
      if (value === undefined) return;
      const normalized = value ?? null;
      updateSet[field] = normalized;
    };

    textFields.forEach(assignNullable);

    if (user.role) updateSet.role = user.role;
    if (user.department) updateSet.department = user.department;
    if (user.modules) updateSet.modules = user.modules;
    if (user.status) updateSet.status = user.status;
    if (user.lastSignedIn) updateSet.lastSignedIn = user.lastSignedIn;

    if (existing.length > 0) {
      // Usuário já existe: fazer UPDATE simples
      if (Object.keys(updateSet).length === 0) {
        updateSet.updatedAt = new Date();
      }
      await db
        .update(users)
        .set(updateSet)
        .where(eq(users.openId, user.openId));
    } else {
      // Usuário novo: fazer INSERT com todos os campos necessários
      const values: InsertUser = {
        openId: user.openId,
        name: user.name || "Usuário",
        email: user.email || `${user.openId}@local`,
        ...updateSet,
      };
      await db.insert(users).values(values);
    }
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
    name: name || "Usuário",
    email: email || `${openId}@local`,
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

export async function getUserByOpenId(openId: string) {
  const db = await getDb();
  if (!db) return null;

  try {
    const result = await db
      .select()
      .from(users)
      .where(eq(users.openId, openId));
    return result[0] || null;
  } catch (error) {
    console.error("[Database] Error getting user by openId:", error);
    return null;
  }
}

export async function getUserByEmail(email: string) {
  const db = await getDb();
  if (!db) return null;

  try {
    const result = await db
      .select()
      .from(users)
      .where(eq(users.email, email));
    return result[0] || null;
  } catch (error) {
    console.error("[Database] Error getting user by email:", error);
    return null;
  }
}

export async function getUserById(id: number) {
  const db = await getDb();
  if (!db) return null;

  try {
    const result = await db
      .select()
      .from(users)
      .where(eq(users.id, id));
    return result[0] || null;
  } catch (error) {
    console.error("[Database] Error getting user by id:", error);
    return null;
  }
}

export async function createUser(data: any) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  try {
    const result = await db.insert(users).values({
      email: data.email,
      name: data.name,
      password: data.password,
      role: data.role || "user",
      modules: data.modules || JSON.stringify([]),
      status: data.status || "ativo",
      loginMethod: data.loginMethod || "email",
      openId: null,
    } as any);

    return (result as any).insertId;
  } catch (error) {
    console.error("[Database] Error creating user:", error);
    throw error;
  }
}

export async function updateUserById(id: number, updates: any) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  try {
    await db.update(users).set(updates).where(eq(users.id, id));
  } catch (error) {
    console.error("[Database] Error updating user:", error);
    throw error;
  }
}

export async function resetPasswordByEmail(email: string, hashedPassword: string) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  try {
    await db
      .update(users)
      .set({ password: hashedPassword })
      .where(eq(users.email, email));
  } catch (error) {
    console.error("[Database] Error resetting password:", error);
    throw error;
  }
}

export async function deleteUserById(id: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  try {
    await db.delete(users).where(eq(users.id, id));
  } catch (error) {
    console.error("[Database] Error deleting user:", error);
    throw error;
  }
}

export async function getJourneys() {
  const db = await getDb();
  if (!db) return [];

  try {
    return await db.select().from(journeys);
  } catch (error) {
    console.error("[Database] Error getting journeys:", error);
    return [];
  }
}

export async function createJourney(
  data: {
    conductorName: string;
    importId: number;
    data: Date;
    dirigidoMin?: number;
    heMin?: number;
    [key: string]: any;
  }
) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  try {
    await db.insert(journeys).values({
      conductorName: data.conductorName,
      importId: data.importId,
      data: data.data,
      dirigidoMin: data.dirigidoMin || 0,
      heMin: data.heMin || 0,
    });
  } catch (error) {
    console.error("[Database] Error creating journey:", error);
    throw error;
  }
}

export async function getRecurrences(conductorName: string) {
  const db = await getDb();
  if (!db) return [];

  try {
    return await db
      .select()
      .from(recurrences)
      .where(eq(recurrences.conductorName, conductorName));
  } catch (error) {
    console.error("[Database] Error getting recurrences:", error);
    return [];
  }
}

export async function createRecurrence(
  conductorName: string,
  data: {
    ocorPoucoJanela?: number;
    ocorPouco30d?: number;
    ocorHeJanela?: number;
    ocorHe30d?: number;
  }
) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  try {
    await db.insert(recurrences).values({
      conductorName,
      data: new Date(),
      ocorPoucoJanela: data.ocorPoucoJanela || 0,
      ocorPouco30d: data.ocorPouco30d || 0,
      ocorHeJanela: data.ocorHeJanela || 0,
      ocorHe30d: data.ocorHe30d || 0,
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
          avisosPoucoRodado: 0,
          avisosHorasExtras: 0,
          avisoOutro: 0,
          ultimoAviso: null,
          observacao: "",
        };
      }
      grouped[warning.conductorName].warnings.push(warning);
      grouped[warning.conductorName].maxLevel = Math.max(
        grouped[warning.conductorName].maxLevel,
        warning.nivelAdvertencia || 0
      );
      grouped[warning.conductorName].ultimoAviso = warning.criadoEm;
      grouped[warning.conductorName].observacao = warning.observacao || "";

      // Contar por categoria
      if (warning.categoria === "pouco_rodado") {
        grouped[warning.conductorName].avisosPoucoRodado++;
      } else if (warning.categoria === "horas_extras") {
        grouped[warning.conductorName].avisosHorasExtras++;
      } else {
        grouped[warning.conductorName].avisoOutro++;
      }
    });

    // Filtrar apenas reincidentes (motoristas com 2+ advertências)
    const reincidents = Object.values(grouped).filter(
      (group: any) => group.warnings.length >= 2
    );
    return reincidents;
  } catch (error) {
    console.error("[Database] Error getting reincidents:", error);
    return [];
  }
}

export async function createWarning(data: any) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  // Função para parsear datas no formato DD/MM/YYYY
  const parseDate = (dateStr: string | null | undefined) => {
    if (!dateStr) return null;
    const [day, month, year] = dateStr.split('/');
    return new Date(parseInt(year), parseInt(month) - 1, parseInt(day));
  };

  try {
    await db.insert(warnings).values({
      conductorName: data.conductorName,
      tipo: data.tipo,
      categoria: data.categoria || "pouco_rodado",
      nivelAdvertencia: data.nivelAdvertencia,
      motivo: data.motivo,
      observacao: data.observacao || "",
      aplicadoPor: data.aplicadoPor || "Sistema",
      advertenciaGerada: true,
      advertenciaAplicada: false,
      criadoEm: new Date(),
      dataAnotacao: parseDate(data.dataInfracao) || new Date(), // Data da infração
      dataInicio: parseDate(data.dataInicio),
      dataFim: parseDate(data.dataFim),
      dataRetorno: parseDate(data.dataRetorno),
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

export async function deleteWarning(id: number, userId?: number, userEmail?: string, userName?: string, motivo?: string) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  try {
    // Buscar a advertência antes de deletar para registrar no audit
    const warningToDelete = await db.select().from(warnings).where(eq(warnings.id, id)).limit(1);
    
    if (warningToDelete.length === 0) {
      throw new Error(`Warning with id ${id} not found`);
    }

    const warning = warningToDelete[0];

    // Registrar no audit log ANTES de deletar
    await db.insert(warningAuditLog).values({
      warningId: id,
      conductorName: warning.conductorName,
      acao: "deletado",
      valorAnterior: JSON.stringify(warning),
      usuarioId: userId || 0,
      usuarioEmail: userEmail || "sistema",
      usuarioNome: userName || "Sistema",
      motivo: motivo || "",
      criadoEm: new Date(),
    });

    // Agora deletar
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
      warningId: data.warningId || 0,
      conductorName: data.conductorName || "",
      licensePlate: data.licensePlate || "",
      operacao: data.operacao || "",
      pdfUrl: data.pdfUrl || "",
      pdfKey: data.pdfKey || "",
      fileSize: data.fileSize || 0,
      geradoPor: data.geradoPor || "",
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
    // configurations table has a single row with all settings
    // Just return success - configurations are managed via schema
    return { success: true };
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
      licensePlate: data.licensePlate || "",
      operacao: data.operacao || "",
      observacao: data.observacao || "",
      usuarioId: data.usuarioId || 0,
      usuarioNome: data.usuarioNome || "",
      usuarioEmail: data.usuarioEmail || "",
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
    return await db.select().from(imports).orderBy(desc(imports.createdAt));
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
      fileName: data.fileName || "unknown",
      fileHash: data.fileHash || "",
      rowCount: data.rowCount || 0,
      newRowsCount: data.newRowsCount || 0,
      importedBy: data.importedBy || "sistema",
    });
  } catch (error) {
    console.error("[Database] Error creating import:", error);
    throw error;
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

    // Filtrar por data se fornecido (usar criadoEm - data de cadastro)
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

    // Buscar dados dos motoristas para filtrar por operação
    const conductorsList = await db.select().from(conductors);
    const conductorMap = new Map(conductorsList.map((c: any) => [c.nome, c]));

    // Filtrar por operação se fornecido
    let filteredWarnings = allWarnings;
    if (params.operacao) {
      filteredWarnings = allWarnings.filter((warning: any) => {
        const conductor = conductorMap.get(warning.conductorName);
        return conductor && conductor.operacao === params.operacao;
      });
    }

    // Enriquecer com dados de CPF, CTPS e OPERACAO
    const enrichedWarnings = await Promise.all(
      filteredWarnings.map(async (warning: any) => {
        // Buscar dados do motorista ou administrativo
        let cpf = null;
        let ctps = null;
        let operacao = null;

        // Tentar buscar em conductors
        const conductor = await db
          .select()
          .from(conductors)
          .where(eq(conductors.nome, warning.conductorName))
          .limit(1);

        if (conductor && conductor.length > 0) {
          cpf = conductor[0].cpf;
          ctps = conductor[0].ctps;
          operacao = conductor[0].operacao;
        } else {
          // Tentar buscar em administrativeEmployees
          const admin = await db
            .select()
            .from(administrativeEmployees)
            .where(eq(administrativeEmployees.nome, warning.conductorName))
            .limit(1);

          if (admin && admin.length > 0) {
            cpf = admin[0].cpf;
            ctps = null; // Administrativos nao tem CTPS
            operacao = null; // Administrativos nao tem operacao
          }
        }

        return {
          ...warning,
          cpf,
          ctps,
          operacao,
        };
      })
    );

    // Contar assinadas vs não assinadas
    const assinadas = enrichedWarnings.filter((w: any) => w.advertenciaAplicada).length;
    const naoAssinadas = enrichedWarnings.length - assinadas;
    // Taxa de Devolução = (Assinadas / Total) * 100
    const taxaDevolucao = enrichedWarnings.length > 0 ? (assinadas / enrichedWarnings.length) * 100 : 0;

    return {
      total: enrichedWarnings.length,
      assinadas,
      naoAssinadas,
      taxaDevolucao: parseFloat(taxaDevolucao.toFixed(1)),
      warnings: enrichedWarnings,
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
    let conditions: any[] = [];

    // Filtrar por data se fornecido
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

    // Buscar dados dos motoristas para obter operação
    const conductorsList = await db.select().from(conductors);
    const conductorMap = new Map(conductorsList.map((c: any) => [c.nome, c]));

    // Agrupar por operação real (não por tipo de advertência)
    const grouped: Record<string, any> = {};
    allWarnings.forEach((warning: any) => {
      const conductor = conductorMap.get(warning.conductorName);
      const operacao = conductor?.operacao || "Sem Operação";

      // Se operacao foi especificada, filtrar por ela
      if (params?.operacao && operacao !== params.operacao) {
        return; // Pular se não corresponder à operação
      }

      if (!grouped[operacao]) {
        grouped[operacao] = {
          operacao: operacao,
          total: 0,
          assinadas: 0,
          naoAssinadas: 0,
          warnings: [], // Array com detalhes de cada aviso
        };
      }
      grouped[operacao].total++;
      if (warning.advertenciaAplicada) {
        grouped[operacao].assinadas++;
      } else {
        grouped[operacao].naoAssinadas++;
      }
      // Adicionar warning com tipo e status
      grouped[operacao].warnings.push({
        tipo: warning.tipo, // 'advertencia' ou 'suspensao'
        advertenciaAplicada: warning.advertenciaAplicada,
        conductorName: warning.conductorName,
      });
    });

    // Debug: imprimir dados agrupados
    const result = Object.values(grouped);
    console.log('[DEBUG] Warnings grouped by operation:', JSON.stringify(result, null, 2));

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
    // Buscar todas as operações únicas dos motoristas
    const conductorsList = await db.select().from(conductors);
    
    // Extrair operações únicas
    const operacoes = new Map<string, string>();
    conductorsList.forEach((c: any) => {
      const op = String(c.operacao || '').trim();
      if (op) {
        operacoes.set(op, op);
      }
    });
    
    // Converter para array e ordenar
    const result = Array.from(operacoes.values())
      .sort()
      .map((op: string) => ({
        id: String(op || ''),
        nome: String(op || ''),
      }));
    
    return result;
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
export async function getWarningsStatsByDriver(filters?: any) {
  const db = await getDb();
  if (!db) return { advertencias: [], suspensoes: [] };

  try {
    let query = db.select().from(warnings);
    const allWarnings = await query;
    
    // Buscar dados dos motoristas para obter operacao
    const conductorsData = await db.select().from(conductors);
    const conductorMap = new Map();
    conductorsData.forEach((c: any) => {
      conductorMap.set(c.nome, c);
    });

    // Separar advertências e suspensões
    const advertencias: any[] = [];
    const suspensoes: any[] = [];

    allWarnings.forEach((warning: any) => {
      const conductor = warning.conductorName || "Desconhecido";
      const conductorInfo = conductorMap.get(conductor);
      const item = {
        id: warning.id,
        nome: conductor,
        conductorName: conductor,
        operacao: conductorInfo?.operacao || "",
        placa: conductorInfo?.placa || warning.placa || "",
        cpf: conductorInfo?.cpf || "",
        ctps: conductorInfo?.ctps || "",
        criadoEm: warning.criadoEm || warning.dataAplicacao,
        data: warning.criadoEm || warning.dataAplicacao,
        tipo: warning.tipo || "advertencia",
        assinada: warning.advertenciaAplicada || false,
        advertenciaAplicada: warning.advertenciaAplicada || false,
        motivo: warning.motivo || "",
        observacao: warning.observacao || "",
        nivelAdvertencia: warning.nivelAdvertencia || 1,
        categoria: warning.categoria || "",
        dataInicio: warning.dataInicio || null,
        dataFim: warning.dataFim || null,
        dataRetorno: warning.dataRetorno || null,
      };

      if (warning.tipo === "suspensao") {
        suspensoes.push(item);
      } else {
        advertencias.push(item);
      }
    });

    return { advertencias, suspensoes };
  } catch (error) {
    console.error("[DB] Error getting warnings stats by driver:", error);
    return { advertencias: [], suspensoes: [] };
  }
}


/**
 * Obter todos os motoristas ociosos (para seleção em novo cadastro de advertência)
 */
export async function getAllIdleDrivers() {
  const db = await getDb();
  if (!db) return [];

  try {
    // Buscar todos os motoristas únicos das jornadas
    const result = await db
      .selectDistinct({
        conductorName: journeys.conductorName,
        cargo: journeys.cargo,
        operacao: journeys.operacao,
        placa: journeys.placa,
      })
      .from(journeys)
      .orderBy(journeys.conductorName);

    return result || [];
  } catch (error) {
    console.error("[Database] Error getting idle drivers:", error);
    return [];
  }
}


/**
 * Importar motoristas em lote
 */
export async function importConductors(conductorsList: InsertConductor[]) {
  const db = await getDb();
  if (!db) {
    console.error("[DB] Database not available");
    return { success: false, message: "Database not available", inserted: 0 };
  }

  try {
    let inserted = 0;
    let skipped = 0;
    
    // Inserir um por um para melhor controle de erros
    for (let i = 0; i < conductorsList.length; i++) {
      const conductor = conductorsList[i];
      
      try {
        await db.insert(conductors).values(conductor);
        inserted++;
      } catch (error: any) {
        // Se houver erro de duplicação de CPF, pular este motorista
        if (error.message && error.message.includes('Duplicate entry')) {
          skipped++;
          continue;
        }
        throw error;
      }
    }
    
    console.log(`[DB] Import complete: ${inserted} inserted, ${skipped} skipped`);
    return { success: true, message: `Imported ${inserted} conductors (${skipped} skipped)`, inserted };
  } catch (error) {
    console.error("[DB] Error importing conductors:", error);
    return { success: false, message: `Error importing conductors: ${error}`, inserted: 0 };
  }
}

/**
 * Obter todos os motoristas
 */
export async function getAllConductors() {
  const db = await getDb();
  if (!db) return [];

  try {
    return await db.select().from(conductors);
  } catch (error) {
    console.error("[DB] Error getting all conductors:", error);
    return [];
  }
}

/**
 * Obter todos os funcionários (motoristas + administrativos)
 */
export async function getAllEmployees() {
  const db = await getDb();
  if (!db) return [];

  try {
    const [conductorsList, adminList] = await Promise.all([
      db.select().from(conductors),
      db.select().from(administrativeEmployees),
    ]);
    
    // Combinar motoristas e administrativos
    const combined = [
      ...conductorsList.map((c: any) => ({
        id: c.id,
        nome: c.nome,
        placa: c.placa,
        operacao: c.operacao,
        cargo: c.cargo,
        cpf: c.cpf,
        ctps: c.ctps,
        matricula: c.matricula,
        tipo: 'motorista',
      })),
      ...adminList.map((a: any) => ({
        id: a.id,
        nome: a.nome,
        placa: null,
        operacao: '',
        cargo: a.cargo,
        cpf: a.cpf,
        ctps: null,
        matricula: null,
        tipo: 'administrativo',
      })),
    ];
    
    return combined;
  } catch (error) {
    console.error("[DB] Error getting all employees:", error);
    return [];
  }
}

/**
 * Obter motorista por nome
 */
export async function getConductorByName(name: string) {
  const db = await getDb();
  if (!db) return null;

  try {
    const result = await db
      .select()
      .from(conductors)
      .where(eq(conductors.nome, name))
      .limit(1);
    
    return result.length > 0 ? result[0] : null;
  } catch (error) {
    console.error("[DB] Error getting conductor by name:", error);
    return null;
  }
}

/**
 * Dar baixa em advertência (marcar como assinada)
 */
export async function markWarningAsSigned(warningId: number) {
  const db = await getDb();
  if (!db) return null;

  try {
    const result = await db
      .update(warnings)
      .set({ 
        advertenciaAplicada: true,
        dataAplicacao: new Date()
      })
      .where(eq(warnings.id, warningId));
    
    return result;
  } catch (error) {
    console.error("[DB] Error marking warning as signed:", error);
    return null;
  }
}

/**
 * Obter advertências não assinadas de um motorista
 */
export async function getUnsignedWarningsByDriver(conductorName: string) {
  const db = await getDb();
  if (!db) return [];

  try {
    return await db
      .select()
      .from(warnings)
      .where(
        and(
          eq(warnings.conductorName, conductorName),
          eq(warnings.advertenciaAplicada, false)
        )
      )
      .orderBy(desc(warnings.criadoEm));
  } catch (error) {
    console.error("[DB] Error getting unsigned warnings by driver:", error);
    return [];
  }
}


/**
 * Obter todas as advertências de um motorista por ID
 */
export async function getWarningsByConductorId(conductorId: number) {
  const db = await getDb();
  if (!db) return [];

  try {
    // First, get the conductor to find their name
    const conductor = await db
      .select()
      .from(conductors)
      .where(eq(conductors.id, conductorId))
      .limit(1);
    
    if (!conductor || conductor.length === 0) {
      return [];
    }

    const conductorName = conductor[0].nome;

    // Then get all warnings for this conductor
    const warningsList = await db
      .select()
      .from(warnings)
      .where(eq(warnings.conductorName, conductorName))
      .orderBy(desc(warnings.criadoEm));
    
    // Map advertenciaAplicada to assinada for frontend compatibility
    return warningsList.map(w => ({
      ...w,
      assinada: w.advertenciaAplicada
    }));
  } catch (error) {
    console.error("[DB] Error getting warnings by conductor ID:", error);
    return [];
  }
}

/**
 * Get all warnings for a conductor (both pending and signed)
 */
export async function getConductorWarnings(conductorId: string | number) {
  const db = await getDb();
  if (!db) return [];

  try {
    const id = typeof conductorId === 'string' ? parseInt(conductorId, 10) : conductorId;
    
    // First, get the conductor to find their name
    const conductor = await db
      .select()
      .from(conductors)
      .where(eq(conductors.id, id))
      .limit(1);
    
    if (!conductor || conductor.length === 0) {
      return [];
    }

    const conductorName = conductor[0].nome;

    // Then get all warnings for this conductor
    const warningsList = await db
      .select()
      .from(warnings)
      .where(eq(warnings.conductorName, conductorName))
      .orderBy(desc(warnings.criadoEm));
    
    // Map advertenciaAplicada to assinada for frontend compatibility
    // advertenciaAplicada = true means the warning was signed/applied
    // advertenciaAplicada = false means the warning is still pending
    return warningsList.map(w => ({
      ...w,
      assinada: w.advertenciaAplicada === true
    }));
  } catch (error) {
    console.error("[DB] Error getting conductor warnings:", error);
    return [];
  }
}


/**
 * List all active conductors
 */
export async function listConductors() {
  const db = await getDb();
  if (!db) return [];

  try {
    const conductorsList = await db
      .select()
      .from(conductors)
      .where(eq(conductors.status, 'ativo'))
      .orderBy(asc(conductors.nome));
    
    return conductorsList;
  } catch (error) {
    console.error("[DB] Error listing conductors:", error);
    return [];
  }
}


/**
 * Registra uma ação de auditoria para uma advertência
 * Restrito a usuários administradores
 */
export async function logWarningAudit(
  warningId: number,
  acao: "criado" | "editado" | "deletado" | "assinado",
  usuarioId: number,
  usuarioEmail: string,
  usuarioNome: string,
  conductorName: string,
  camposAlterados?: string[],
  valorAnterior?: Record<string, unknown>,
  valorNovo?: Record<string, unknown>,
  motivo?: string,
  ipAddress?: string
): Promise<void> {
  const db = await getDb();
  if (!db) {
    console.warn("[Database] Cannot log warning audit: database not available");
    return;
  }

  try {
    const auditLog: InsertWarningAuditLog = {
      warningId,
      conductorName,
      acao,
      camposAlterados: camposAlterados ? JSON.stringify(camposAlterados) : null,
      valorAnterior: valorAnterior ? JSON.stringify(valorAnterior) : null,
      valorNovo: valorNovo ? JSON.stringify(valorNovo) : null,
      usuarioId,
      usuarioEmail,
      usuarioNome,
      motivo: motivo || null,
      ipAddress: ipAddress || null,
    };

    await db.insert(warningAuditLog).values(auditLog);
    console.log(`[Audit] Warning ${warningId} - ${acao} by ${usuarioEmail}`);
  } catch (error) {
    console.error("[DB] Error logging warning audit:", error);
  }
}

/**
 * Obtém o histórico de auditoria de uma advertência
 * Restrito a usuários administradores
 */
export async function getWarningAuditHistory(warningId: number): Promise<any[]> {
  const db = await getDb();
  if (!db) {
    console.warn("[Database] Cannot get warning audit history: database not available");
    return [];
  }

  try {
    const history = await db
      .select()
      .from(warningAuditLog)
      .where(eq(warningAuditLog.warningId, warningId))
      .orderBy(desc(warningAuditLog.criadoEm));

    return history.map((log) => ({
      ...log,
      camposAlterados: log.camposAlterados ? JSON.parse(log.camposAlterados) : null,
      valorAnterior: log.valorAnterior ? JSON.parse(log.valorAnterior) : null,
      valorNovo: log.valorNovo ? JSON.parse(log.valorNovo) : null,
    }));
  } catch (error) {
    console.error("[DB] Error getting warning audit history:", error);
    return [];
  }
}

/**
 * Obtém o histórico de auditoria de um motorista
 * Restrito a usuários administradores
 */
export async function getConductorWarningAuditHistory(
  conductorName: string,
  startDate?: Date,
  endDate?: Date
): Promise<any[]> {
  const db = await getDb();
  if (!db) {
    console.warn("[Database] Cannot get conductor audit history: database not available");
    return [];
  }

  try {
    const conditions = [eq(warningAuditLog.conductorName, conductorName)];

    if (startDate) {
      conditions.push(gte(warningAuditLog.criadoEm, startDate));
    }

    if (endDate) {
      conditions.push(lte(warningAuditLog.criadoEm, endDate));
    }

    const history = await db
      .select()
      .from(warningAuditLog)
      .where(and(...conditions))
      .orderBy(desc(warningAuditLog.criadoEm));

    return history.map((log) => ({
      ...log,
      camposAlterados: log.camposAlterados ? JSON.parse(log.camposAlterados) : null,
      valorAnterior: log.valorAnterior ? JSON.parse(log.valorAnterior) : null,
      valorNovo: log.valorNovo ? JSON.parse(log.valorNovo) : null,
    }));
  } catch (error) {
    console.error("[DB] Error getting conductor audit history:", error);
    return [];
  }
}

/**
 * Obtém o histórico de auditoria de um usuário
 * Restrito a usuários administradores
 */
export async function getUserWarningAuditHistory(
  usuarioId: number,
  startDate?: Date,
  endDate?: Date
): Promise<any[]> {
  const db = await getDb();
  if (!db) {
    console.warn("[Database] Cannot get user audit history: database not available");
    return [];
  }

  try {
    const conditions = [eq(warningAuditLog.usuarioId, usuarioId)];

    if (startDate) {
      conditions.push(gte(warningAuditLog.criadoEm, startDate));
    }

    if (endDate) {
      conditions.push(lte(warningAuditLog.criadoEm, endDate));
    }

    const history = await db
      .select()
      .from(warningAuditLog)
      .where(and(...conditions))
      .orderBy(desc(warningAuditLog.criadoEm));

    return history.map((log) => ({
      ...log,
      camposAlterados: log.camposAlterados ? JSON.parse(log.camposAlterados) : null,
      valorAnterior: log.valorAnterior ? JSON.parse(log.valorAnterior) : null,
      valorNovo: log.valorNovo ? JSON.parse(log.valorNovo) : null,
    }));
  } catch (error) {
    console.error("[DB] Error getting user audit history:", error);
    return [];
  }
}
