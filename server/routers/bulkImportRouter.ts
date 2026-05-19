import { z } from "zod";
import { protectedProcedure, router } from "../_core/trpc";
import { getDb } from "../db";
import { branches, importBatches, importBatchDetails, warnings } from "../../drizzle/schema";
import { parseExcelFile, groupByMotorista } from "../services/bulkImportParser";
import { analisarLote } from "../services/infractionEngine";
import { gerarMultiplosPdfs } from "../services/bulkWarningPdfGenerator";
import { eq } from "drizzle-orm";
import { createAuditLog } from "../services/auditLogService";

export const bulkImportRouter = router({
  /**
   * Processa arquivo Excel e retorna análise prévia
   */
  previewImport: protectedProcedure
    .input(
      z.object({
        fileBase64: z.string().describe("Arquivo Excel em base64"),
        fileName: z.string().describe("Nome do arquivo"),
      })
    )
    .mutation(async ({ input, ctx }) => {
      try {
        const buffer = Buffer.from(input.fileBase64, "base64");
        const { rows, errors } = await parseExcelFile(buffer);

        if (errors.length > 0) {
          return {
            success: false,
            errors,
            preview: null,
          };
        }

        // Agrupa por motorista
        const motoristas = groupByMotorista(rows);

        // Analisa infrações
        const analises = analisarLote(motoristas);

        // Filtra apenas motoristas com infrações
        const comInfracao = analises.filter((a) => a.temInfracao);

        return {
          success: true,
          errors: [],
          preview: {
            totalLinhas: rows.length,
            totalMotoristas: motoristas.length,
            totalComInfracao: comInfracao.length,
            motoristas: comInfracao.map((a) => ({
              cpf: a.cpf,
              nome: a.nome,
              operacao: a.operacao,
              placa: a.placa,
              totalOcorrencias: a.totalOcorrencias,
              nivelAdvertencia: a.nivelAdvertencia,
              infracoesQtd: a.infracoesDetectadas.length,
            })),
          },
        };
      } catch (error) {
        return {
          success: false,
          errors: [`Erro ao processar arquivo: ${String(error)}`],
          preview: null,
        };
      }
    }),

  /**
   * Executa importação em massa
   */
  executeImport: protectedProcedure
    .input(
      z.object({
        fileBase64: z.string(),
        fileName: z.string(),
      })
    )
    .mutation(async ({ input, ctx }) => {
      const db = await getDb();
      if (!db) {
        throw new Error("Database not available");
      }

      try {
        const buffer = Buffer.from(input.fileBase64, "base64");
        const { rows, errors } = await parseExcelFile(buffer);

        if (errors.length > 0) {
          throw new Error(`Erros na validação: ${errors.join("; ")}`);
        }

        // Agrupa por motorista
        const motoristas = groupByMotorista(rows);

        // Analisa infrações
        const analises = analisarLote(motoristas);
        const comInfracao = analises.filter((a) => a.temInfracao);

        // Cria lote de importação
        const batchResult = await db.insert(importBatches).values({
          nomeArquivo: input.fileName,
          hashArquivo: `hash_${Date.now()}`,
          totalLinhas: rows.length,
          totalMotoristas: motoristas.length,
          totalAdvertenciasGeradas: comInfracao.length,
          totalSemInfracao: analises.filter((a) => !a.temInfracao).length,
          status: "processando",
          importadoPor: ctx.user.email,
        });

        const batchId = (batchResult as any).insertId;

        // Obtém informações da filial (sempre Chapecó)
        const branch = await db
          .select()
          .from(branches)
          .where(eq(branches.operacaoNome, comInfracao[0]?.operacao || "BRF EMBU"))
          .limit(1);

        const branchInfo = branch[0] || {
          nome: "FILIAL CHAPECÓ",
          cnpj: "00.766.315/0001-44",
          endereco: "R Borges De Medeiros, 897",
          cidade: "CHAPECO",
          uf: "SC",
        };

        // Gera PDFs
        const pdfsGerados = await gerarMultiplosPdfs(
          comInfracao,
          ctx.user.email,
          branchInfo
        );

        // Cria advertências no banco
        const warningsCreated: number[] = [];

        for (const { analise, pdf } of pdfsGerados) {
          const warningResult = await db.insert(warnings).values({
            conductorName: analise.nome,
            tipo: analise.nivelAdvertencia >= 3 ? "suspensao" : "advertencia",
            categoria: "outro",
            nivelAdvertencia: analise.nivelAdvertencia,
            motivo: analise.textoAdvertencia,
            observacao: `Importado em massa de ${input.fileName}`,
            aplicadoPor: ctx.user.email,
            advertenciaGerada: true,
            geradaAutomaticamente: true,
            criadoEm: new Date(),
          });

          const warningId = (warningResult as any).insertId;
          warningsCreated.push(warningId);

          // Registra detalhes do lote
          await db.insert(importBatchDetails).values({
            batchId,
            warningId,
            cpf: analise.cpf,
            nomeConductor: analise.nome,
            operacao: analise.operacao,
            totalOcorrencias: analise.totalOcorrencias,
            infracoesDetectadas: JSON.stringify(
              analise.infracoesDetectadas.map((i) => i.tipo)
            ),
            status: "sucesso",
          });
        }

        // Atualiza status do lote
        await db
          .update(importBatches)
          .set({
            status: "concluido",
            concluidoEm: new Date(),
          })
          .where(eq(importBatches.id, batchId));

        // Registra auditoria
        await createAuditLog({
          userId: ctx.user.id,
          userName: ctx.user.name,
          userEmail: ctx.user.email,
          action: "create" as any,
          resource: "warning" as any,
          description: `Importação em massa: ${comInfracao.length} advertências geradas`,
          details: {
            fileName: input.fileName,
            totalLinhas: rows.length,
            totalMotoristas: motoristas.length,
            advertenciasGeradas: comInfracao.length,
            batchId,
          },
        });

        return {
          success: true,
          batchId,
          totalAdvertenciasGeradas: comInfracao.length,
          totalSemInfracao: analises.filter((a) => !a.temInfracao).length,
          warningsCreated,
        };
      } catch (error) {
        console.error("Erro na importação:", error);
        throw error;
      }
    }),

  /**
   * Lista histórico de importações
   */
  listBatches: protectedProcedure.query(async ({ ctx }) => {
    const db = await getDb();
    if (!db) {
      throw new Error("Database not available");
    }

    const batches = await db
      .select()
      .from(importBatches);

    return batches;
  }),

  /**
   * Obtém detalhes de um lote
   */
  getBatchDetails: protectedProcedure
    .input(z.object({ batchId: z.number() }))
    .query(async ({ input }) => {
      const db = await getDb();
      if (!db) {
        throw new Error("Database not available");
      }

      const batch = await db
        .select()
        .from(importBatches)
      .where(eq(importBatches.id, input.batchId))
      .limit(1);

      if (!batch.length) {
        throw new Error("Lote não encontrado");
      }

      const details = await db
        .select()
        .from(importBatchDetails)
        .where(eq(importBatchDetails.batchId, input.batchId));

      return {
        batch: batch[0],
        details,
      };
    }),
});
