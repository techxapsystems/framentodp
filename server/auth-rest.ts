import express from "express";
import * as db from "./db";
import { verifyPassword } from "./auth";
import { sdk } from "./_core/sdk";
import { COOKIE_NAME, ONE_YEAR_MS } from "@shared/const";
import { getSessionCookieOptions } from "./_core/cookies";

export const authRestRouter = express.Router();

authRestRouter.post("/login", express.json(), async (req, res) => {
  try {
    // Aceita tanto "email" quanto "username" como campo de usuário
    const username = req.body.email || req.body.username;
    const { password } = req.body;

    if (!username || !password) {
      return res.status(400).json({ error: "Usuário e senha são obrigatórios" });
    }

    const user = await db.getUserByEmail(username);

    if (!user || !user.password) {
      return res.status(401).json({ error: "Usuário ou senha inválidos" });
    }

    if (!verifyPassword(password, user.password)) {
      return res.status(401).json({ error: "Usuário ou senha inválidos" });
    }

    if (user.status !== "ativo") {
      return res.status(403).json({ error: "Usuário inativo. Contate o administrador." });
    }

    // Garantir que o usuário tem um openId para o JWT
    let openId = user.openId;
    if (!openId) {
      openId = `local_${user.email}_${user.id}`;
      // Atualizar o openId no banco
      try {
        const dbInstance = await db.getDb();
        if (dbInstance) {
          const { users } = await import("../drizzle/schema");
          const { eq } = await import("drizzle-orm");
          await dbInstance.update(users).set({ openId }).where(eq(users.id, user.id));
        }
      } catch (e) {
        console.error("[Auth REST] Error updating openId:", e);
      }
    }

    // Criar token JWT de sessão (mesmo formato que o OAuth usa)
    const sessionToken = await sdk.createSessionToken(openId, {
      name: user.name || "",
      expiresInMs: ONE_YEAR_MS,
    });

    // Setar o cookie de sessão (mesmo que o OAuth faz)
    const cookieOptions = getSessionCookieOptions(req);
    res.cookie(COOKIE_NAME, sessionToken, { ...cookieOptions, maxAge: ONE_YEAR_MS });

    return res.json({
      success: true,
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role,
        modules: user.modules ? JSON.parse(user.modules) : [],
      },
    });
  } catch (error) {
    console.error("[Auth REST] Error:", error);
    return res.status(500).json({ error: "Erro interno do servidor. Tente novamente." });
  }
});

authRestRouter.get("/reincidents", async (req, res) => {
  try {
    const reincidents = await db.getReincidentsWithWarnings();
    return res.json({
      result: {
        data: {
          json: reincidents,
        },
      },
    });
  } catch (error) {
    console.error("[API] Error getting reincidents:", error);
    return res.status(500).json({ error: "Erro ao buscar reincidentes" });
  }
});

authRestRouter.get("/warnings-stats", async (req, res) => {
  try {
    const stats = await db.getWarningsStats({});
    return res.json({
      result: {
        data: {
          json: stats,
        },
      },
    });
  } catch (error) {
    console.error("[API] Error getting warnings stats:", error);
    return res.status(500).json({ error: "Erro ao buscar estatísticas" });
  }
});

authRestRouter.get("/warnings-stats-by-operation", async (req, res) => {
  try {
    const stats = await db.getWarningsStatsByOperation();
    return res.json({
      result: {
        data: {
          json: stats,
        },
      },
    });
  } catch (error) {
    console.error("[API] Error getting warnings stats by operation:", error);
    return res.status(500).json({ error: "Erro ao buscar estatísticas por operação" });
  }
});

authRestRouter.get("/warnings-stats-by-driver", async (req, res) => {
  try {
    const stats = await db.getWarningsStatsByDriver();
    return res.json({
      result: {
        data: {
          json: stats,
        },
      },
    });
  } catch (error) {
    console.error("[API] Error getting warnings stats by driver:", error);
    return res.status(500).json({ error: "Erro ao buscar estatísticas por motorista" });
  }
});
