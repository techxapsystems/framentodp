import { router, protectedProcedure, adminProcedure } from "../_core/trpc";
import { z } from "zod";
import {
  getAuditLogs,
  getAuditLogsCount,
  getUserAuditLogs,
  getActionAuditLogs,
  getResourceAuditLogs,
  getAuditLogsByDateRange,
  getAuditLogStats,
  deleteOldAuditLogs,
} from "../services/auditLogService";
import { TRPCError } from "@trpc/server";

export const auditRouter = router({
  /**
   * Obter logs de auditoria com filtros
   * Apenas admin pode acessar
   */
  getLogs: adminProcedure
    .input(
      z.object({
        userId: z.number().optional(),
        action: z.string().optional(),
        resource: z.string().optional(),
        startDate: z.date().optional(),
        endDate: z.date().optional(),
        limit: z.number().int().min(1).max(500).default(50),
        offset: z.number().int().min(0).default(0),
      })
    )
    .query(async ({ input }) => {
      try {
        const logs = await getAuditLogs({
          userId: input.userId,
          action: input.action,
          resource: input.resource,
          startDate: input.startDate,
          endDate: input.endDate,
          limit: input.limit,
          offset: input.offset,
        });

        const count = await getAuditLogsCount({
          userId: input.userId,
          action: input.action,
          resource: input.resource,
          startDate: input.startDate,
          endDate: input.endDate,
        });

        return {
          logs,
          total: count,
          limit: input.limit,
          offset: input.offset,
        };
      } catch (error) {
        console.error("Erro ao obter logs:", error);
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Erro ao obter logs de auditoria",
        });
      }
    }),

  /**
   * Obter logs do usuário atual
   */
  getMyLogs: protectedProcedure
    .input(
      z.object({
        limit: z.number().int().min(1).max(100).default(20),
        offset: z.number().int().min(0).default(0),
      })
    )
    .query(async ({ ctx, input }) => {
      try {
        if (!ctx.user) {
          throw new TRPCError({ code: "UNAUTHORIZED" });
        }

        const logs = await getUserAuditLogs(ctx.user.id, {
          limit: input.limit,
          offset: input.offset,
        });

        return logs;
      } catch (error) {
        console.error("Erro ao obter meus logs:", error);
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Erro ao obter seus logs",
        });
      }
    }),

  /**
   * Obter logs de uma ação específica
   * Apenas admin
   */
  getActionLogs: adminProcedure
    .input(
      z.object({
        action: z.string(),
        limit: z.number().int().min(1).max(100).default(50),
        offset: z.number().int().min(0).default(0),
      })
    )
    .query(async ({ input }) => {
      try {
        const logs = await getActionAuditLogs(input.action as any, {
          limit: input.limit,
          offset: input.offset,
        });

        return logs;
      } catch (error) {
        console.error("Erro ao obter logs de ação:", error);
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Erro ao obter logs",
        });
      }
    }),

  /**
   * Obter logs de um recurso específico
   * Apenas admin
   */
  getResourceLogs: adminProcedure
    .input(
      z.object({
        resource: z.string(),
        limit: z.number().int().min(1).max(100).default(50),
        offset: z.number().int().min(0).default(0),
      })
    )
    .query(async ({ input }) => {
      try {
        const logs = await getResourceAuditLogs(input.resource as any, {
          limit: input.limit,
          offset: input.offset,
        });

        return logs;
      } catch (error) {
        console.error("Erro ao obter logs de recurso:", error);
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Erro ao obter logs",
        });
      }
    }),

  /**
   * Obter logs por período
   * Apenas admin
   */
  getLogsByDateRange: adminProcedure
    .input(
      z.object({
        startDate: z.date(),
        endDate: z.date(),
        limit: z.number().int().min(1).max(500).default(100),
        offset: z.number().int().min(0).default(0),
      })
    )
    .query(async ({ input }) => {
      try {
        if (input.startDate > input.endDate) {
          throw new TRPCError({
            code: "BAD_REQUEST",
            message: "Data inicial não pode ser maior que data final",
          });
        }

        const logs = await getAuditLogsByDateRange(input.startDate, input.endDate, {
          limit: input.limit,
          offset: input.offset,
        });

        return logs;
      } catch (error) {
        console.error("Erro ao obter logs por período:", error);
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Erro ao obter logs",
        });
      }
    }),

  /**
   * Obter estatísticas de logs
   * Apenas admin
   */
  getStats: adminProcedure
    .input(
      z.object({
        startDate: z.date().optional(),
        endDate: z.date().optional(),
      })
    )
    .query(async ({ input }) => {
      try {
        const stats = await getAuditLogStats(input.startDate, input.endDate);
        return stats;
      } catch (error) {
        console.error("Erro ao obter estatísticas:", error);
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Erro ao obter estatísticas",
        });
      }
    }),

  /**
   * Deletar logs antigos
   * Apenas admin
   */
  deleteOldLogs: adminProcedure
    .input(
      z.object({
        daysOld: z.number().int().min(1).default(90),
      })
    )
    .mutation(async ({ input }) => {
      try {
        const deletedCount = await deleteOldAuditLogs(input.daysOld);
        return {
          success: true,
          message: `Logs com mais de ${input.daysOld} dias foram deletados`,
        };
      } catch (error) {
        console.error("Erro ao deletar logs antigos:", error);
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Erro ao deletar logs",
        });
      }
    }),
});
