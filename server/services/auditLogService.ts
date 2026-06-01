import { getDb } from "../db";
import { auditLogs, InsertAuditLog } from "../../drizzle/schema";
import { eq, desc, and, gte, lte } from "drizzle-orm";

export type LogAction = 
  | "login"
  | "logout"
  | "create_warning"
  | "edit_warning"
  | "delete_warning"
  | "create_orientation"
  | "edit_orientation"
  | "delete_orientation"
  | "create_user"
  | "edit_user"
  | "delete_user"
  | "import_data"
  | "export_data"
  | "view_report"
  | "change_settings"
  | "access_denied";

export type LogResource = "users" | "warnings" | "orientations" | "imports" | "reports" | "settings" | "system";

export interface CreateLogInput {
  userId: number;
  userName: string;
  userEmail: string;
  action: LogAction;
  resource: LogResource;
  resourceId?: number;
  description: string;
  details?: Record<string, any>;
  ipAddress?: string;
  userAgent?: string;
  status?: "success" | "failed" | "warning";
  errorMessage?: string;
}

/**
 * Registra uma ação de auditoria no banco de dados
 */
export async function createAuditLog(input: CreateLogInput): Promise<void> {
  try {
    const db = await getDb();
    if (!db) {
      console.warn("[Database] Cannot create audit log: database not available");
      return;
    }

    const logData: InsertAuditLog = {
      userId: input.userId,
      userName: input.userName,
      userEmail: input.userEmail,
      action: input.action,
      resource: input.resource,
      resourceId: input.resourceId,
      description: input.description,
      details: input.details ? JSON.stringify(input.details) : null,
      ipAddress: input.ipAddress,
      userAgent: input.userAgent,
      status: input.status || "success",
      errorMessage: input.errorMessage,
    };

    await db.insert(auditLogs).values(logData);
  } catch (error) {
    // Log de erro não deve quebrar a aplicação
    console.error("Erro ao registrar log de auditoria:", error);
  }
}

/**
 * Obtém logs de auditoria com filtros opcionais
 */
export async function getAuditLogs(options: {
  userId?: number;
  action?: string;
  resource?: string;
  startDate?: Date;
  endDate?: Date;
  limit?: number;
  offset?: number;
} = {}) {
  const { userId, action, resource, startDate, endDate, limit = 100, offset = 0 } = options;
  const db = await getDb();
  if (!db) return [];

  const conditions = [];

  if (userId) {
    conditions.push(eq(auditLogs.userId, userId));
  }

  if (action) {
    conditions.push(eq(auditLogs.action, action));
  }

  if (resource) {
    conditions.push(eq(auditLogs.resource, resource));
  }

  if (startDate) {
    conditions.push(gte(auditLogs.createdAt, startDate));
  }

  if (endDate) {
    conditions.push(lte(auditLogs.createdAt, endDate));
  }

  const whereClause = conditions.length > 0 ? and(...conditions) : undefined;

  const logs = await db
    .select()
    .from(auditLogs)
    .where(whereClause)
    .orderBy(desc(auditLogs.createdAt))
    .limit(limit)
    .offset(offset);

  return logs;
}

/**
 * Obtém contagem total de logs com filtros
 */
export async function getAuditLogsCount(options: {
  userId?: number;
  action?: string;
  resource?: string;
  startDate?: Date;
  endDate?: Date;
} = {}) {
  const { userId, action, resource, startDate, endDate } = options;
  const db = await getDb();
  if (!db) return 0;

  const conditions = [];

  if (userId) {
    conditions.push(eq(auditLogs.userId, userId));
  }

  if (action) {
    conditions.push(eq(auditLogs.action, action));
  }

  if (resource) {
    conditions.push(eq(auditLogs.resource, resource));
  }

  if (startDate) {
    conditions.push(gte(auditLogs.createdAt, startDate));
  }

  if (endDate) {
    conditions.push(lte(auditLogs.createdAt, endDate));
  }

  const whereClause = conditions.length > 0 ? and(...conditions) : undefined;

  const result = await db
    .select({ count: auditLogs.id })
    .from(auditLogs)
    .where(whereClause);

  return result[0]?.count || 0;
}

/**
 * Obtém logs de um usuário específico
 */
export async function getUserAuditLogs(
  userId: number,
  options: { limit?: number; offset?: number } = {}
) {
  const { limit = 50, offset = 0 } = options;

  return getAuditLogs({
    userId,
    limit,
    offset,
  });
}

/**
 * Obtém logs de uma ação específica
 */
export async function getActionAuditLogs(
  action: LogAction,
  options: { limit?: number; offset?: number } = {}
) {
  const { limit = 50, offset = 0 } = options;

  return getAuditLogs({
    action,
    limit,
    offset,
  });
}

/**
 * Obtém logs de um recurso específico
 */
export async function getResourceAuditLogs(
  resource: LogResource,
  options: { limit?: number; offset?: number } = {}
) {
  const { limit = 50, offset = 0 } = options;

  return getAuditLogs({
    resource,
    limit,
    offset,
  });
}

/**
 * Obtém logs de um período específico
 */
export async function getAuditLogsByDateRange(
  startDate: Date,
  endDate: Date,
  options: { limit?: number; offset?: number } = {}
) {
  const { limit = 100, offset = 0 } = options;

  return getAuditLogs({
    startDate,
    endDate,
    limit,
    offset,
  });
}

/**
 * Deleta logs antigos (mais de X dias)
 */
export async function deleteOldAuditLogs(daysOld: number = 90): Promise<number> {
  const db = await getDb();
  if (!db) return 0;

  const cutoffDate = new Date();
  cutoffDate.setDate(cutoffDate.getDate() - daysOld);

  try {
    await db
      .delete(auditLogs)
      .where(lte(auditLogs.createdAt, cutoffDate));
    return 1; // Retorna 1 se sucesso
  } catch (error) {
    console.error("Erro ao deletar logs antigos:", error);
    return 0;
  }
}

/**
 * Obtém estatísticas de logs
 */
export async function getAuditLogStats(startDate?: Date, endDate?: Date) {
  const db = await getDb();
  if (!db) return { total: 0, byAction: {}, byResource: {}, byStatus: { success: 0, failed: 0, warning: 0 }, byUser: {} };

  const conditions = [];

  if (startDate) {
    conditions.push(gte(auditLogs.createdAt, startDate));
  }

  if (endDate) {
    conditions.push(lte(auditLogs.createdAt, endDate));
  }

  const whereClause = conditions.length > 0 ? and(...conditions) : undefined;

  const allLogs = await db
    .select()
    .from(auditLogs)
    .where(whereClause);

  const stats = {
    total: allLogs.length,
    byAction: {} as Record<string, number>,
    byResource: {} as Record<string, number>,
    byStatus: { success: 0, failed: 0, warning: 0 },
    byUser: {} as Record<string, number>,
  };

  allLogs.forEach((log: typeof auditLogs.$inferSelect) => {
    // Por ação
    stats.byAction[log.action] = (stats.byAction[log.action] || 0) + 1;

    // Por recurso
    stats.byResource[log.resource] = (stats.byResource[log.resource] || 0) + 1;

    // Por status
    stats.byStatus[log.status as keyof typeof stats.byStatus]++;

    // Por usuário
    stats.byUser[log.userName] = (stats.byUser[log.userName] || 0) + 1;
  });

  return stats;
}
