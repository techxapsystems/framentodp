import { z } from "zod";
import { getConfigurations, updateConfiguration } from "../db";
import { createAuditLog } from "../services/auditLogService";
import { protectedProcedure, router } from "../_core/trpc";

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
    .mutation(async ({ ctx, input }) => {
      try {
        // Update each configuration field
        const camposAlterados = [];
        for (const [key, value] of Object.entries(input)) {
          if (value !== undefined) {
            await updateConfiguration(key, String(value));
            camposAlterados.push(key);
          }
        }

        // Registrar no audit log
        if (camposAlterados.length > 0) {
          await createAuditLog({
            userId: ctx.user.id,
            userName: ctx.user.name || ctx.user.email,
            userEmail: ctx.user.email,
            action: "change_settings",
            resource: "settings",
            description: `Configurações alteradas - Campos: ${camposAlterados.join(", ")}`,
            details: input,
            status: "success",
          });
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
