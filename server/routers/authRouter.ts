import { router, publicProcedure, protectedProcedure } from "../_core/trpc";
import { z } from "zod";
import * as db from "../db";
import { hashPassword, verifyPassword } from "../auth";
import { TRPCError } from "@trpc/server";

export const authRouter = router({
  /**
   * Login com email e senha
   */
  login: publicProcedure
    .input(
      z.object({
        email: z.string().min(1).describe("Nome de usuário ou email"),
        password: z.string().min(1),
      })
    )
    .mutation(async ({ input }) => {
      const user = await db.getUserByEmail(input.email);

      if (!user || !user.password) {
        throw new TRPCError({
          code: "UNAUTHORIZED",
          message: "Email ou senha inválidos",
        });
      }

      if (!verifyPassword(input.password, user.password)) {
        throw new TRPCError({
          code: "UNAUTHORIZED",
          message: "Email ou senha inválidos",
        });
      }

      if (user.status !== "ativo") {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "Usuário inativo",
        });
      }

      return {
        success: true,
        user: {
          id: user.id,
          email: user.email,
          name: user.name,
          role: user.role,
          modules: user.modules ? JSON.parse(user.modules) : [],
        },
      };
    }),

  /**
   * Obter usuário atual
   */
  me: protectedProcedure.query(async ({ ctx }) => {
    const user = await db.getUserById(ctx.user.id);
    if (!user) {
      throw new TRPCError({
        code: "NOT_FOUND",
        message: "Usuário não encontrado",
      });
    }

    return {
      id: user.id,
      email: user.email,
      name: user.name,
      role: user.role,
      modules: user.modules ? JSON.parse(user.modules) : [],
      status: user.status,
    };
  }),

  /**
   * Logout (apenas remove sessão no frontend)
   */
  logout: protectedProcedure.mutation(async () => {
    return { success: true };
  }),

  /**
   * Criar novo usuário (apenas admin)
   */
  createUser: protectedProcedure
    .input(
      z.object({
        email: z.string().email(),
        name: z.string().min(1),
        password: z.string().min(6),
        role: z.enum(["user", "admin", "gestor"]).default("user"),
        modules: z.array(z.string()).default([]),
      })
    )
    .mutation(async ({ ctx, input }) => {
      if (ctx.user.role !== "admin") {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "Apenas admin pode criar usuários",
        });
      }

      const hashedPassword = hashPassword(input.password);
      try {
        const user = await db.createUser({
          email: input.email,
          name: input.name,
          password: hashedPassword,
          role: input.role,
          modules: JSON.stringify(input.modules),
        });

        return {
          success: true,
          user: {
            id: user.id,
            email: user.email,
            name: user.name,
            role: user.role,
            modules: input.modules,
          },
        };
      } catch (error) {
        console.error("[Auth] Erro ao criar usuário:", error);
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Erro ao criar usuário",
        });
      }
    }),

  /**
   * Atualizar usuário (apenas admin)
   */
  updateUser: protectedProcedure
    .input(
      z.object({
        id: z.number(),
        name: z.string().min(1).optional(),
        role: z.enum(["user", "admin", "gestor"]).optional(),
        modules: z.array(z.string()).optional(),
        status: z.enum(["ativo", "inativo"]).optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      if (ctx.user.role !== "admin") {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "Apenas admin pode atualizar usuários",
        });
      }

      try {
        await db.updateUserById(input.id, {
          name: input.name,
          role: input.role,
          modules: input.modules ? JSON.stringify(input.modules) : undefined,
          status: input.status,
        });

        return { success: true };
      } catch (error) {
        console.error("[Auth] Erro ao atualizar usuário:", error);
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Erro ao atualizar usuário",
        });
      }
    }),

  /**
   * Deletar usuário (apenas admin)
   */
  deleteUser: protectedProcedure
    .input(z.object({ id: z.number() }))
    .mutation(async ({ ctx, input }) => {
      if (ctx.user.role !== "admin") {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "Apenas admin pode deletar usuários",
        });
      }

      try {
        await db.deleteUserById(input.id);
        return { success: true };
      } catch (error) {
        console.error("[Auth] Erro ao deletar usuário:", error);
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Erro ao deletar usuário",
        });
      }
    }),

  /**
   * Listar todos os usuários (apenas admin)
   */
  listUsers: protectedProcedure.query(async ({ ctx }) => {
    if (ctx.user.role !== "admin") {
      throw new TRPCError({
        code: "FORBIDDEN",
        message: "Apenas admin pode listar usuários",
      });
    }
    const allUsers = await db.getAllUsers();
    return allUsers.map((u) => ({
      id: u.id,
      email: u.email,
      name: u.name,
      role: u.role,
      modules: u.modules ? JSON.parse(u.modules) : [],
      status: u.status,
      createdAt: u.createdAt,
    }));
  }),

  /**
   * Solicitar reset de senha
   */
  requestPasswordReset: publicProcedure
    .input(
      z.object({
        email: z.string().min(1),
      })
    )
    .mutation(async ({ input }) => {
      const user = await db.getUserByEmail(input.email);
      if (!user) {
        return { success: true, message: "Se o email existe, um link de reset foi enviado" };
      }

      const crypto = await import("crypto");
      const token = crypto.randomBytes(32).toString("hex");
      const expiresAt = new Date(Date.now() + 1000 * 60 * 60);

      try {
        await db.createPasswordResetToken(user.id, token, expiresAt);
        console.log(`[Password Reset] Token gerado para ${user.email}`);
        return { success: true, message: "Se o email existe, um link de reset foi enviado" };
      } catch (error) {
        console.error("[Password Reset] Erro ao criar token:", error);
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Erro ao solicitar reset de senha",
        });
      }
    }),

  /**
   * Validar token de reset
   */
  validatePasswordResetToken: publicProcedure
    .input(
      z.object({
        token: z.string().min(1),
      })
    )
    .query(async ({ input }) => {
      const resetToken = await db.getValidPasswordResetToken(input.token);
      if (!resetToken) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "Token inválido ou expirado",
        });
      }

      const user = await db.getUserById(resetToken.userId);
      if (!user) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Usuário não encontrado",
        });
      }

      return {
        valid: true,
        email: user.email,
        name: user.name,
      };
    }),

  /**
   * Redefinir senha com token
   */
  resetPassword: publicProcedure
    .input(
      z.object({
        token: z.string().min(1),
        newPassword: z.string().min(6),
      })
    )
    .mutation(async ({ input }) => {
      const resetToken = await db.getValidPasswordResetToken(input.token);
      if (!resetToken) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "Token inválido ou expirado",
        });
      }

      try {
        const hashedPassword = hashPassword(input.newPassword);
        await db.updateUserPassword(resetToken.userId, hashedPassword);
        await db.markPasswordResetTokenAsUsed(resetToken.id);

        return { success: true, message: "Senha redefinida com sucesso" };
      } catch (error) {
        console.error("[Password Reset] Erro ao redefinir senha:", error);
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Erro ao redefinir senha",
        });
      }
    }),
});
