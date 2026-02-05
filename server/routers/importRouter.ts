import { protectedProcedure, router } from "../_core/trpc";
import { z } from "zod";
import { importExcelIncremental, validateExcelStructure } from "../services/importService";
import {
  createImport,
  createJourneys,
  getImportHistory,
  getLastImport,
  getDb,
} from "../db";
import { recalculateForDate, calculateRecurrences } from "../services/analysisService";
import { getConfigurations } from "../db";
import { createHash } from "crypto";
import { journeys, imports } from "../../drizzle/schema";
import { desc } from "drizzle-orm";

export const importRouter = router({
  /**
   * Valida estrutura do arquivo Excel antes de importar
   */
  validateFile: protectedProcedure
    .input(z.object({ fileName: z.string(), fileBuffer: z.string() }))
    .mutation(async ({ input }) => {
      try {
        const buffer = Buffer.from(input.fileBuffer, "base64");
        const validation = validateExcelStructure(buffer);

        return {
          success: validation.valid,
          message: validation.message,
          sheetName: validation.sheetName,
        };
      } catch (error) {
        return {
          success: false,
          message: `Erro ao validar: ${String(error)}`,
        };
      }
    }),

  /**
   * Importa arquivo Excel incrementalmente
   */
  importFile: protectedProcedure
    .input(z.object({ fileName: z.string(), fileBuffer: z.string() }))
    .mutation(async ({ input, ctx }) => {
      try {
        const buffer = Buffer.from(input.fileBuffer, "base64");
        const fileHash = createHash("md5").update(buffer).digest("hex");

        // Importar incrementalmente
        const importResult = await importExcelIncremental(buffer, input.fileName);

        if (!importResult.success) {
          return {
            success: false,
            message: importResult.message,
            error: importResult.error,
          };
        }

        if (importResult.newRows === 0) {
          return {
            success: true,
            message: "Nenhuma linha nova para importar",
            totalRows: importResult.totalRows,
            newRows: 0,
          };
        }

        // Salvar importação no banco
        const db = await getDb();
        if (!db) throw new Error("Database not available");

        const importRecord = await createImport({
          fileName: input.fileName,
          fileHash,
          rowCount: importResult.totalRows,
          newRowsCount: importResult.newRows,
          importedBy: ctx.user.id,
        });

        // Obter ID da importação
        const lastImport = await getLastImport();
        const importId = lastImport?.id || 1;

        // Atualizar journeys com importId
        const journeyList = importResult.newJourneys.map((j) => ({
          ...j,
          importId,
        }));

        // Inserir jornadas
        await createJourneys(journeyList);

        // Recalcular análises para a última data importada
        const config = await getConfigurations();
        if (journeyList.length > 0) {
          const lastDate = journeyList[journeyList.length - 1].data;
          await recalculateForDate(lastDate, config);
        }

        return {
          success: true,
          message: `${importResult.newRows} linha(s) importada(s) com sucesso`,
          totalRows: importResult.totalRows,
          newRows: importResult.newRows,
        };
      } catch (error) {
        console.error("[ImportRouter] Error:", error);
        return {
          success: false,
          message: "Erro ao importar arquivo",
          error: String(error),
        };
      }
    }),

  /**
   * Obtém histórico de importações
   */
  getHistory: protectedProcedure
    .input(z.object({ limit: z.number().default(20) }))
    .query(async ({ input }) => {
      try {
        const history = await getImportHistory(input.limit);
        return {
          success: true,
          data: history,
        };
      } catch (error) {
        return {
          success: false,
          message: String(error),
          data: [],
        };
      }
    }),

  /**
   * Recalcula análises para uma data específica
   */
  recalculate: protectedProcedure
    .input(z.object({ date: z.string() }))
    .mutation(async ({ input }) => {
      try {
        const config = await getConfigurations();
        const targetDate = new Date(input.date);

        const result = await recalculateForDate(targetDate, config);

        return {
          success: result.success,
          message: result.message,
        };
      } catch (error) {
        return {
          success: false,
          message: String(error),
        };
      }
    }),
});
