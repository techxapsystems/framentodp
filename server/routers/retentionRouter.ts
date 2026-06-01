import { router, adminProcedure } from "../_core/trpc";
import { z } from "zod";
import {
  getRetentionPolicies,
  getRetentionPolicy,
  upsertRetentionPolicy,
  executeAllCleanups,
  getCleanupHistory,
  getCleanupStats,
} from "../services/retentionService";
import { executeCleanupNow } from "../jobs/cleanupJob";
import { TRPCError } from "@trpc/server";

export const retentionRouter = router({
  /**
   * Obter todas as políticas de retenção
   * Apenas admin
   */
  getPolicies: adminProcedure.query(async () => {
    try {
      const policies = await getRetentionPolicies();
      return policies;
    } catch (error) {
      console.error("Erro ao obter políticas:", error);
      throw new TRPCError({
        code: "INTERNAL_SERVER_ERROR",
        message: "Erro ao obter políticas de retenção",
      });
    }
  }),

  /**
   * Obter uma política específica
   * Apenas admin
   */
  getPolicy: adminProcedure
    .input(z.object({ resource: z.string() }))
    .query(async ({ input }) => {
      try {
        const policy = await getRetentionPolicy(input.resource);
        if (!policy) {
          throw new TRPCError({
            code: "NOT_FOUND",
            message: `Política não encontrada para: ${input.resource}`,
          });
        }
        return policy;
      } catch (error) {
        console.error("Erro ao obter política:", error);
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Erro ao obter política de retenção",
        });
      }
    }),

  /**
   * Criar ou atualizar uma política de retenção
   * Apenas admin
   */
  upsertPolicy: adminProcedure
    .input(
      z.object({
        resource: z.string().min(1),
        retentionDays: z.number().int().min(1).max(3650), // Máximo 10 anos
        enabled: z.boolean().optional(),
        autoDelete: z.boolean().optional(),
        description: z.string().optional(),
      })
    )
    .mutation(async ({ input, ctx }) => {
      try {
        const policy = await upsertRetentionPolicy({
          resource: input.resource,
          retentionDays: input.retentionDays,
          enabled: input.enabled,
          autoDelete: input.autoDelete,
          description: input.description,
        });

        if (!policy) {
          throw new TRPCError({
            code: "INTERNAL_SERVER_ERROR",
            message: "Erro ao salvar política",
          });
        }

        return policy;
      } catch (error) {
        console.error("Erro ao salvar política:", error);
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Erro ao salvar política de retenção",
        });
      }
    }),

  /**
   * Executar limpeza manual de todos os recursos
   * Apenas admin
   */
  executeCleanup: adminProcedure.mutation(async ({ ctx }) => {
    try {
      if (!ctx.user) {
        throw new TRPCError({ code: "UNAUTHORIZED" });
      }

      const result = await executeCleanupNow();

      return {
        success: result.success,
        totalRecordsDeleted: result.totalRecordsDeleted,
        results: result.results,
        executedBy: ctx.user.email,
        executedAt: new Date(),
      };
    } catch (error) {
      console.error("Erro ao executar limpeza:", error);
      throw new TRPCError({
        code: "INTERNAL_SERVER_ERROR",
        message: "Erro ao executar limpeza de dados",
      });
    }
  }),

  /**
   * Obter histórico de limpezas
   * Apenas admin
   */
  getCleanupHistory: adminProcedure
    .input(
      z.object({
        resource: z.string().optional(),
        limit: z.number().int().min(1).max(100).default(50),
        offset: z.number().int().min(0).default(0),
      })
    )
    .query(async ({ input }) => {
      try {
        const history = await getCleanupHistory({
          resource: input.resource,
          limit: input.limit,
          offset: input.offset,
        });

        return history;
      } catch (error) {
        console.error("Erro ao obter histórico:", error);
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Erro ao obter histórico de limpeza",
        });
      }
    }),

  /**
   * Obter estatísticas de limpeza
   * Apenas admin
   */
  getStats: adminProcedure.query(async () => {
    try {
      const stats = await getCleanupStats();
      return stats;
    } catch (error) {
      console.error("Erro ao obter estatísticas:", error);
      throw new TRPCError({
        code: "INTERNAL_SERVER_ERROR",
        message: "Erro ao obter estatísticas de limpeza",
      });
    }
  }),
});
