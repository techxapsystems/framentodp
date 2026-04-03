import { protectedProcedure, router } from "../_core/trpc";
import { z } from "zod";
import { getConfigurations, updateConfiguration } from "../db";

export const configRouter = router({
  /**
   * Obtém configurações atuais
   */
  get: protectedProcedure.query(async () => {
    try {
      const config = await getConfigurations();
      return {
        success: true,
        data: config,
      };
    } catch (error) {
      return {
        success: false,
        message: String(error),
        data: null,
      };
    }
  }),

  update: protectedProcedure
    .input(
      z.object({
        limitePoucoRodadoMin: z.number().optional(),
        limiteHeAlertaMin: z.number().optional(),
        janelaReincidenciaDias: z.number().optional(),
        janelaCronicoDias: z.number().optional(),
        thresholdPoucoRodado1: z.number().optional(),
        thresholdPoucoRodado2: z.number().optional(),
        thresholdPoucoRodado3: z.number().optional(),
        thresholdPouco30d: z.number().optional(),
        thresholdHe30d: z.number().optional(),
      })
    )
    .mutation(async ({ input }) => {
      try {
        // Update each configuration field
        for (const [key, value] of Object.entries(input)) {
          if (value !== undefined) {
            await updateConfiguration(key, String(value));
          }
        }
        const result = await getConfigurations();
        return {
          success: true,
          data: result,
        };
      } catch (error) {
        return {
          success: false,
          message: String(error),
          data: null,
        };
      }
    })
});
