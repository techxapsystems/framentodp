import { z } from "zod";
import { protectedProcedure, router } from "../_core/trpc";
import { getDb } from "../db";
import { users } from "../../drizzle/schema";
import { eq, desc } from "drizzle-orm";
import { TRPCError } from "@trpc/server";

export const userRouter = router({
  /**
   * Lista todos os usuários
   */
  listUsers: protectedProcedure
    .query(async ({ ctx }) => {
      try {
        // Apenas admin pode listar usuários
        if (ctx.user.role !== 'admin') {
          throw new TRPCError({ code: 'FORBIDDEN', message: 'Apenas admin pode listar usuários' });
        }

        const db = await getDb();
        if (!db) throw new Error("Database not available");

        const allUsers = await db
          .select()
          .from(users)
          .orderBy(desc(users.createdAt));

        return allUsers.map(user => ({
          ...user,
          modules: user.modules ? JSON.parse(user.modules) : [],
        }));
      } catch (error) {
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: String(error),
        });
      }
    }),

  /**
   * Busca um usuário por ID
   */
  getUserById: protectedProcedure
    .input(z.object({ id: z.number() }))
    .query(async ({ ctx, input }) => {
      try {
        if (ctx.user.role !== 'admin') {
          throw new TRPCError({ code: 'FORBIDDEN' });
        }

        const db = await getDb();
        if (!db) throw new Error("Database not available");

        const user = await db
          .select()
          .from(users)
          .where(eq(users.id, input.id))
          .limit(1);

        if (!user.length) {
          throw new TRPCError({ code: 'NOT_FOUND', message: 'Usuário não encontrado' });
        }

        return {
          ...user[0],
          modules: user[0].modules ? JSON.parse(user[0].modules) : [],
        };
      } catch (error) {
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: String(error),
        });
      }
    }),

  /**
   * Cria um novo usuário
   */
  createUser: protectedProcedure
    .input(z.object({
      name: z.string().min(1),
      email: z.string()
        .min(5, 'Email muito curto')
        .refine(
          (email) => {
            // RFC 5322 simplified regex - allows most common email formats
            const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
            return emailRegex.test(email);
          },
          'Email inválido'
        ),
      role: z.enum(['user', 'admin', 'gestor']),
      department: z.string().min(1),
      modules: z.array(z.string()),
      status: z.enum(['ativo', 'inativo']).default('ativo'),
    }))
    .mutation(async ({ ctx, input }) => {
      try {
        if (ctx.user.role !== 'admin') {
          throw new TRPCError({ code: 'FORBIDDEN' });
        }

        const db = await getDb();
        if (!db) throw new Error("Database not available");

        // Verificar se email já existe
        const existing = await db
          .select()
          .from(users)
          .where(eq(users.email, input.email))
          .limit(1);

        if (existing.length > 0) {
          throw new TRPCError({
            code: 'CONFLICT',
            message: 'Email já cadastrado',
          });
        }

        // Criar usuário com openId temporário (será atualizado no primeiro login)
        const openId = `temp_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

        const result = await db.insert(users).values({
          openId,
          name: input.name,
          email: input.email,
          role: input.role,
          department: input.department,
          modules: JSON.stringify(input.modules),
          status: input.status,
          loginMethod: 'manual',
        });

        return {
          success: true,
          message: 'Usuário criado com sucesso',
          userId: (result as any)?.insertId || input.email,
        };
      } catch (error) {
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: String(error),
        });
      }
    }),

  /**
   * Atualiza um usuário existente
   */
  updateUser: protectedProcedure
    .input(z.object({
      id: z.string(),
      name: z.string().min(1).optional(),
      email: z.string().refine(
        (email) => {
          const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
          return emailRegex.test(email);
        },
        'Email inválido'
      ).optional(),
      role: z.enum(['user', 'admin', 'gestor']).optional(),
      department: z.string().optional(),
      modules: z.array(z.string()).optional(),
      status: z.enum(['ativo', 'inativo']).optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      try {
        if (ctx.user.role !== 'admin') {
          throw new TRPCError({ code: 'FORBIDDEN' });
        }

        const db = await getDb();
        if (!db) throw new Error("Database not available");

        const updateData: any = {};
        if (input.name) updateData.name = input.name;
        if (input.email) updateData.email = input.email;
        if (input.role) updateData.role = input.role;
        if (input.department) updateData.department = input.department;
        if (input.modules) updateData.modules = JSON.stringify(input.modules);
        if (input.status) updateData.status = input.status;

        await db
          .update(users)
          .set(updateData)
          .where(eq(users.id, input.id));

        return {
          success: true,
          message: 'Usuário atualizado com sucesso',
        };
      } catch (error) {
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: String(error),
        });
      }
    }),

  /**
   * Deleta um usuário
   */
  deleteUser: protectedProcedure
    .input(z.object({ id: z.number() }))
    .mutation(async ({ ctx, input }) => {
      try {
        if (ctx.user.role !== 'admin') {
          throw new TRPCError({ code: 'FORBIDDEN' });
        }

        // Não permitir deletar a si mesmo
        if (ctx.user.id === input.id) {
          throw new TRPCError({
            code: 'BAD_REQUEST',
            message: 'Você não pode deletar sua própria conta',
          });
        }

        const db = await getDb();
        if (!db) throw new Error("Database not available");

        await db
          .delete(users)
          .where(eq(users.id, input.id));

        return {
          success: true,
          message: 'Usuário deletado com sucesso',
        };
      } catch (error) {
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: String(error),
        });
      }
    }),

  /**
   * Alterna status do usuário (ativo/inativo)
   */
  toggleUserStatus: protectedProcedure
    .input(z.object({ id: z.number() }))
    .mutation(async ({ ctx, input }) => {
      try {
        if (ctx.user.role !== 'admin') {
          throw new TRPCError({ code: 'FORBIDDEN' });
        }

        const db = await getDb();
        if (!db) throw new Error("Database not available");

        const user = await db
          .select()
          .from(users)
          .where(eq(users.id, input.id))
          .limit(1);

        if (!user.length) {
          throw new TRPCError({ code: 'NOT_FOUND' });
        }

        const newStatus = user[0].status === 'ativo' ? 'inativo' : 'ativo';

        await db
          .update(users)
          .set({ status: newStatus })
          .where(eq(users.id, input.id));

        return {
          success: true,
          message: `Usuário ${newStatus === 'ativo' ? 'ativado' : 'desativado'} com sucesso`,
        };
      } catch (error) {
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: String(error),
        });
      }
    }),
});
