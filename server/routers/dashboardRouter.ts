import { protectedProcedure, router } from "../_core/trpc";
import { z } from "zod";
import { getDb } from "../db";
import {
  journeys,
  recurrences,
  suggestedActions,
  treatments,
  warnings,
  warningPdfHistory,
} from "../../drizzle/schema";
import { savePdfHistory, getPdfHistoryByWarningId, getPdfHistoryByDriver } from "../db";
import { eq, and, gte, lte, desc, inArray } from "drizzle-orm";
import { TRPCError } from "@trpc/server";

export const dashboardRouter = router({
  /**
   * Obtém dados do dia para o dashboard HOJE
   */
  getTodayData: protectedProcedure
    .input(
      z.object({
        date: z.string(),
        dateEnd: z.string().optional(),
        gestores: z.array(z.string()).optional(),
        operacoes: z.array(z.string()).optional(),
      })
    )
    .query(async ({ input }) => {
      try {
        const db = await getDb();
        if (!db) throw new Error("Database not available");

        const startDate = new Date(input.date);
        const startOfDay = new Date(startDate);
        startOfDay.setHours(0, 0, 0, 0);
        
        const endDate = input.dateEnd ? new Date(input.dateEnd) : new Date(startDate);
        const endOfDay = new Date(endDate);
        endOfDay.setHours(23, 59, 59, 999);

        // Buscar jornadas do dia
        let query = db
          .select()
          .from(journeys)
          .where(
            and(gte(journeys.data, startOfDay), lte(journeys.data, endOfDay))
          );

        const dayJourneys = await query;

        // Filtrar por gestor e operação
        let filtered = dayJourneys;
        if (input.gestores && input.gestores.length > 0) {
          filtered = filtered.filter((j) =>
            input.gestores!.includes(j.gestorName || "")
          );
        }
        if (input.operacoes && input.operacoes.length > 0) {
          filtered = filtered.filter((j) =>
            input.operacoes!.includes(j.operacao || "")
          );
        }

        // Buscar reincidências
        const recurrenceData = await db
          .select()
          .from(recurrences)
          .where(
            and(
              gte(recurrences.data, startOfDay),
              lte(recurrences.data, endOfDay)
            )
          );

        // Buscar ações sugeridas
        const suggestedActionsData = await db
          .select()
          .from(suggestedActions)
          .where(
            and(
              gte(suggestedActions.data, startOfDay),
              lte(suggestedActions.data, endOfDay)
            )
          );

        // Buscar tratativas
        const treatmentsData = await db
          .select()
          .from(treatments)
          .where(
            and(gte(treatments.data, startOfDay), lte(treatments.data, endOfDay))
          );

        // Calcular KPIs
        const totalMotoristas = new Set(filtered.map((j) => j.conductorName))
          .size;
        const ofensoresPoucoRodado = filtered.filter((j) => j.poucoRodado).length;
        const heTotal = filtered.reduce((sum, j) => sum + j.heMin, 0);
        const motoristasComHe = new Set(
          filtered.filter((j) => j.temHe).map((j) => j.conductorName)
        ).size;

        // Agrupar ofensores pouco rodado
        const ofensoresPoucoRodadoList = filtered
          .filter((j) => j.poucoRodado)
          .map((j) => {
            const rec = recurrenceData.find(
              (r) => r.conductorName === j.conductorName
            );
            const action = suggestedActionsData.find(
              (a) =>
                a.journeyId === j.id
            );
            const treatment = treatmentsData.find(
              (t) =>
                t.journeyId === j.id
            );

            return {
              journeyId: j.id,
              condutor: j.conductorName,
              gestor: j.gestorName,
              dirigido: j.dirigidoMin,
              ocorJanela: rec?.ocorPoucoJanela || 0,
              ocor30d: rec?.ocorPouco30d || 0,
              acaoSugerida: action?.acao || "",
              severidade: action?.severidade || "info",
              status: treatment?.status || "pendente",
              observacao: treatment?.observacao || "",
            };
          })
          .sort(
            (a, b) =>
              b.ocorJanela - a.ocorJanela || a.dirigido - b.dirigido
          );

        // Agrupar ofensores horas extras
        const ofensoresHeList = filtered
          .filter((j) => j.temHe)
          .map((j) => {
            const rec = recurrenceData.find(
              (r) => r.conductorName === j.conductorName
            );
            const action = suggestedActionsData.find(
              (a) =>
                a.journeyId === j.id
            );
            const treatment = treatmentsData.find(
              (t) =>
                t.journeyId === j.id
            );

            return {
              journeyId: j.id,
              condutor: j.conductorName,
              gestor: j.gestorName,
              he: j.heMin,
              he50: j.he50Min,
              he100: j.he100Min,
              ocorJanela: rec?.ocorHeJanela || 0,
              ocor30d: rec?.ocorHe30d || 0,
              acaoSugerida: action?.acao || "",
              severidade: action?.severidade || "info",
              status: treatment?.status || "pendente",
              observacao: treatment?.observacao || "",
            };
          })
          .sort((a, b) => b.he - a.he || b.ocorJanela - a.ocorJanela);

        // Listar gestores e operações disponíveis
        const gestoresUnique = Array.from(
          new Set(dayJourneys.map((j) => j.gestorName).filter(Boolean))
        );
        const operacoesUnique = Array.from(
          new Set(dayJourneys.map((j) => j.operacao).filter(Boolean))
        );

        return {
          success: true,
          kpis: {
            totalMotoristas,
            ofensoresPoucoRodado,
            percentualOfensores: (
              (ofensoresPoucoRodado / totalMotoristas) *
              100
            ).toFixed(1),
            heTotal,
            motoristasComHe,
          },
          ofensoresPoucoRodado: ofensoresPoucoRodadoList,
          ofensoresHe: ofensoresHeList,
          filtros: {
            gestores: gestoresUnique,
            operacoes: operacoesUnique,
          },
        };
      } catch (error) {
        console.error("[DashboardRouter] Error:", error);
        return {
          success: false,
          message: String(error),
          kpis: {},
          ofensoresPoucoRodado: [],
          ofensoresHe: [],
          filtros: {},
        };
      }
    }),

  /**
   * Atualiza status e observação de uma tratativa
   */
  updateTreatment: protectedProcedure
    .input(
      z.object({
        journeyId: z.number(),
        tipo: z.enum(["pouco_rodado", "horas_extras"]),
        status: z.enum(["pendente", "em_andamento", "resolvido", "ignorado"]),
        observacao: z.string().optional(),
      })
    )
    .mutation(async ({ input, ctx }) => {
      try {
        const db = await getDb();
        if (!db) throw new Error("Database not available");

        // Buscar journey para obter dados
        const journey = await db
          .select()
          .from(journeys)
          .where(eq(journeys.id, input.journeyId))
          .limit(1);

        if (journey.length === 0) {
          return {
            success: false,
            message: "Jornada não encontrada",
          };
        }

        const j = journey[0];

        // Upsert treatment
        await db
          .insert(treatments)
          .values({
            journeyId: input.journeyId,
            conductorName: j.conductorName,
            data: j.data,
            tipo: input.tipo as any,
            status: input.status as any,
            observacao: input.observacao,
            atualizadoPor: ctx.user.id,
            atualizadoEm: new Date(),
          })
          .onDuplicateKeyUpdate({
            set: {
              status: input.status as any,
              observacao: input.observacao,
              atualizadoPor: ctx.user.id,
              atualizadoEm: new Date(),
            },
          });

        return {
          success: true,
          message: "Tratativa atualizada com sucesso",
        };
      } catch (error) {
        return {
          success: false,
          message: String(error),
        };
      }
    }),

  /**
   * Obtém dados de uma semana específica
   */
  getWeekData: protectedProcedure
    .input(z.object({ weekStart: z.string() }))
    .query(async ({ input }) => {
      try {
        const db = await getDb();
        if (!db) throw new Error("Database not available");

        const startDate = new Date(input.weekStart);
        const endDate = new Date(startDate);
        endDate.setDate(endDate.getDate() + 6);
        endDate.setHours(23, 59, 59, 999);

        // Buscar jornadas da semana
        const weekJourneys = await db
          .select()
          .from(journeys)
          .where(
            and(gte(journeys.data, startDate), lte(journeys.data, endDate))
          );

        // Agrupar por dia
        const byDay = new Map<string, any[]>();
        for (const j of weekJourneys) {
          const dayKey = j.data.toISOString().split("T")[0];
          if (!byDay.has(dayKey)) {
            byDay.set(dayKey, []);
          }
          byDay.get(dayKey)!.push(j);
        }

        // Calcular estatísticas por dia
        const dailyStats = Array.from(byDay).map(([day, dayJourneys]) => {
          const totalMotoristas = new Set(
            dayJourneys.map((j) => j.conductorName)
          ).size;
          const poucoRodado = dayJourneys.filter((j) => j.poucoRodado).length;
          const heTotal = dayJourneys.reduce((sum, j) => sum + j.heMin, 0);

          return {
            date: day,
            totalMotoristas,
            poucoRodado,
            percentualPoucoRodado: (
              (poucoRodado / totalMotoristas) *
              100
            ).toFixed(1),
            heTotal,
          };
        });

        // Top 10 reincidentes pouco rodado
        const conductorPoucoRodado = new Map<string, number>();
        for (const j of weekJourneys.filter((j) => j.poucoRodado)) {
          conductorPoucoRodado.set(
            j.conductorName,
            (conductorPoucoRodado.get(j.conductorName) || 0) + 1
          );
        }

        const topPoucoRodado = Array.from(conductorPoucoRodado)
          .sort((a, b) => b[1] - a[1])
          .slice(0, 10)
          .map(([name, count]) => ({ name, count }));

        // Top 10 HE
        const conductorHe = new Map<string, number>();
        for (const j of weekJourneys.filter((j) => j.temHe)) {
          conductorHe.set(
            j.conductorName,
            (conductorHe.get(j.conductorName) || 0) + j.heMin
          );
        }

        const topHe = Array.from(conductorHe)
          .sort((a, b) => b[1] - a[1])
          .slice(0, 10)
          .map(([name, minutes]) => ({ name, minutes }));

        return {
          success: true,
          dailyStats,
          topPoucoRodado,
          topHe,
        };
      } catch (error) {
        return {
          success: false,
          message: String(error),
          dailyStats: [],
          topPoucoRodado: [],
          topHe: [],
        };
      }
    }),

  /**
   * Obtém reincidentes com histórico de advertências
   */
  getReincidents: protectedProcedure
    .input(z.object({ tipo: z.enum(["pouco_rodado", "horas_extras"]).optional() }))
    .query(async ({ input }) => {
      try {
        const db = await getDb();
        if (!db) throw new Error("Database not available");

        const { getReincidentsWithWarnings } = await import("../db");
        const reincidents = await getReincidentsWithWarnings();

        let filtered = reincidents;
        if (input.tipo === "pouco_rodado") {
          filtered = reincidents.filter((r) => r.avisosPoucoRodado > 0);
        } else if (input.tipo === "horas_extras") {
          filtered = reincidents.filter((r) => r.avisosHorasExtras > 0);
        }

        return {
          success: true,
          reincidents: filtered,
        };
      } catch (error) {
        return {
          success: false,
          message: String(error),
          reincidents: [],
        };
      }
    }),

  /**
   * Busca todos os motoristas ociosos para o dialog de nova advertencia
   */
  getIdleDriversForWarning: protectedProcedure
    .query(async () => {
      try {
        const { getAllIdleDrivers } = await import("../db");
        const drivers = await getAllIdleDrivers();
        return {
          success: true,
          drivers,
        };
      } catch (error) {
        return {
          success: false,
          message: String(error),
          drivers: [],
        };
      }
    }),

  /**
   * Cria nova advertencia
   */
  createWarning: protectedProcedure
    .input(
      z.object({
        conductorName: z.string(),
        tipo: z.enum(["pouco_rodado", "horas_extras"]),
        nivelAdvertencia: z.number().min(1).max(3),
        motivo: z.string(),
        observacao: z.string().optional(),
      })
    )
    .mutation(async ({ input, ctx }) => {
      try {
        const db = await getDb();
        if (!db) throw new Error("Database not available");

        const { createWarning: createWarningDb } = await import("../db");
        await createWarningDb({
          conductorName: input.conductorName,
          tipo: input.tipo,
          nivelAdvertencia: input.nivelAdvertencia,
          motivo: input.motivo,
          observacao: input.observacao,
          aplicadoPor: ctx.user.email || ctx.user.name || "Sistema",
        });

        return {
          success: true,
          message: "Advertência registrada com sucesso",
        };
      } catch (error) {
        return {
          success: false,
          message: String(error),
        };
      }
    }),

  /**
   * Edita uma advertencia existente
   */
  updateWarning: protectedProcedure
    .input(
      z.object({
        warningId: z.number(),
        tipo: z.enum(["pouco_rodado", "horas_extras"]),
        nivelAdvertencia: z.number().min(1).max(3),
        motivo: z.string(),
        observacao: z.string().optional(),
      })
    )
    .mutation(async ({ input }) => {
      try {
        const { updateWarning: updateWarningDb } = await import("../db");
        await updateWarningDb(input.warningId, {
          tipo: input.tipo,
          nivelAdvertencia: input.nivelAdvertencia,
          motivo: input.motivo,
          observacao: input.observacao,
        });

        return {
          success: true,
          message: "Advertência atualizada com sucesso",
        };
      } catch (error) {
        return {
          success: false,
          message: String(error),
        };
      }
    }),

  /**
   * Busca advertencias para relatorio com filtros
   */
  getWarningsReport: protectedProcedure
    .input(
      z.object({
        dateStart: z.string().optional(),
        dateEnd: z.string().optional(),
        conductorName: z.string().optional(),
        tipo: z.enum(["pouco_rodado", "horas_extras"]).optional(),
      })
    )
    .query(async ({ input }) => {
      try {
        const { getWarningsReport: getWarningsReportDb } = await import("../db");
        const warnings = await getWarningsReportDb(input);
        return {
          success: true,
          warnings,
        };
      } catch (error) {
        return {
          success: false,
          message: String(error),
          warnings: [],
        };
      }
    }),

  /**
   * Estatisticas de advertencias por motorista
   */
  getWarningsStatsByDriver: protectedProcedure.query(async () => {
    const { getWarningsStatsByDriver } = await import("../db");
    return await getWarningsStatsByDriver();
  }),

  /**
   * Estatísticas de advertências por operação
   */
  getWarningsStatsByOperation: protectedProcedure.query(async () => {
    const { getWarningsStatsByOperation } = await import("../db");
    return await getWarningsStatsByOperation();
  }),

  createOrientation: protectedProcedure
    .input(z.object({
      conductorName: z.string(),
      tipo: z.enum(["pouco_rodado", "horas_extras"]),
      motivo: z.string(),
    }))
    .mutation(async ({ ctx, input }) => {
      try {
        const { createOrientation: createOrientationDb } = await import("../db");
        await createOrientationDb({
          conductorName: input.conductorName,
          tipo: input.tipo,
          motivo: input.motivo,
          orientadoPor: ctx.user?.email || "Sistema",
        });
        return { success: true };
      } catch (error) {
        return { success: false, message: String(error) };
      }
    }),

  getOrientationsByConductor: protectedProcedure
    .input(z.object({
      conductorName: z.string(),
    }))
    .query(async ({ input }) => {
      const { getOrientationsByConductor } = await import("../db");
      return await getOrientationsByConductor(input.conductorName);
    }),

  countOrientations: protectedProcedure
    .input(z.object({
      conductorName: z.string(),
      tipo: z.enum(["pouco_rodado", "horas_extras"]),
    }))
    .query(async ({ input }) => {
      const { countOrientations } = await import("../db");
      return await countOrientations(input.conductorName, input.tipo);
    }),
  
  /**
   * Obter estatísticas de advertências com filtros
   */
  getWarningsStats: protectedProcedure
    .input(
      z.object({
        startDate: z.string().optional(),
        endDate: z.string().optional(),
        operacao: z.string().optional(),
      })
    )
    .query(async ({ input }) => {
      try {
        const { getWarningsStats } = await import("../db");
        const stats = await getWarningsStats({
          startDate: input.startDate ? new Date(input.startDate) : undefined,
          endDate: input.endDate ? new Date(input.endDate) : undefined,
          operacao: input.operacao,
        });
        return stats || { total: 0, assinadas: 0, naoAssinadas: 0, taxaDevolucao: 0, warnings: [] };
      } catch (error) {
        console.error("[Router] Error getting warnings stats:", error);
        return { total: 0, assinadas: 0, naoAssinadas: 0, taxaDevolucao: 0, warnings: [] };
      }
    }),
  
  /**
   * Obter tendência de advertências por período
   */
  getWarningsTrend: protectedProcedure
    .input(
      z.object({
        startDate: z.string(),
        endDate: z.string(),
        groupBy: z.enum(["day", "week", "month"]).default("day"),
        operacao: z.string().optional(),
      })
    )
    .query(async ({ input }) => {
      try {
        const { getWarningsTrend } = await import("../db");
        const trend = await getWarningsTrend({
          startDate: new Date(input.startDate),
          endDate: new Date(input.endDate),
          groupBy: input.groupBy,
          operacao: input.operacao,
        });
        return trend || [];
      } catch (error) {
        console.error("[Router] Error getting warnings trend:", error);
        return [];
      }
    }),
  
  /**
   * Obter advertências agrupadas por operação
   */
  getWarningsByOperation: protectedProcedure
    .input(
      z.object({
        startDate: z.string().optional(),
        endDate: z.string().optional(),
      })
    )
    .query(async ({ input }) => {
      try {
        const { getWarningsByOperation } = await import("../db");
        const byOp = await getWarningsByOperation({
          startDate: input.startDate ? new Date(input.startDate) : undefined,
          endDate: input.endDate ? new Date(input.endDate) : undefined,
        });
        return byOp || [];
      } catch (error) {
        console.error("[Router] Error getting warnings by operation:", error);
        return [];
      }
    }),
  
  /**
   * Obter todas as operações
   */
  getAllOperations: protectedProcedure.query(async () => {
    try {
      const { getAllOperations } = await import("../db");
      return await getAllOperations();
    } catch (error) {
      console.error("[Router] Error getting operations:", error);
      return [];
    }
  }),
  
  /**
   * Marcar advertência como aplicada
   */
  markWarningApplied: protectedProcedure
    .input(
      z.object({
        warningId: z.number(),
        dataAplicacao: z.string(),
        assinada: z.boolean(),
        dataAssinatura: z.string().optional(),
        observacoes: z.string().optional(),
      })
    )
    .mutation(async ({ input }) => {
      try {
        const db = await getDb();
        if (!db) throw new Error("Database not available");

        const updateData: Record<string, any> = {
          advertenciaAplicada: true,
          dataAplicacao: new Date(input.dataAplicacao),
          assinada: input.assinada,
        };

        if (input.assinada && input.dataAssinatura) {
          updateData.dataAssinatura = new Date(input.dataAssinatura);
          updateData.assinadaPor = "Motorista";
        }

        if (input.observacoes) {
          updateData.observacao = input.observacoes;
        }

        await db
          .update(warnings)
          .set(updateData)
          .where(eq(warnings.id, input.warningId));

        return {
          success: true,
          message: "Advertência marcada como aplicada com sucesso",
        };
      } catch (error) {
        console.error("[Router] Error marking warning as applied:", error);
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: String(error),
        });
      }
    }),

  /**
   * Salvar PDF no histórico de auditoria
   */
  savePdfHistory: protectedProcedure
    .input(
      z.object({
        warningId: z.number(),
        conductorName: z.string(),
        licensePlate: z.string(),
        operacao: z.string(),
        pdfBase64: z.string(),
        warningLevel: z.string(),
        warningType: z.string(),
        warningReason: z.string(),
        warningNote: z.string().optional(),
        infrationDays: z.string().optional(),
      })
    )
    .mutation(async ({ input, ctx }) => {
      try {
        const { storagePut } = await import("../storage");
        
        // Converter base64 para buffer
        const base64Data = input.pdfBase64.split(",")[1] || input.pdfBase64;
        const buffer = Buffer.from(base64Data, "base64");
        
        // Upload para S3
        const fileName = `warnings/${input.conductorName.replace(/\s+/g, "_")}_${input.warningId}_${Date.now()}.pdf`;
        const { url } = await storagePut(fileName, buffer, "application/pdf");
        
        // Salvar no histórico
        await savePdfHistory({
          warningId: input.warningId,
          conductorName: input.conductorName,
          licensePlate: input.licensePlate,
          operacao: input.operacao,
          pdfUrl: url,
          pdfKey: fileName,
          fileSize: buffer.length,
          geradoPor: ctx.user?.email || "sistema",
        });
        
        return {
          success: true,
          message: "PDF salvo no histórico com sucesso",
          url,
        };
      } catch (error) {
        console.error("[Router] Error saving PDF history:", error);
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: String(error),
        });
      }
    }),

  /**
   * Obter histórico de PDFs de uma advertência
   */
  getPdfHistory: protectedProcedure
    .input(z.object({ warningId: z.number() }))
    .query(async ({ input }) => {
      try {
        return await getPdfHistoryByWarningId(input.warningId);
      } catch (error) {
        console.error("[Router] Error getting PDF history:", error);
        return [];
      }
    }),

  /**
   * Obter histórico de PDFs de um motorista
   */
  getPdfHistoryByDriver: protectedProcedure
    .input(z.object({ conductorName: z.string() }))
    .query(async ({ input }) => {
      try {
        return await getPdfHistoryByDriver(input.conductorName);
      } catch (error) {
        console.error("[Router] Error getting PDF history by driver:", error);
        return [];
      }
    }),
});
