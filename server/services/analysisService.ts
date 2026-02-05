import { getDb } from "../db";
import { journeys, recurrences, suggestedActions } from "../../drizzle/schema";
import { eq, and, gte, lte, desc } from "drizzle-orm";
import type { Configuration } from "../../drizzle/schema";

/**
 * Calcula reincidências para um motorista em uma data específica
 */
export async function calculateRecurrences(
  conductorName: string,
  referenceDate: Date,
  config: Configuration
) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  // Calcular datas das janelas
  const janelaStart = new Date(referenceDate);
  janelaStart.setDate(janelaStart.getDate() - config.janelaReincidenciaDias);

  const cronico30Start = new Date(referenceDate);
  cronico30Start.setDate(cronico30Start.getDate() - config.janelaCronicoDias);

  // Buscar jornadas do motorista nas janelas
  const janelaJourneys = await db
    .select()
    .from(journeys)
    .where(
      and(
        eq(journeys.conductorName, conductorName),
        gte(journeys.data, janelaStart),
        lte(journeys.data, referenceDate)
      )
    );

  const cronico30Journeys = await db
    .select()
    .from(journeys)
    .where(
      and(
        eq(journeys.conductorName, conductorName),
        gte(journeys.data, cronico30Start),
        lte(journeys.data, referenceDate)
      )
    );

  // Contar ocorrências
  const ocorPoucoJanela = janelaJourneys.filter((j) => j.poucoRodado).length;
  const ocorPouco30d = cronico30Journeys.filter((j) => j.poucoRodado).length;
  const ocorHeJanela = janelaJourneys.filter((j) => j.temHe).length;
  const ocorHe30d = cronico30Journeys.filter((j) => j.temHe).length;

  return {
    ocorPoucoJanela,
    ocorPouco30d,
    ocorHeJanela,
    ocorHe30d,
  };
}

/**
 * Gera ação sugerida baseada em regras operacionais
 */
export function generateSuggestedAction(
  conductorName: string,
  journeyId: number,
  data: Date,
  tipo: "pouco_rodado" | "horas_extras",
  recurrenceData: any,
  config: Configuration
): {
  acao: string;
  severidade: "info" | "warning" | "critical";
} | null {
  if (tipo === "pouco_rodado") {
    const ocor = recurrenceData.ocorPoucoJanela;

    if (ocor >= config.thresholdPoucoRodado3) {
      return {
        acao: "Escalar para Gestor hoje",
        severidade: "critical",
      };
    }

    if (ocor === config.thresholdPoucoRodado2) {
      return {
        acao: "Orientativa + ajuste de rotina",
        severidade: "warning",
      };
    }

    if (ocor === config.thresholdPoucoRodado1) {
      return {
        acao: "Orientativa rápida",
        severidade: "info",
      };
    }

    if (recurrenceData.ocorPouco30d >= config.thresholdPouco30d) {
      return {
        acao: "Crítico: plano de correção com Gestor",
        severidade: "critical",
      };
    }
  }

  if (tipo === "horas_extras") {
    if (
      recurrenceData.heAlerta &&
      recurrenceData.ocorHeJanela >= config.thresholdPoucoRodado2
    ) {
      return {
        acao: "Escalar para Gestor hoje",
        severidade: "critical",
      };
    }

    if (recurrenceData.ocorHe30d >= config.thresholdHe30d) {
      return {
        acao: "Crítico: revisar escala/rota",
        severidade: "critical",
      };
    }
  }

  return null;
}

/**
 * Recalcula todas as reincidências e ações sugeridas para uma data
 */
export async function recalculateForDate(targetDate: Date, config: Configuration) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  // Buscar todas as jornadas do dia
  const startOfDay = new Date(targetDate);
  startOfDay.setHours(0, 0, 0, 0);
  const endOfDay = new Date(targetDate);
  endOfDay.setHours(23, 59, 59, 999);

  const dayJourneys = await db
    .select()
    .from(journeys)
    .where(and(gte(journeys.data, startOfDay), lte(journeys.data, endOfDay)));

  // Agrupar por motorista
  const conductorMap = new Map<string, any[]>();
  for (const journey of dayJourneys) {
    if (!conductorMap.has(journey.conductorName)) {
      conductorMap.set(journey.conductorName, []);
    }
    conductorMap.get(journey.conductorName)!.push(journey);
  }

  // Processar cada motorista
  const suggestedActionsList: any[] = [];

  for (const [conductorName, conductorJourneys] of Array.from(conductorMap)) {
    // Calcular reincidências
    const recurrenceData = await calculateRecurrences(
      conductorName,
      targetDate,
      config
    );

    // Atualizar tabela de reincidências
    await db
      .insert(recurrences)
      .values({
        conductorName,
        data: targetDate,
        ...recurrenceData,
      })
      .onDuplicateKeyUpdate({
        set: {
          ...recurrenceData,
          updatedAt: new Date(),
        },
      });

    // Gerar ações sugeridas
    for (const journey of conductorJourneys) {
      // Pouco rodado
      if (journey.poucoRodado) {
        const action = generateSuggestedAction(
          conductorName,
          journey.id,
          targetDate,
          "pouco_rodado",
          recurrenceData,
          config
        );

        if (action) {
          suggestedActionsList.push({
            journeyId: journey.id,
            conductorName,
            data: targetDate,
            tipo: "pouco_rodado",
            acao: action.acao,
            severidade: action.severidade,
          });
        }
      }

      // Horas extras
      if (journey.temHe) {
        const action = generateSuggestedAction(
          conductorName,
          journey.id,
          targetDate,
          "horas_extras",
          { ...recurrenceData, heAlerta: journey.heAlerta },
          config
        );

        if (action) {
          suggestedActionsList.push({
            journeyId: journey.id,
            conductorName,
            data: targetDate,
            tipo: "horas_extras",
            acao: action.acao,
            severidade: action.severidade,
          });
        }
      }
    }
  }

  // Inserir ações sugeridas
  if (suggestedActionsList.length > 0) {
    await db.insert(suggestedActions).values(suggestedActionsList);
  }

  return {
    processedConductors: conductorMap.size,
    suggestedActionsCount: suggestedActionsList.length,
  };
}
