import { z } from "zod";
import { protectedProcedure, router } from "../_core/trpc";
import { getDb } from "../db";
import { warnings, conductors, recurrences } from "../../drizzle/schema";
import { eq, and, gte, lte, desc } from "drizzle-orm";
import { TRPCError } from "@trpc/server";
import { invokeLLM } from "../_core/llm";

/**
 * Buscar dados agregados para contexto de IA
 */
async function getWarningsContext(params: {
  startDate: Date;
  endDate: Date;
  operacao?: string;
}) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  try {
    // 1. Buscar todas as advertências no período
    const allWarnings = await db
      .select()
      .from(warnings)
      .where(
        and(
          gte(warnings.criadoEm, params.startDate),
          lte(warnings.criadoEm, params.endDate)
        )
      )
      .orderBy(desc(warnings.criadoEm));

    // 2. Buscar dados dos motoristas
    const conductorsList = await db.select().from(conductors);
    const conductorMap = new Map(conductorsList.map((c: any) => [c.nome, c]));

    // 3. Filtrar por operação se fornecido
    let filteredWarnings = allWarnings;
    if (params.operacao) {
      filteredWarnings = allWarnings.filter((warning: any) => {
        const conductor = conductorMap.get(warning.conductorName);
        return conductor && conductor.operacao === params.operacao;
      });
    }

    // 4. Agrupar por motorista para análise
    const warningsByDriver: Record<string, any> = {};
    filteredWarnings.forEach((warning: any) => {
      if (!warningsByDriver[warning.conductorName]) {
        warningsByDriver[warning.conductorName] = {
          nome: warning.conductorName,
          operacao: conductorMap.get(warning.conductorName)?.operacao || "Desconhecida",
          avisos: [],
          totalAvisos: 0,
          avisosPoucoRodado: 0,
          avisosHorasExtras: 0,
          ultimoAviso: null,
          nivelMaximo: 0,
        };
      }

      warningsByDriver[warning.conductorName].avisos.push({
        data: warning.criadoEm,
        tipo: warning.tipo,
        categoria: warning.categoria,
        nivel: warning.nivelAdvertencia,
        assinada: warning.advertenciaAplicada,
      });

      warningsByDriver[warning.conductorName].totalAvisos++;
      warningsByDriver[warning.conductorName].ultimoAviso = warning.criadoEm;
      warningsByDriver[warning.conductorName].nivelMaximo = Math.max(
        warningsByDriver[warning.conductorName].nivelMaximo,
        warning.nivelAdvertencia || 0
      );

      if (warning.categoria === "pouco_rodado") {
        warningsByDriver[warning.conductorName].avisosPoucoRodado++;
      } else if (warning.categoria === "horas_extras") {
        warningsByDriver[warning.conductorName].avisosHorasExtras++;
      }
    });

    // 5. Agrupar por operação
    const warningsByOperation: Record<string, any> = {};
    filteredWarnings.forEach((warning: any) => {
      const operacao = conductorMap.get(warning.conductorName)?.operacao || "Desconhecida";
      if (!warningsByOperation[operacao]) {
        warningsByOperation[operacao] = {
          nome: operacao,
          totalAvisos: 0,
          totalSuspensoes: 0,
          motoristasAfetados: new Set(),
          avisosPoucoRodado: 0,
          avisosHorasExtras: 0,
        };
      }

      warningsByOperation[operacao].totalAvisos++;
      warningsByOperation[operacao].motoristasAfetados.add(warning.conductorName);

      if (warning.tipo === "suspensao") {
        warningsByOperation[operacao].totalSuspensoes++;
      }

      if (warning.categoria === "pouco_rodado") {
        warningsByOperation[operacao].avisosPoucoRodado++;
      } else if (warning.categoria === "horas_extras") {
        warningsByOperation[operacao].avisosHorasExtras++;
      }
    });

    // 6. Calcular tendências
    const midDate = new Date(params.startDate.getTime() + (params.endDate.getTime() - params.startDate.getTime()) / 2);
    
    const firstHalf = filteredWarnings.filter((w: any) => w.criadoEm < midDate).length;
    const secondHalf = filteredWarnings.filter((w: any) => w.criadoEm >= midDate).length;
    
    const tendencia = firstHalf === 0 ? 0 : ((secondHalf - firstHalf) / firstHalf) * 100;
    const direcao = tendencia > 10 ? "PIORANDO" : tendencia < -10 ? "MELHORANDO" : "ESTÁVEL";

    // 7. Identificar motoristas em risco crítico
    const topMotoristas = Object.values(warningsByDriver)
      .sort((a: any, b: any) => b.totalAvisos - a.totalAvisos)
      .slice(0, 5);

    // 8. Identificar operações em risco
    const topOperacoes = Object.values(warningsByOperation)
      .map((op: any) => ({
        ...op,
        motoristasAfetados: op.motoristasAfetados.size,
      }))
      .sort((a: any, b: any) => b.totalAvisos - a.totalAvisos);

    return {
      periodo: {
        dataInicio: params.startDate.toISOString().split("T")[0],
        dataFim: params.endDate.toISOString().split("T")[0],
        diasAnalisados: Math.ceil((params.endDate.getTime() - params.startDate.getTime()) / (1000 * 60 * 60 * 24)),
      },
      metricas: {
        totalAdvertencias: filteredWarnings.filter((w: any) => w.tipo === "advertencia").length,
        totalSuspensoes: filteredWarnings.filter((w: any) => w.tipo === "suspensao").length,
        motoristesAfetados: Object.keys(warningsByDriver).length,
        operacoes: Object.keys(warningsByOperation).length,
      },
      tendencias: {
        primeiraMetade: firstHalf,
        segundaMetade: secondHalf,
        percentualMudanca: parseFloat(tendencia.toFixed(1)),
        direcao,
      },
      topMotoristas,
      topOperacoes,
      warningsByDriver,
      warningsByOperation,
    };
  } catch (error) {
    console.error("[WarningsAI] Error getting context:", error);
    throw error;
  }
}

/**
 * Gerar insights preditivos com IA
 */
export const warningsAIRouter = router({
  getAIInsights: protectedProcedure
    .input(
      z.object({
        startDate: z.string(),
        endDate: z.string(),
        operacao: z.string().optional(),
      })
    )
    .query(async ({ input, ctx }) => {
      try {
        const startDate = new Date(input.startDate);
        const endDate = new Date(input.endDate);
        endDate.setHours(23, 59, 59, 999);

        // Buscar contexto de dados
        const context = await getWarningsContext({
          startDate,
          endDate,
          operacao: input.operacao,
        });

        // Montar prompt para IA - FORMATO EXECUTIVO
        const topMotoristas = context.topMotoristas.slice(0, 3); // Apenas top 3
        const topOperacoes = context.topOperacoes.slice(0, 3); // Apenas top 3
        
        const prompt = `
Você é um analista de operações de transporte. Gere um RESUMO EXECUTIVO em formato CONCISO.

DADOS (${context.periodo.dataInicio} a ${context.periodo.dataFim}):
- Advertências: ${context.metricas.totalAdvertencias} | Suspensões: ${context.metricas.totalSuspensoes}
- Motoristas: ${context.metricas.motoristesAfetados} | Tendência: ${context.tendencias.direcao} (${context.tendencias.percentualMudanca}%)

TOP 3 MOTORISTAS EM RISCO:
${topMotoristas
  .map((m: any) => `- ${m.nome}: ${m.totalAvisos} avisos (nível ${m.nivelMaximo})`)
  .join("\n")}

TOP 3 OPERAÇÕES:
${topOperacoes
  .map((op: any) => `- ${op.nome}: ${op.totalAvisos} avisos, ${op.totalSuspensoes} suspensões`)
  .join("\n")}

GERE EXATAMENTE 5 SEÇÕES (máximo 2-3 linhas cada):
1. **Risco Iminente**: Top 3 motoristas + probabilidade de suspensão
2. **Operações em Crise**: Qual está piorando + causa principal
3. **Padrão Principal**: Tipo de violação mais comum
4. **Ação Imediata**: 1-2 ações prioritárias
5. **Outlook**: Predição para próximos 7 dias

Seja MUITO CONCISO. Use bullet points. Sem explicações longas.
`;

        // Chamar IA
        const response = await invokeLLM({
          messages: [
            {
              role: "system",
              content:
                "Você é um analista de operações especializado em segurança de transporte. Forneça insights preditivos baseados em dados de advertências e suspensões.",
            },
            {
              role: "user",
              content: prompt,
            },
          ],
        });

        const insightText = response.choices[0]?.message?.content || "Não foi possível gerar insights.";

        return {
          success: true,
          insights: insightText,
          context: {
            periodo: context.periodo,
            metricas: context.metricas,
            tendencias: context.tendencias,
            topMotoristas: context.topMotoristas.slice(0, 3),
            topOperacoes: context.topOperacoes.slice(0, 3),
          },
        };
      } catch (error) {
        console.error("[WarningsAI] Error generating insights:", error);
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Erro ao gerar insights de IA",
        });
      }
    }),

  /**
   * Chat para queries operacionais
   */
  warningsChat: protectedProcedure
    .input(
      z.object({
        message: z.string(),
        startDate: z.string(),
        endDate: z.string(),
        operacao: z.string().optional(),
        conversationHistory: z
          .array(
            z.object({
              role: z.enum(["user", "assistant"]),
              content: z.string(),
            })
          )
          .optional()
          .default([]),
      })
    )
    .mutation(async ({ input, ctx }) => {
      try {
        const startDate = new Date(input.startDate);
        const endDate = new Date(input.endDate);
        endDate.setHours(23, 59, 59, 999);

        // Buscar contexto de dados
        const context = await getWarningsContext({
          startDate,
          endDate,
          operacao: input.operacao,
        });

        // Montar contexto para o chat
        const systemPrompt = `
Você é um assistente de operações de transporte especializado em análise de advertências e segurança.

CONTEXTO ATUAL:
- Período: ${context.periodo.dataInicio} a ${context.periodo.dataFim}
- Total de Advertências: ${context.metricas.totalAdvertencias}
- Total de Suspensões: ${context.metricas.totalSuspensoes}
- Motoristas Afetados: ${context.metricas.motoristesAfetados}
- Tendência: ${context.tendencias.direcao} (${context.tendencias.percentualMudanca}%)

MOTORISTAS EM RISCO:
${context.topMotoristas
  .map((m: any) => `- ${m.nome}: ${m.totalAvisos} avisos, nível ${m.nivelMaximo}`)
  .join("\n")}

OPERAÇÕES:
${context.topOperacoes
  .map((op: any) => `- ${op.nome}: ${op.totalAvisos} avisos, ${op.totalSuspensoes} suspensões`)
  .join("\n")}

Responda perguntas sobre:
- Status de motoristas específicos
- Tendências de operações
- Recomendações de ações
- Padrões de violações
- Comparações entre períodos/operações

Seja conciso, profissional e baseie-se nos dados disponíveis.
`;

        // Construir histórico de mensagens
        const messages: any[] = [
          {
            role: "system",
            content: systemPrompt,
          },
          ...input.conversationHistory,
          {
            role: "user",
            content: input.message,
          },
        ];

        // Chamar IA
        const response = await invokeLLM({
          messages,
        });

        const assistantMessage = response.choices[0]?.message?.content || "Desculpe, não consegui processar sua pergunta.";

        return {
          success: true,
          message: assistantMessage,
        };
      } catch (error) {
        console.error("[WarningsAI] Error in chat:", error);
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Erro ao processar sua pergunta",
        });
      }
    }),
});
