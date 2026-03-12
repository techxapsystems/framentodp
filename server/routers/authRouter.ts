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
        email: z.string().email(),
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
        modulos: z.array(z.string()).default([]),
      })
    )
    .mutation(async ({ ctx, input }) => {
      if (ctx.user.role !== "admin") {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "Apenas admin pode criar usuários",
        });
      }

      const existing = await db.getUserByEmail(input.email);
      if (existing) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "Email já cadastrado",
        });
      }

      try {
        const result = await db.createUser({
          email: input.email,
          name: input.name,
          password: hashPassword(input.password),
          role: input.role,
          modulos: JSON.stringify(input.modulos),
          status: "ativo",
          loginMethod: "email",
        });

        return {
          success: true,
          message: "Usuário criado com sucesso",
          userId: result,
        };
      } catch (error) {
        console.error("[Auth] Error creating user:", error);
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Erro ao criar usuário",
        });
      }
    }),

  /**
   * Atualizar usuário (admin pode atualizar qualquer um, user pode atualizar a si mesmo)
   */
  updateUser: protectedProcedure
    .input(
      z.object({
        userId: z.number(),
        name: z.string().optional(),
        password: z.string().min(6).optional(),
        role: z.enum(["user", "admin", "gestor"]).optional(),
        modulos: z.array(z.string()).optional(),
        status: z.enum(["ativo", "inativo"]).optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      // Apenas admin pode atualizar outros usuários
      if (ctx.user.id !== input.userId && ctx.user.role !== "admin") {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "Você não tem permissão para atualizar este usuário",
        });
      }

      const updates: any = {};
      if (input.name) updates.name = input.name;
      if (input.password) updates.password = hashPassword(input.password);
      if (input.role && ctx.user.role === "admin") updates.role = input.role;
      if (input.modulos) updates.modulos = JSON.stringify(input.modulos);
      if (input.status && ctx.user.role === "admin") updates.status = input.status;

      try {
        await db.updateUserById(input.userId, updates);
        return { success: true, message: "Usuário atualizado com sucesso" };
      } catch (error) {
        console.error("[Auth] Error updating user:", error);
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
    .input(z.object({ userId: z.number() }))
    .mutation(async ({ ctx, input }) => {
      if (ctx.user.role !== "admin") {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "Apenas admin pode deletar usuários",
        });
      }

      if (ctx.user.id === input.userId) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "Você não pode deletar sua própria conta",
        });
      }

      try {
        await db.deleteUserById(input.userId);
        return { success: true, message: "Usuário deletado com sucesso" };
      } catch (error) {
        console.error("[Auth] Error deleting user:", error);
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
});
