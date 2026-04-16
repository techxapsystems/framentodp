import { z } from "zod";
import { getDb } from "../db";
import { modelCategories, warningTemplates, templateUsageHistory } from "../../drizzle/schema";
import { eq, like, and, desc, or } from "drizzle-orm";
import { protectedProcedure, router } from "../_core/trpc";
import { TRPCError } from "@trpc/server";

export const templateRouter = router({
  /**
   * Buscar todas as categorias de modelos
   */
  getCategories: protectedProcedure
    .input(
      z.object({
        type: z.enum(["advertencia", "suspensao"]).optional(),
      })
    )
    .query(async ({ input }) => {
      try {
        const db = await getDb();
        if (!db) throw new Error("Database not available");

        const categories = await db
          .select()
          .from(modelCategories)
          .where(
            input.type
              ? eq(modelCategories.type, input.type)
              : undefined
          )
          .orderBy(modelCategories.order);

        return categories;
      } catch (error) {
        console.error("Erro ao buscar categorias:", error);
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Erro ao buscar categorias de modelos",
        });
      }
    }),

  /**
   * Buscar modelos por categoria
   */
  getTemplatesByCategory: protectedProcedure
    .input(
      z.object({
        categoryId: z.number(),
      })
    )
    .query(async ({ input }) => {
      try {
        const db = await getDb();
        if (!db) throw new Error("Database not available");

        const templates = await db
          .select()
          .from(warningTemplates)
          .where(
            and(
              eq(warningTemplates.categoryId, input.categoryId),
              eq(warningTemplates.isActive, true)
            )
          )
          .orderBy(desc(warningTemplates.usageCount));

        return templates;
      } catch (error) {
        console.error("Erro ao buscar templates:", error);
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Erro ao buscar modelos",
        });
      }
    }),

  /**
   * Buscar modelos por texto (título ou conteúdo)
   */
  searchTemplates: protectedProcedure
    .input(
      z.object({
        query: z.string().min(2),
        type: z.enum(["advertencia", "suspensao"]).optional(),
      })
    )
    .query(async ({ input }) => {
      try {
        const db = await getDb();
        if (!db) throw new Error("Database not available");

        const searchPattern = `%${input.query}%`;

        const templates = await db
          .select()
          .from(warningTemplates)
          .where(
            and(
              or(
                like(warningTemplates.title, searchPattern),
                like(warningTemplates.content, searchPattern)
              ),
              eq(warningTemplates.isActive, true),
              input.type ? eq(warningTemplates.type, input.type) : undefined
            )
          )
          .limit(20);

        return templates;
      } catch (error) {
        console.error("Erro ao buscar templates:", error);
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Erro ao buscar modelos",
        });
      }
    }),

  /**
   * Obter um modelo específico por ID
   */
  getTemplateById: protectedProcedure
    .input(z.object({ id: z.number() }))
    .query(async ({ input }) => {
      try {
        const db = await getDb();
        if (!db) throw new Error("Database not available");

        const template = await db
          .select()
          .from(warningTemplates)
          .where(eq(warningTemplates.id, input.id));

        if (!template || template.length === 0) {
          throw new TRPCError({
            code: "NOT_FOUND",
            message: "Modelo não encontrado",
          });
        }

        return template[0];
      } catch (error) {
        console.error("Erro ao buscar template:", error);
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Erro ao buscar modelo",
        });
      }
    }),

  /**
   * Obter modelos mais usados
   */
  getPopularTemplates: protectedProcedure
    .input(
      z.object({
        limit: z.number().default(10),
        type: z.enum(["advertencia", "suspensao"]).optional(),
      })
    )
    .query(async ({ input }) => {
      try {
        const db = await getDb();
        if (!db) throw new Error("Database not available");

        const templates = await db
          .select()
          .from(warningTemplates)
          .where(
            and(
              eq(warningTemplates.isActive, true),
              input.type ? eq(warningTemplates.type, input.type) : undefined
            )
          )
          .orderBy(desc(warningTemplates.usageCount))
          .limit(input.limit);

        return templates;
      } catch (error) {
        console.error("Erro ao buscar templates populares:", error);
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Erro ao buscar modelos populares",
        });
      }
    }),

  /**
   * Registrar uso de um modelo
   */
  recordUsage: protectedProcedure
    .input(
      z.object({
        templateId: z.number(),
        warningId: z.number().optional(),
      })
    )
    .mutation(async ({ input, ctx }) => {
      try {
        const db = await getDb();
        if (!db) throw new Error("Database not available");

        // Registrar uso
        await db.insert(templateUsageHistory).values({
          templateId: input.templateId,
          userId: ctx.user?.id || 0,
          warningId: input.warningId || null,
        });

        return { success: true };
      } catch (error) {
        console.error("Erro ao registrar uso:", error);
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Erro ao registrar uso do modelo",
        });
      }
    }),

  /**
   * Criar novo modelo
   */
  createTemplate: protectedProcedure
    .input(
      z.object({
        title: z.string().min(1),
        content: z.string().min(1),
        type: z.enum(["advertencia", "suspensao"]),
        categoryId: z.number(),
      })
    )
    .mutation(async ({ input }) => {
      try {
        const db = await getDb();
        if (!db) throw new Error("Database not available");

        const result = await db.insert(warningTemplates).values({
          title: input.title,
          content: input.content,
          type: input.type,
          categoryId: input.categoryId,
          isActive: true,
          usageCount: 0,
        });

        return { success: true, id: result[0] };
      } catch (error) {
        console.error("Erro ao criar template:", error);
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Erro ao criar modelo",
        });
      }
    }),

  /**
   * Obter estatísticas de modelos
   */
  getStats: protectedProcedure.query(async () => {
    try {
      const db = await getDb();
      if (!db) throw new Error("Database not available");

      const allTemplates = await db.select().from(warningTemplates);
      const advertencias = allTemplates.filter(
        (t) => t.type === "advertencia"
      );
      const suspensoes = allTemplates.filter(
        (t) => t.type === "suspensao"
      );
      const categories = await db.select().from(modelCategories);

      return {
        totalTemplates: allTemplates.length,
        advertencias: advertencias.length,
        suspensoes: suspensoes.length,
        categories: categories.length,
      };
    } catch (error) {
      console.error("Erro ao buscar estatísticas:", error);
      throw new TRPCError({
        code: "INTERNAL_SERVER_ERROR",
        message: "Erro ao buscar estatísticas",
      });
    }
  }),
});
