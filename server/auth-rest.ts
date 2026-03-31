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
    const startDateStr = req.query.startDate as string;
    const endDateStr = req.query.endDate as string;
    const operacao = req.query.operacao as string;

    const filters: any = {};
    if (startDateStr) filters.startDate = new Date(startDateStr);
    if (endDateStr) filters.endDate = new Date(endDateStr);
    if (operacao) filters.operacao = operacao;

    const stats = await db.getWarningsStats(filters);
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
    const startDateStr = req.query.startDate as string;
    const endDateStr = req.query.endDate as string;
    const operacao = req.query.operacao as string;

    const filters: any = {};
    if (startDateStr) filters.startDate = new Date(startDateStr);
    if (endDateStr) filters.endDate = new Date(endDateStr);
    if (operacao) filters.operacao = operacao;

    const stats = await db.getWarningsStatsByOperation(filters);
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
    let stats = await db.getWarningsStatsByDriver();
    
    // Aplicar filtros se fornecidos
    let startDate: Date | null = null;
    let endDate: Date | null = null;
    
    if (req.query.startDate) {
      const dateStr = req.query.startDate as string;
      startDate = new Date(dateStr);
      // Se for uma data no formato YYYY-MM-DD, comecar do inicio do dia
      if (dateStr.match(/^\d{4}-\d{2}-\d{2}$/)) {
        startDate.setUTCHours(0, 0, 0, 0);
      }
    }
    
    if (req.query.endDate) {
      const dateStr = req.query.endDate as string;
      endDate = new Date(dateStr);
      // Se for uma data no formato YYYY-MM-DD, ir ate o final do dia
      if (dateStr.match(/^\d{4}-\d{2}-\d{2}$/)) {
        endDate.setUTCHours(23, 59, 59, 999);
      }
    }
    
    const operation = req.query.operation as string || null;
    
    if (startDate || endDate || operation) {
      stats = stats.filter((item: any) => {
        // Filtro de data
        if (startDate || endDate) {
          const itemDate = item.data ? new Date(item.data) : null;
          if (!itemDate) return false;
          if (startDate && itemDate < startDate) return false;
          if (endDate && itemDate > endDate) return false;
        }
        
        // Filtro de operacao
        if (operation && item.operacao !== operation) return false;
        
        return true;
      });
    }
    
    return res.json({
      result: {
        data: {
          json: stats,
        },
      },
    });
  } catch (error) {
    console.error("[API] Error getting warnings stats by driver:", error);
    return res.status(500).json({ error: "Erro ao buscar estatisticas por motorista" });
  }
});


/**
 * Importar motoristas em lote
 */
authRestRouter.post("/import-conductors", express.json(), async (req, res) => {
  try {
    const { conductors: conductorsList } = req.body;
    
    if (!Array.isArray(conductorsList) || conductorsList.length === 0) {
      return res.status(400).json({ error: "Lista de motoristas é obrigatória" });
    }
    
    const result = await db.importConductors(conductorsList);
    
    return res.json({
      result: {
        data: {
          json: result,
        },
      },
    });
  } catch (error) {
    console.error("[API] Error importing conductors:", error);
    return res.status(500).json({ error: "Erro ao importar motoristas" });
  }
});

/**
 * Obter todos os motoristas
 */
authRestRouter.get("/conductors", async (req, res) => {
  try {
    const conductorsList = await db.getAllConductors();
    
    return res.json({
      result: {
        data: {
          json: conductorsList,
        },
      },
    });
  } catch (error) {
    console.error("[API] Error getting conductors:", error);
    return res.status(500).json({ error: "Erro ao buscar motoristas" });
  }
});

/**
 * Dar baixa em advertência (marcar como assinada)
 */
authRestRouter.post("/mark-warning-signed", express.json(), async (req, res) => {
  try {
    const { warningId } = req.body;
    
    if (!warningId) {
      return res.status(400).json({ error: "ID da advertência é obrigatório" });
    }
    
    const result = await db.markWarningAsSigned(warningId);
    
    return res.json({
      result: {
        data: {
          json: { success: true, message: "Advertência marcada como assinada" },
        },
      },
    });
  } catch (error) {
    console.error("[API] Error marking warning as signed:", error);
    return res.status(500).json({ error: "Erro ao marcar advertência como assinada" });
  }
});

/**
 * Obter advertências não assinadas de um motorista
 */
authRestRouter.get("/unsigned-warnings/:conductorName", async (req, res) => {
  try {
    const { conductorName } = req.params;
    
    if (!conductorName) {
      return res.status(400).json({ error: "Nome do motorista é obrigatório" });
    }
    
    const warnings = await db.getUnsignedWarningsByDriver(decodeURIComponent(conductorName));
    
    return res.json({
      result: {
        data: {
          json: warnings,
        },
      },
    });
  } catch (error) {
    console.error("[API] Error getting unsigned warnings:", error);
    return res.status(500).json({ error: "Erro ao buscar advertências não assinadas" });
  }
});


// GET /api/auth/list-conductors - List all conductors for the sign-off page
authRestRouter.get("/list-conductors", async (req, res) => {
  try {
    const conductors = await db.getAllConductors();
    
    return res.json({
      result: {
        data: {
          json: conductors,
        },
      },
    });
  } catch (error) {
    console.error("[API] Error listing conductors:", error);
    return res.status(500).json({ error: "Erro ao listar motoristas" });
  }
});

// GET /api/auth/conductor-warnings/:conductorId - Get warnings for a specific conductor
authRestRouter.get("/conductor-warnings/:conductorId", async (req, res) => {
  try {
    const { conductorId } = req.params;
    
    if (!conductorId) {
      return res.status(400).json({ error: "ID do motorista é obrigatório" });
    }
    
    const warnings = await db.getWarningsByConductorId(parseInt(conductorId));
    
    return res.json({
      result: {
        data: {
          json: warnings,
        },
      },
    });
  } catch (error) {
    console.error("[API] Error getting conductor warnings:", error);
    return res.status(500).json({ error: "Erro ao buscar advertências do motorista" });
  }
});

// POST /api/auth/sign-off-warning - Mark a warning as signed off
authRestRouter.post("/sign-off-warning", express.json(), async (req, res) => {
  try {
    const { warningId, conductorId } = req.body;
    
    if (!warningId || !conductorId) {
      return res.status(400).json({ error: "ID da advertência e do motorista são obrigatórios" });
    }
    
    const success = await db.markWarningAsSigned(warningId);
    
    if (success) {
      return res.json({ success: true });
    } else {
      return res.status(500).json({ error: "Erro ao marcar advertência como assinada" });
    }
  } catch (error) {
    console.error("[API] Error signing off warning:", error);
    return res.status(500).json({ error: "Erro ao dar baixa na advertência" });
  }
});
