import { getDb } from "../db";
import {
  retentionPolicies,
  cleanupHistory,
  auditLogs,
  InsertCleanupHistory,
  InsertRetentionPolicy,
} from "../../drizzle/schema";
import { eq, lte, and } from "drizzle-orm";

/**
 * Obtém todas as políticas de retenção ativas
 */
export async function getRetentionPolicies() {
  const db = await getDb();
  if (!db) return [];

  try {
    const policies = await db
      .select()
      .from(retentionPolicies)
      .where(eq(retentionPolicies.enabled, true));

    return policies;
  } catch (error) {
    console.error("Erro ao obter políticas de retenção:", error);
    return [];
  }
}

/**
 * Obtém uma política específica por recurso
 */
export async function getRetentionPolicy(resource: string) {
  const db = await getDb();
  if (!db) return null;

  try {
    const policy = await db
      .select()
      .from(retentionPolicies)
      .where(eq(retentionPolicies.resource, resource))
      .limit(1);

    return policy[0] || null;
  } catch (error) {
    console.error(`Erro ao obter política para ${resource}:`, error);
    return null;
  }
}

/**
 * Cria ou atualiza uma política de retenção
 */
export async function upsertRetentionPolicy(input: {
  resource: string;
  retentionDays: number;
  enabled?: boolean;
  autoDelete?: boolean;
  description?: string;
}) {
  const db = await getDb();
  if (!db) return null;

  try {
    const existing = await getRetentionPolicy(input.resource);

    if (existing) {
      // Atualizar
      await db
        .update(retentionPolicies)
        .set({
          retentionDays: input.retentionDays,
          enabled: input.enabled ?? existing.enabled,
          autoDelete: input.autoDelete ?? existing.autoDelete,
          description: input.description ?? existing.description,
          updatedAt: new Date(),
        })
        .where(eq(retentionPolicies.resource, input.resource));
    } else {
      // Criar
      await db.insert(retentionPolicies).values({
        resource: input.resource,
        retentionDays: input.retentionDays,
        enabled: input.enabled ?? true,
        autoDelete: input.autoDelete ?? true,
        description: input.description,
      });
    }

    return getRetentionPolicy(input.resource);
  } catch (error) {
    console.error("Erro ao salvar política de retenção:", error);
    return null;
  }
}

/**
 * Deleta logs antigos de auditoria baseado na política
 */
export async function cleanupAuditLogs(
  retentionDays: number,
  executedBy?: string
): Promise<{ success: boolean; recordsDeleted: number; error?: string }> {
  const db = await getDb();
  if (!db) {
    return {
      success: false,
      recordsDeleted: 0,
      error: "Database not available",
    };
  }

  try {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - retentionDays);

    // Contar quantos registros serão deletados
    const logsToDelete = await db
      .select()
      .from(auditLogs)
      .where(lte(auditLogs.createdAt, cutoffDate));

    const recordsDeleted = logsToDelete.length;

    if (recordsDeleted > 0) {
      // Deletar logs antigos
      await db
        .delete(auditLogs)
        .where(lte(auditLogs.createdAt, cutoffDate));
    }

    // Registrar no histórico de limpeza
    const cleanupRecord: InsertCleanupHistory = {
      resource: "audit_logs",
      recordsDeleted,
      deletedBefore: cutoffDate,
      executedBy: executedBy || null,
      isAutomatic: !executedBy,
      status: "success",
    };

    await db.insert(cleanupHistory).values(cleanupRecord);

    return {
      success: true,
      recordsDeleted,
    };
  } catch (error) {
    console.error("Erro ao limpar logs de auditoria:", error);

    // Registrar erro no histórico
    try {
      const cleanupRecord: InsertCleanupHistory = {
        resource: "audit_logs",
        recordsDeleted: 0,
        deletedBefore: new Date(),
        executedBy: executedBy || null,
        isAutomatic: !executedBy,
        status: "failed",
        errorMessage: error instanceof Error ? error.message : String(error),
      };

      await db.insert(cleanupHistory).values(cleanupRecord);
    } catch (logError) {
      console.error("Erro ao registrar falha de limpeza:", logError);
    }

    return {
      success: false,
      recordsDeleted: 0,
      error: error instanceof Error ? error.message : String(error),
    };
  }
}

/**
 * Executa limpeza de todos os recursos com políticas ativas
 */
export async function executeAllCleanups(executedBy?: string): Promise<{
  success: boolean;
  totalRecordsDeleted: number;
  results: Array<{
    resource: string;
    recordsDeleted: number;
    success: boolean;
    error?: string;
  }>;
}> {
  const policies = await getRetentionPolicies();
  const results = [];
  let totalRecordsDeleted = 0;

  for (const policy of policies) {
    if (!policy.autoDelete) {
      results.push({
        resource: policy.resource,
        recordsDeleted: 0,
        success: true,
        error: "Auto-delete disabled for this resource",
      });
      continue;
    }

    // Por enquanto, apenas audit_logs é suportado
    if (policy.resource === "audit_logs") {
      const result = await cleanupAuditLogs(policy.retentionDays, executedBy);
      results.push({
        resource: policy.resource,
        recordsDeleted: result.recordsDeleted,
        success: result.success,
        error: result.error,
      });
      totalRecordsDeleted += result.recordsDeleted;
    } else {
      results.push({
        resource: policy.resource,
        recordsDeleted: 0,
        success: false,
        error: `Cleanup not implemented for resource: ${policy.resource}`,
      });
    }
  }

  return {
    success: results.every((r) => r.success),
    totalRecordsDeleted,
    results,
  };
}

/**
 * Obtém histórico de limpezas
 */
export async function getCleanupHistory(options: {
  resource?: string;
  limit?: number;
  offset?: number;
} = {}) {
  const db = await getDb();
  if (!db) return [];

  try {
    const { resource, limit = 50, offset = 0 } = options;

    const conditions = [];
    if (resource) {
      conditions.push(eq(cleanupHistory.resource, resource));
    }

    const whereClause = conditions.length > 0 ? and(...conditions) : undefined;

    const history = await db
      .select()
      .from(cleanupHistory)
      .where(whereClause)
      .orderBy(cleanupHistory.executedAt)
      .limit(limit)
      .offset(offset);

    return history;
  } catch (error) {
    console.error("Erro ao obter histórico de limpeza:", error);
    return [];
  }
}

/**
 * Obtém estatísticas de limpeza
 */
export async function getCleanupStats() {
  const db = await getDb();
  if (!db) {
    return {
      totalRecordsDeleted: 0,
      totalCleanups: 0,
      successfulCleanups: 0,
      failedCleanups: 0,
      byResource: {},
    };
  }

  try {
    const allCleanups = await db.select().from(cleanupHistory);

    const stats = {
      totalRecordsDeleted: 0,
      totalCleanups: allCleanups.length,
      successfulCleanups: 0,
      failedCleanups: 0,
      byResource: {} as Record<string, { count: number; recordsDeleted: number }>,
    };

    allCleanups.forEach((cleanup) => {
      stats.totalRecordsDeleted += cleanup.recordsDeleted;

      if (cleanup.status === "success") {
        stats.successfulCleanups++;
      } else if (cleanup.status === "failed") {
        stats.failedCleanups++;
      }

      if (!stats.byResource[cleanup.resource]) {
        stats.byResource[cleanup.resource] = { count: 0, recordsDeleted: 0 };
      }
      stats.byResource[cleanup.resource].count++;
      stats.byResource[cleanup.resource].recordsDeleted += cleanup.recordsDeleted;
    });

    return stats;
  } catch (error) {
    console.error("Erro ao obter estatísticas de limpeza:", error);
    return {
      totalRecordsDeleted: 0,
      totalCleanups: 0,
      successfulCleanups: 0,
      failedCleanups: 0,
      byResource: {},
    };
  }
}

/**
 * Inicializa políticas de retenção padrão
 */
export async function initializeDefaultPolicies() {
  const defaultPolicies = [
    {
      resource: "audit_logs",
      retentionDays: 90,
      description: "Manter logs de auditoria por 90 dias",
    },
  ];

  for (const policy of defaultPolicies) {
    const existing = await getRetentionPolicy(policy.resource);
    if (!existing) {
      await upsertRetentionPolicy(policy);
      console.log(`Política de retenção criada para: ${policy.resource}`);
    }
  }
}
