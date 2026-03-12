import { protectedProcedure, router } from "../_core/trpc";
import { z } from "zod";
import { getConfigurations } from "../db";
// import { updateConfigurations } from "../db"; // Função não implementada

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

  // update: protectedProcedure - DESATIVADO: função updateConfigurations não implementada
});
