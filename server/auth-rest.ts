import express from "express";
import * as db from "./db";
import { verifyPassword } from "./auth";
import { sdk } from "./_core/sdk";
import { COOKIE_NAME, ONE_YEAR_MS } from "@shared/const";
import { getSessionCookieOptions } from "./_core/cookies";
import PDFDocument from "pdfkit";

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
    if (operacao && operacao !== 'all') filters.operacao = operacao;

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
    const startDateStr = req.query.startDate as string;
    const endDateStr = req.query.endDate as string;
    const operation = req.query.operation as string;

    const filters: any = {};
    if (startDateStr) filters.startDate = new Date(startDateStr);
    if (endDateStr) filters.endDate = new Date(endDateStr);
    if (operation) filters.operacao = operation;

    const stats = await db.getWarningsStatsByDriver(filters);
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

authRestRouter.post("/import-conductors", express.json(), async (req, res) => {
  try {
    const { conductors } = req.body;
    if (!Array.isArray(conductors)) {
      return res.status(400).json({ error: "Condutores devem ser um array" });
    }

    await db.importConductors(conductors);
    return res.json({ success: true, message: "Condutores importados com sucesso" });
  } catch (error) {
    console.error("[API] Error importing conductors:", error);
    return res.status(500).json({ error: "Erro ao importar condutores" });
  }
});

authRestRouter.get("/conductors", async (req, res) => {
  try {
    const conductors = await db.getConductors();
    return res.json({
      result: {
        data: {
          json: conductors,
        },
      },
    });
  } catch (error) {
    console.error("[API] Error getting conductors:", error);
    return res.status(500).json({ error: "Erro ao buscar condutores" });
  }
});

authRestRouter.post("/mark-warning-signed", express.json(), async (req, res) => {
  try {
    const { warningId } = req.body;
    if (!warningId) {
      return res.status(400).json({ error: "ID da advertência é obrigatório" });
    }

    const success = await db.markWarningAsSigned(warningId);
    if (success) {
      return res.json({ success: true });
    } else {
      return res.status(500).json({ error: "Erro ao marcar advertência como assinada" });
    }
  } catch (error) {
    console.error("[API] Error marking warning as signed:", error);
    return res.status(500).json({ error: "Erro ao marcar advertência como assinada" });
  }
});

authRestRouter.get("/unsigned-warnings/:conductorName", async (req, res) => {
  try {
    const { conductorName } = req.params;
    if (!conductorName) {
      return res.status(400).json({ error: "Nome do condutor é obrigatório" });
    }

    const warnings = await db.getUnsignedWarnings(conductorName);
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

authRestRouter.get("/list-conductors", async (req, res) => {
  try {
    const conductors = await db.listConductors();
    return res.json({
      result: {
        data: {
          json: conductors,
        },
      },
    });
  } catch (error) {
    console.error("[API] Error listing conductors:", error);
    return res.status(500).json({ error: "Erro ao listar condutores" });
  }
});

authRestRouter.get("/conductor-warnings/:conductorId", async (req, res) => {
  try {
    const { conductorId } = req.params;
    if (!conductorId) {
      return res.status(400).json({ error: "ID do condutor é obrigatório" });
    }

    const warnings = await db.getConductorWarnings(conductorId);
    return res.json({
      result: {
        data: {
          json: warnings,
        },
      },
    });
  } catch (error) {
    console.error("[API] Error getting conductor warnings:", error);
    return res.status(500).json({ error: "Erro ao buscar advertências do condutor" });
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

// POST /api/auth/generate-report-pdf - Generate PDF report of warnings
authRestRouter.post("/generate-report-pdf", express.json(), async (req, res) => {
  try {
    const { warnings } = req.body;
    
    if (!warnings || !Array.isArray(warnings) || warnings.length === 0) {
      return res.status(400).json({ error: "Nenhuma advertência para gerar relatório" });
    }

    // Criar documento PDF
    const doc = new PDFDocument({
      size: "A4",
      margin: 40,
    });
    
    // Configurar headers para download
    res.setHeader("Content-Type", "application/pdf");
    res.setHeader("Content-Disposition", `attachment; filename="relatorio-advertencias-${Date.now()}.pdf"`);
    
    // Pipe do PDF para a resposta
    doc.pipe(res);
    
    // Título
    doc.fontSize(18).font("Helvetica-Bold").text("Relatório de Advertências", { align: "center" });
    doc.moveDown(0.3);
    
    // Data de geração
    doc.fontSize(9).font("Helvetica").text(`Gerado em: ${new Date().toLocaleDateString("pt-BR")} às ${new Date().toLocaleTimeString("pt-BR")}`, { align: "center" });
    doc.moveDown(0.8);
    
    // Tabela simples
    const tableData = [
      ["Motorista", "Operação", "Placa", "Data", "Tipo", "Status"],
      ...warnings.map((w: any) => [
        w.nome || "-",
        w.operacao || "-",
        w.placa || "-",
        w.data ? new Date(w.data).toLocaleDateString("pt-BR") : "-",
        w.tipo || "Advertência",
        w.assinada ? "Assinada" : "Pendente",
      ]),
    ];
    
    // Desenhar tabela manualmente
    doc.fontSize(9).font("Helvetica");
    const colWidths = [80, 80, 60, 60, 80, 60];
    const rowHeight = 18;
    let y = doc.y;
    
    // Cabeçalho
    doc.font("Helvetica-Bold");
    tableData[0].forEach((cell, i) => {
      const x = 40 + colWidths.slice(0, i).reduce((a, b) => a + b, 0);
      doc.text(cell, x, y, { width: colWidths[i], height: rowHeight, align: "left" });
    });
    
    y += rowHeight;
    doc.moveTo(40, y).lineTo(540, y).stroke();
    y += 5;
    
    // Dados
    doc.font("Helvetica");
    for (let i = 1; i < tableData.length; i++) {
      if (y > 750) {
        doc.addPage();
        y = 40;
      }
      
      tableData[i].forEach((cell, j) => {
        const x = 40 + colWidths.slice(0, j).reduce((a, b) => a + b, 0);
        doc.text(cell, x, y, { width: colWidths[j], height: rowHeight, align: "left" });
      });
      
      y += rowHeight;
    }
    
    // Rodapé
    doc.moveTo(40, y).lineTo(540, y).stroke();
    doc.moveDown(1);
    doc.fontSize(10).font("Helvetica-Bold").text(`Total de advertências: ${warnings.length}`);
    
    // Finalizar PDF
    doc.end();
  } catch (error) {
    console.error("[API] Error generating PDF report:", error);
    if (!res.headersSent) {
      return res.status(500).json({ error: "Erro ao gerar PDF do relatório: " + (error instanceof Error ? error.message : String(error)) });
    }
  }
});


// POST /api/auth/generate-warning-pdf - Generate PDF for a single warning
authRestRouter.post("/generate-warning-pdf", express.json(), async (req, res) => {
  try {
    const { warningId, conductorId } = req.body;
    
    if (!warningId || !conductorId) {
      return res.status(400).json({ error: "warningId e conductorId são obrigatórios" });
    }

    // Buscar dados da advertência e do motorista
    const warning = await db.getWarningById(warningId);
    const conductor = await db.getConductorById(conductorId);
    
    if (!warning || !conductor) {
      return res.status(404).json({ error: "Advertência ou motorista não encontrado" });
    }

    // Criar documento PDF
    const doc = new PDFDocument({
      size: "A4",
      margin: 50,
    });

    // Configurar headers para download
    res.setHeader("Content-Type", "application/pdf");
    res.setHeader("Content-Disposition", `attachment; filename="advertencia-${new Date(warning.criadoEm).toLocaleDateString('pt-BR').replace(/\//g, '-')}.pdf"`);

    // Pipe do PDF para a resposta
    doc.pipe(res);

    // Título
    doc.fontSize(24).font("Helvetica-Bold").text("ADVERTÊNCIA", { align: "center" });
    doc.moveDown(0.5);
    doc.fontSize(10).font("Helvetica").text("Documento de Aviso Formal", { align: "center" });
    doc.moveDown(1);

    // Informações do motorista
    doc.fontSize(11).font("Helvetica-Bold").text("INFORMAÇÕES DO MOTORISTA");
    doc.fontSize(10).font("Helvetica");
    doc.text(`Nome: ${conductor.nome}`);
    doc.text(`CPF: ${conductor.cpf}`);
    doc.text(`Operação: ${conductor.operacao}`);
    doc.text(`Placa: ${conductor.placa}`);
    doc.text(`Cargo: ${conductor.cargo}`);
    doc.moveDown(0.8);

    // Informações da advertência
    doc.fontSize(11).font("Helvetica-Bold").text("INFORMAÇÕES DA ADVERTÊNCIA");
    doc.fontSize(10).font("Helvetica");
    doc.text(`Data: ${new Date(warning.criadoEm).toLocaleDateString('pt-BR')}`);
    doc.text(`Tipo: ${warning.categoria}`);
    doc.text(`Status: ${warning.assinada ? "Assinada" : "Pendente"}`);
    doc.moveDown(0.8);

    // Descrição
    if (warning.descricao) {
      doc.fontSize(11).font("Helvetica-Bold").text("DESCRIÇÃO");
      doc.fontSize(10).font("Helvetica").text(warning.descricao, { align: "left" });
      doc.moveDown(0.8);
    }

    // Espaço para assinatura
    doc.moveDown(2);
    doc.fontSize(10).font("Helvetica").text("_____________________________", { align: "left" });
    doc.fontSize(9).text("Assinatura do Motorista", { align: "left" });
    doc.moveDown(1);
    doc.text("_____________________________", { align: "left" });
    doc.fontSize(9).text("Data", { align: "left" });

    // Rodapé
    doc.moveDown(2);
    doc.fontSize(8).font("Helvetica").text(`Gerado em: ${new Date().toLocaleDateString('pt-BR')} às ${new Date().toLocaleTimeString('pt-BR')}`, { align: "center" });

    // Finalizar PDF
    doc.end();
  } catch (error) {
    console.error("[API] Error generating warning PDF:", error);
    if (!res.headersSent) {
      return res.status(500).json({ error: "Erro ao gerar PDF da advertência: " + (error instanceof Error ? error.message : String(error)) });
    }
  }
});


// GET /api/auth/all-pending-warnings - Get all pending warnings
authRestRouter.get("/all-pending-warnings", async (req, res) => {
  try {
    const allWarnings = await db.getAllPendingWarnings();
    return res.json({
      success: true,
      result: {
        data: {
          json: allWarnings,
        },
      },
    });
  } catch (error) {
    console.error("[API] Error getting all pending warnings:", error);
    return res.status(500).json({ error: "Erro ao carregar advertências pendentes" });
  }
});
