import { z } from "zod";
import { protectedProcedure, router } from "../_core/trpc";
import { getDb } from "../db";
import { users } from "../../drizzle/schema";
import { eq, desc } from "drizzle-orm";
import { TRPCError } from "@trpc/server";
import { hashPassword } from "../auth";
import { createAuditLog } from "../services/auditLogService";

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
        .min(3, 'Login muito curto')
        .refine(
          (email) => {
            // Accept both email format (user@domain.com) and username format (user.name)
            // Username: alphanumeric, dots, hyphens, underscores
            // Email: standard email format
            const usernameRegex = /^[a-zA-Z0-9._-]+$/;
            const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
            return usernameRegex.test(email) || emailRegex.test(email);
          },
          'Login inválido. Use formato: usuario ou usuario@dominio.com'
        ),
      password: z.string().min(6, 'Senha deve ter pelo menos 6 caracteres'),
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

        const hashedPassword = await hashPassword(input.password);
        const result = await db.insert(users).values({
          openId,
          name: input.name,
          email: input.email,
          password: hashedPassword,
          role: input.role,
          department: input.department,
          modules: JSON.stringify(input.modules),
          status: input.status,
          loginMethod: 'manual',
        });

        // Registrar no audit log
        await createAuditLog({
          userId: ctx.user.id,
          userName: ctx.user.name || ctx.user.email,
          userEmail: ctx.user.email,
          action: "create_user",
          resource: "users",
          description: `Novo usuário criado: ${input.name} (${input.email}) - Role: ${input.role}`,
          details: {
            name: input.name,
            email: input.email,
            role: input.role,
            department: input.department,
          },
          status: "success",
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
          const usernameRegex = /^[a-zA-Z0-9._-]+$/;
          const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
          return usernameRegex.test(email) || emailRegex.test(email);
        },
        'Login inválido'
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
          .where(eq(users.id, Number(input.id)));

        // Registrar no audit log
        const camposAlterados = Object.keys(updateData);
        if (camposAlterados.length > 0) {
          await createAuditLog({
            userId: ctx.user.id,
            userName: ctx.user.name || ctx.user.email,
            userEmail: ctx.user.email,
            action: "edit_user",
            resource: "users",
            resourceId: Number(input.id),
            description: `Usuário atualizado - Campos alterados: ${camposAlterados.join(", ")}`,
            details: updateData,
            status: "success",
          });
        }

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

        // Buscar dados do usuário antes de deletar
        const userToDelete = await db.select().from(users).where(eq(users.id, input.id)).limit(1);

        await db
          .delete(users)
          .where(eq(users.id, input.id));

        // Registrar no audit log
        if (userToDelete.length > 0) {
          await createAuditLog({
            userId: ctx.user.id,
            userName: ctx.user.name || ctx.user.email,
            userEmail: ctx.user.email,
            action: "delete_user",
            resource: "users",
            resourceId: input.id,
            description: `Usuário deletado: ${userToDelete[0].name} (${userToDelete[0].email})`,
            details: {
              name: userToDelete[0].name,
              email: userToDelete[0].email,
              role: userToDelete[0].role,
            },
            status: "success",
          });
        }

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
