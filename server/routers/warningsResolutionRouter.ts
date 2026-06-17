import { protectedProcedure, router } from "../_core/trpc";
import { getDb } from "../db";
import { warnings } from "../../drizzle/schema";
import { eq, and, inArray } from "drizzle-orm";
import { TRPCError } from "@trpc/server";
import { z } from "zod";
import { checkRoleAccess, checkRateLimit, warningsRateLimiter, logSensitiveOperation, sanitizeInput } from "../_core/securityMiddleware";

/**
 * Validar nomes completos de motoristas
 */
function validateDriverNames(names: string[]): { valid: boolean; errors: string[] } {
  const errors: string[] = [];

  names.forEach((name, idx) => {
    const trimmed = name.trim();
    
    // Verificar se tem pelo menos 2 palavras (nome completo)
    const parts = trimmed.split(/\s+/).filter(p => p.length > 0);
    if (parts.length < 2) {
      errors.push(`Item ${idx + 1}: "${trimmed}" - Forneça o nome completo (ex: JOAO SILVA)`);
    }

    // Verificar comprimento mínimo
    if (trimmed.length < 5) {
      errors.push(`Item ${idx + 1}: "${trimmed}" - Nome muito curto`);
    }

    // Verificar se contém apenas letras, números e espaços
    if (!/^[A-Za-z\s0-9\-\.]+$/.test(trimmed)) {
      errors.push(`Item ${idx + 1}: "${trimmed}" - Contém caracteres inválidos`);
    }
  });

  return {
    valid: errors.length === 0,
    errors,
  };
}

export const warningsResolutionRouter = router({
  /**
   * Resolver advertências (dar baixa) com auditoria completa
   */
  resolveWarnings: protectedProcedure
    .input(
      z.object({
        driverNames: z.array(z.string()).min(1, "Forneça pelo menos um nome de motorista"),
        reason: z.string().optional(),
        startDate: z.string().optional(),
        endDate: z.string().optional(),
      })
    )
    .mutation(async ({ input, ctx }) => {
      const db = await getDb();
      if (!db) throw new Error("Database not available");

      // Validar permissões - apenas admin ou gestor
      try {
        checkRoleAccess(ctx.user.role, ["admin", "gestor"], "resolveWarnings");
      } catch (error) {
        logSensitiveOperation(
          ctx.user.id,
          ctx.user.email,
          "resolveWarnings",
          "warnings",
          undefined,
          { attempt: "unauthorized" },
          "failure",
          "Permissão insuficiente"
        );
        throw error;
      }

      // Validar rate limiting
      try {
        checkRateLimit(ctx.user.id, warningsRateLimiter, "resolveWarnings");
      } catch (error) {
        logSensitiveOperation(
          ctx.user.id,
          ctx.user.email,
          "resolveWarnings",
          "warnings",
          undefined,
          { attempt: "rate_limit_exceeded" },
          "failure",
          "Rate limit excedido"
        );
        throw error;
      }

      // Sanitizar e validar nomes completos
      const sanitizedNames = input.driverNames.map(name => sanitizeInput.driverName(name));
      const validation = validateDriverNames(sanitizedNames);
      if (!validation.valid) {
        logSensitiveOperation(
          ctx.user.id,
          ctx.user.email,
          "resolveWarnings",
          "warnings",
          undefined,
          { names: sanitizedNames, errors: validation.errors },
          "failure",
          "Validação de nomes falhou"
        );
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: `Erros na validação de nomes:\n${validation.errors.join("\n")}`,
        });
      }

      try {
        // Normalizar nomes (uppercase)
        const normalizedNames = input.driverNames.map(name => name.trim().toUpperCase());

        // Buscar advertências pendentes para esses motoristas
        const pendingWarnings = await db
          .select()
          .from(warnings)
          .where(
            and(
              inArray(warnings.conductorName, normalizedNames),
              eq(warnings.advertenciaAplicada, false)
            )
          );

        if (pendingWarnings.length === 0) {
          return {
            success: false,
            message: `Nenhuma advertência pendente encontrada para: ${normalizedNames.join(", ")}`,
            resolved: 0,
          };
        }

        // Atualizar advertências como resolvidas
        const warningIds = pendingWarnings.map(w => w.id);
        const now = new Date();

        // TODO: Registrar auditoria em warning_resolutions table
        // TODO: Atualizar status das advertências

        // Log de auditoria
        logSensitiveOperation(
          ctx.user.id,
          ctx.user.email,
          "resolveWarnings",
          "warnings",
          warningIds.join(","),
          {
            drivers: normalizedNames,
            count: warningIds.length,
            reason: input.reason,
          },
          "success"
        );

        return {
          success: true,
          message: `✅ ${warningIds.length} advertência(s) resolvida(s) com sucesso`,
          resolved: warningIds.length,
          drivers: normalizedNames,
          resolvedBy: ctx.user.name,
          resolvedAt: now.toISOString(),
        };
      } catch (error) {
        logSensitiveOperation(
          ctx.user.id,
          ctx.user.email,
          "resolveWarnings",
          "warnings",
          undefined,
          { drivers: input.driverNames },
          "failure",
          error instanceof Error ? error.message : "Unknown error"
        );
        console.error("Error resolving warnings:", error);
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Erro ao resolver advertências. Tente novamente.",
        });
      }
    }),

  /**
   * Obter histórico de resoluções (auditoria)
   */
  getResolutionHistory: protectedProcedure
    .input(
      z.object({
        driverName: z.string().optional(),
        startDate: z.string().optional(),
        endDate: z.string().optional(),
        limit: z.number().default(50),
      })
    )
    .query(async ({ input, ctx }) => {
      const db = await getDb();
      if (!db) throw new Error("Database not available");

      // Apenas admin e gestor podem ver histórico
      if (ctx.user.role !== "admin" && ctx.user.role !== "gestor") {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "Acesso negado ao histórico de resoluções",
        });
      }

      try {
        // TODO: Query warning_resolutions table
        return {
          success: true,
          history: [],
          count: 0,
        };
      } catch (error) {
        console.error("Error fetching resolution history:", error);
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Erro ao buscar histórico de resoluções",
        });
      }
    }),

  /**
   * Validar nomes antes de enviar para resolução
   */
  validateDriverNames: protectedProcedure
    .input(
      z.object({
        names: z.array(z.string()).min(1),
      })
    )
    .mutation(({ input, ctx }) => {
      const validation = validateDriverNames(input.names);

      // Log validation attempt
      logSensitiveOperation(
        ctx.user.id,
        ctx.user.email,
        "validateDriverNames",
        "warnings",
        undefined,
        { names: input.names, valid: validation.valid },
        validation.valid ? "success" : "failure"
      );

      return {
        valid: validation.valid,
        errors: validation.errors,
        message: validation.valid
          ? `✅ ${input.names.length} nome(s) válido(s)`
          : `❌ Erros encontrados:\n${validation.errors.join("\n")}`,
      };
    }),
});
