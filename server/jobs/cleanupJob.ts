import { executeAllCleanups, initializeDefaultPolicies } from "../services/retentionService";
import { createAuditLog } from "../services/auditLogService";

/**
 * Job agendado para executar limpeza de dados antigos
 * Deve ser executado diariamente (ex: 2:00 AM)
 */
export async function runCleanupJob() {
  console.log("[CleanupJob] Iniciando limpeza de dados agendada...");

  try {
    // Inicializar políticas padrão se não existirem
    await initializeDefaultPolicies();

    // Executar limpeza de todos os recursos
    const result = await executeAllCleanups();

    console.log("[CleanupJob] Limpeza concluída:", {
      success: result.success,
      totalRecordsDeleted: result.totalRecordsDeleted,
      results: result.results,
    });

    // Registrar no log de auditoria
    if (result.totalRecordsDeleted > 0) {
      await createAuditLog({
        userId: 0, // Sistema
        userName: "Sistema",
        userEmail: "system@internal",
        action: "delete_orientation", // Reutilizando ação existente
        resource: "system",
        description: `Limpeza automática de dados: ${result.totalRecordsDeleted} registros deletados`,
        details: {
          jobName: "cleanupJob",
          results: result.results,
          timestamp: new Date().toISOString(),
        },
        status: result.success ? "success" : "warning",
      });
    }

    return result;
  } catch (error) {
    console.error("[CleanupJob] Erro durante limpeza:", error);

    // Registrar erro no log de auditoria
    await createAuditLog({
      userId: 0,
      userName: "Sistema",
      userEmail: "system@internal",
      action: "delete_orientation",
      resource: "system",
      description: "Erro durante limpeza automática de dados",
      details: {
        jobName: "cleanupJob",
        error: error instanceof Error ? error.message : String(error),
        timestamp: new Date().toISOString(),
      },
      status: "failed",
      errorMessage: error instanceof Error ? error.message : String(error),
    });

    throw error;
  }
}

/**
 * Inicializa o scheduler de limpeza
 * Deve ser chamado ao iniciar o servidor
 */
export function initializeCleanupScheduler() {
  console.log("[CleanupScheduler] Inicializando scheduler de limpeza...");

  // Executar limpeza diariamente às 2:00 AM
  const scheduleCleanup = () => {
    const now = new Date();
    const tomorrow = new Date(now);
    tomorrow.setDate(tomorrow.getDate() + 1);
    tomorrow.setHours(2, 0, 0, 0);

    const timeUntilNextRun = tomorrow.getTime() - now.getTime();

    console.log(
      `[CleanupScheduler] Próxima limpeza agendada para: ${tomorrow.toISOString()}`
    );

    setTimeout(() => {
      runCleanupJob()
        .then(() => {
          console.log("[CleanupScheduler] Limpeza concluída com sucesso");
          scheduleCleanup(); // Agendar próxima limpeza
        })
        .catch((error) => {
          console.error("[CleanupScheduler] Erro na limpeza:", error);
          scheduleCleanup(); // Agendar próxima limpeza mesmo com erro
        });
    }, timeUntilNextRun);
  };

  // Agendar primeira limpeza
  scheduleCleanup();
}

/**
 * Executa limpeza imediatamente (para testes ou execução manual)
 */
export async function executeCleanupNow() {
  console.log("[CleanupJob] Executando limpeza manual...");
  return runCleanupJob();
}
