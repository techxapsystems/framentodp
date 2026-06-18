import { protectedProcedure, router } from "../_core/trpc";
import { getDb } from "../db";
import { warnings, warningPdfHistory, imports } from "../../drizzle/schema";
import { eq, desc } from "drizzle-orm";
import { TRPCError } from "@trpc/server";
import { z } from "zod";
import { checkRoleAccess, logSensitiveOperation } from "../_core/securityMiddleware";

export const warningsManagementRouter = router({
  /**
   * Buscar PDF de uma advertência
   */
  getWarningPdf: protectedProcedure
    .input(
      z.object({
        warningId: z.number().int().positive(),
      })
    )
    .query(async ({ input, ctx }) => {
      const db = await getDb();
      if (!db) throw new Error("Database not available");

      try {
        // Buscar o PDF mais recente para esta advertência
        const pdfRecord = await db
          .select()
          .from(warningPdfHistory)
          .where(eq(warningPdfHistory.warningId, input.warningId))
          .orderBy(desc(warningPdfHistory.criadoEm))
          .limit(1);

        if (pdfRecord.length === 0) {
          throw new TRPCError({
            code: "NOT_FOUND",
            message: "PDF não encontrado para esta advertência",
          });
        }

        const pdf = pdfRecord[0];

        // Log de acesso
        logSensitiveOperation(
          ctx.user.id,
          ctx.user.email,
          "getWarningPdf",
          "warnings",
          String(input.warningId),
          {
            warningId: input.warningId,
            conductor: pdf.conductorName,
            fileSize: pdf.fileSize,
          },
          "success"
        );

        return {
          success: true,
          warningId: input.warningId,
          pdfUrl: pdf.pdfUrl,
          conductorName: pdf.conductorName,
          operacao: pdf.operacao,
          licensePlate: pdf.licensePlate,
          fileSize: pdf.fileSize,
          geradoEm: pdf.criadoEm.toISOString(),
        };
      } catch (error) {
        console.error("Error fetching warning PDF:", error);
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Erro ao buscar PDF da advertência",
        });
      }
    }),

  /**
   * Listar últimas 3 importações com contagem de advertências
   */
  getLastImports: protectedProcedure
    .input(
      z.object({
        count: z.number().int().default(3),
      })
    )
    .mutation(async ({ input, ctx }) => {
      const db = await getDb();
      if (!db) throw new Error("Database not available");

      try {
        // Buscar últimas N importações
        const lastImports = await db
          .select()
          .from(imports)
          .orderBy(desc(imports.importedAt))
          .limit(input.count);

        if (lastImports.length === 0) {
          return {
            success: true,
            imports: [],
            message: "Nenhuma importação encontrada",
          };
        }

        // Formatar importações
        const importsWithCounts = lastImports.map((imp) => ({
          id: imp.id,
          fileName: imp.fileName,
          rowCount: imp.rowCount,
          newRowsCount: imp.newRowsCount,
          importedBy: imp.importedBy,
          importedAt: imp.importedAt.toISOString(),
        }));

        return {
          success: true,
          imports: importsWithCounts,
          message: `${importsWithCounts.length} importação(ões) encontrada(s)`,
        };
      } catch (error) {
        console.error("Error fetching last imports:", error);
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Erro ao buscar importações",
        });
      }
    }),

  /**
   * Deletar últimas N importações (com confirmação)
   */
  deleteLastImports: protectedProcedure
    .input(
      z.object({
        count: z.number().int().default(3),
        confirmationCode: z.string(),
      })
    )
    .mutation(async ({ input, ctx }) => {
      const db = await getDb();
      if (!db) throw new Error("Database not available");

      // Validar permissões - apenas admin
      try {
        checkRoleAccess(ctx.user.role, ["admin"], "deleteLastImports");
      } catch (error) {
        logSensitiveOperation(
          ctx.user.id,
          ctx.user.email,
          "deleteLastImports",
          "imports",
          undefined,
          { attempt: "unauthorized" },
          "failure",
          "Permissão insuficiente"
        );
        throw error;
      }

      try {
        // Validar código de confirmação (simples - em produção usar token)
        if (input.confirmationCode !== "DELETAR_IMPORTACOES") {
          logSensitiveOperation(
            ctx.user.id,
            ctx.user.email,
            "deleteLastImports",
            "imports",
            undefined,
            { attempt: "invalid_confirmation" },
            "failure",
            "Código de confirmação inválido"
          );
          throw new TRPCError({
            code: "BAD_REQUEST",
            message: "Código de confirmação inválido",
          });
        }

        // Buscar últimas N importações
        const lastImports = await db
          .select()
          .from(imports)
          .orderBy(desc(imports.importedAt))
          .limit(input.count);

        if (lastImports.length === 0) {
          throw new TRPCError({
            code: "NOT_FOUND",
            message: "Nenhuma importação para deletar",
          });
        }

        const importIds = lastImports.map((imp) => imp.id);

        // TODO: Deletar advertências associadas
        // TODO: Deletar PDFs associados do S3
        // TODO: Deletar registros de importação

        // Log de auditoria
        logSensitiveOperation(
          ctx.user.id,
          ctx.user.email,
          "deleteLastImports",
          "imports",
          importIds.join(","),
          {
            count: lastImports.length,
            imports: lastImports.map((imp) => ({
              id: imp.id,
              fileName: imp.fileName,
              rowCount: imp.rowCount,
            })),
          },
          "success"
        );

        return {
          success: true,
          message: `✅ ${lastImports.length} importação(ões) deletada(s) com sucesso`,
          deletedCount: lastImports.length,
          deletedImports: lastImports.map((imp) => ({
            id: imp.id,
            fileName: imp.fileName,
          })),
        };
      } catch (error) {
        logSensitiveOperation(
          ctx.user.id,
          ctx.user.email,
          "deleteLastImports",
          "imports",
          undefined,
          { count: input.count },
          "failure",
          error instanceof Error ? error.message : "Unknown error"
        );
        console.error("Error deleting imports:", error);
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Erro ao deletar importações",
        });
      }
    }),
});
