import express from "express";
import * as db from "./db";
import { verifyPassword } from "./auth";

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
