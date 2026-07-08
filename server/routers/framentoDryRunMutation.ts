import { z } from "zod";
import { protectedProcedure } from "../_core/trpc";
import { TRPCError } from "@trpc/server";

/**
 * Dry Run mutation para importação em massa Framento v4
 * Processa arquivo Excel e gera PDFs SEM salvar no banco de dados
 * Ideal para validação antes de importação em produção
 */
export const framentoDryRunMutation = protectedProcedure
  .input(
    z.object({
      arquivo: z.instanceof(Buffer),
      cnpj: z.string().optional(),
      empresa: z.string().optional(),
      endereco: z.string().optional(),
    })
  )
  .mutation(async ({ input, ctx }) => {
    try {
      const { processarArquivoExcel } = await import(
        '../services/framentoBulkImportParserV4'
      );
      const { gerarZIPComPDFs } = await import(
        '../services/framentoPDFGeneratorV4'
      );

      // Processar arquivo
      const resultado = await processarArquivoExcel(input.arquivo);

      if (!resultado.success) {
        throw new TRPCError({
          code: 'BAD_REQUEST',
          message: `Erro ao processar arquivo: ${resultado.erros[0]?.erro || 'Desconhecido'}`,
        });
      }

      // Gerar PDFs (sem salvar no BD)
      const pdfMap = await gerarZIPComPDFs(resultado.warnings, {
        cnpj: input.cnpj,
        empresa: input.empresa,
        endereco: input.endereco,
      });

      // Contar quantas advertências seriam criadas
      const wouldBeCreated = resultado.warnings.filter(
        (w) => w.status === 'ADVERTENCIA'
      );

      // Converter Map para array com URLs
      const pdfs = Array.from(pdfMap.entries()).map(([name, data]) => ({
        name,
        url: data.url,
      }));

      return {
        success: true,
        dryRun: true,
        totalProcessado: resultado.resumo.total,
        advertenciasQueSeriaoCriadas: wouldBeCreated.length,
        emRevisao: resultado.resumo.emRevisao,
        conferencia: resultado.resumo.conferencia,
        pdfs,
        abaSelecionada: resultado.abaSelecionada,
        erros: resultado.erros,
        avisoImportante:
          'Este é um Dry Run - nenhum dado foi salvo no banco de dados. Revise os PDFs e execute a importação real quando estiver pronto.',
      };
    } catch (error) {
      console.error('[framentoDryRun] Erro:', error);
      if (error instanceof TRPCError) throw error;
      throw new TRPCError({
        code: 'INTERNAL_SERVER_ERROR',
        message: `Erro ao processar dry run v4: ${String(error)}`,
      });
    }
  });
