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
          await dbInstance.update(users).set({ openId }).where(eq(users.id as any, user.id));
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
    if (startDateStr) {
      const [year, month, day] = startDateStr.split('-').map(Number);
      const startDate = new Date(year, month - 1, day, 0, 0, 0, 0);
      filters.startDate = startDate;
    }
    if (endDateStr) {
      const [year, month, day] = endDateStr.split('-').map(Number);
      const endDate = new Date(year, month - 1, day, 23, 59, 59, 999);
      filters.endDate = endDate;
    }
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
    if (startDateStr) {
      const [year, month, day] = startDateStr.split('-').map(Number);
      const startDate = new Date(year, month - 1, day, 0, 0, 0, 0);
      filters.startDate = startDate;
    }
    if (endDateStr) {
      const [year, month, day] = endDateStr.split('-').map(Number);
      const endDate = new Date(year, month - 1, day, 23, 59, 59, 999);
      filters.endDate = endDate;
    }
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
    const startDateStr = req.query.startDate as string;
    const endDateStr = req.query.endDate as string;
    const operation = req.query.operation as string;

    const filters: any = {};
    if (startDateStr) {
      const [year, month, day] = startDateStr.split('-').map(Number);
      const startDate = new Date(year, month - 1, day, 0, 0, 0, 0);
      filters.startDate = startDate;
    }
    if (endDateStr) {
      const [year, month, day] = endDateStr.split('-').map(Number);
      const endDate = new Date(year, month - 1, day, 23, 59, 59, 999);
      filters.endDate = endDate;
    }
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
    const conductors = await db.getAllConductors();
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

    const warnings = await db.getConductorWarnings(conductorName.replace(/%20/g, ' '));
    const unsignedWarnings = warnings.filter((w: any) => !w.advertenciaAplicada);
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


// POST /api/auth/download-warning-pdf - Download individual warning PDF
authRestRouter.post("/download-warning-pdf", express.json(), async (req, res) => {
  try {
    const { warningId, conductorName, conductorCPF, warningDate, warningType, warningLevel, startDate, endDate, returnDate, reason, description } = req.body;
    
    if (!warningId || !conductorName) {
      return res.status(400).json({ error: "ID da advertência e nome do motorista são obrigatórios" });
    }

    const { generateWarningPDF } = await import("./services/pdfService");
    
    // Dados para o PDF
    const pdfData = {
      type: (warningType === "suspensao" ? "suspensao" : "advertencia") as "suspensao" | "advertencia",
      employeeName: conductorName,
      employeeCPF: conductorCPF || "000.000.000-00",
      employeeCTPS: "001013879    5626 - MG",
      licensePlate: "",
      operation: "",
      infringementDate: warningDate || new Date().toLocaleDateString("pt-BR"),
      reason: reason || warningType || "Descumprimento de responsabilidades",
      description: description || `Advertência disciplinar referente a ${warningType || "irregularidade"} - Nível ${warningLevel || 1}`,
      penaltyType: warningType || "Outro",
      penaltyDuration: "",
      startDate: startDate || new Date().toLocaleDateString("pt-BR"),
      endDate: endDate || new Date().toLocaleDateString("pt-BR"),
      returnDate: returnDate || new Date().toLocaleDateString("pt-BR"),
      companyName: "TRANSPORTES FRAMENTO LTDA",
      companyAddress: "Ed. Vértice Office - R. Borges de Medeiros, 897 - E - sala 1201",
      companyCNPJ: "00.766.315/0001-44",
      companyCity: "Chapecó",
      signatureDate: new Date().toLocaleDateString("pt-BR"),
    };

    const pdfBuffer = await generateWarningPDF(pdfData as any);
    
    res.setHeader("Content-Type", "application/pdf");
    res.setHeader("Content-Disposition", `attachment; filename="${warningType === "suspensao" ? "Suspensao" : "Advertencia"}_${conductorName.replace(/\s+/g, "_")}_${new Date().getTime()}.pdf"`);
    res.send(pdfBuffer);
  } catch (error) {
    console.error("[API] Error downloading warning PDF:", error);
    return res.status(500).json({ error: "Erro ao gerar PDF da advertência: " + (error instanceof Error ? error.message : String(error)) });
  }
});


// DELETE /api/auth/warnings/:id - Delete a warning
authRestRouter.delete("/warnings/:id", express.json(), async (req, res) => {
  try {
    const { id } = req.params;
    const warningId = parseInt(id, 10);

    if (!warningId || isNaN(warningId)) {
      return res.status(400).json({ error: "ID de advertência inválido" });
    }

    // Obter dados da advertência antes de deletar para auditoria
    const warning = await db.getWarningById(warningId);
    
    await db.deleteWarning(warningId);
    
    // Log de auditoria (apenas para admins)
    if (warning) {
      const userId = (req as any).user?.id || 0;
      const userEmail = (req as any).user?.email || "sistema";
      const userName = (req as any).user?.name || "Sistema";
      const userRole = (req as any).user?.role || "user";
      
      // Apenas registrar se for admin
      if (userRole === "admin") {
        await db.logWarningAudit(
          warningId,
          "deletado",
          userId,
          userEmail,
          userName,
          warning.conductorName,
          undefined,
          warning as any,
          undefined,
          req.body.motivo || "Deletado pelo sistema",
          req.ip
        );
      }
    }
    
    return res.status(200).json({ success: true, message: "Advertência deletada com sucesso" });
  } catch (error) {
    console.error("[API] Error deleting warning:", error);
    return res.status(500).json({ error: "Erro ao deletar advertência: " + (error instanceof Error ? error.message : String(error)) });
  }
});

// PUT /api/auth/warnings/:id - Update a warning
authRestRouter.put("/warnings/:id", express.json(), async (req, res) => {
  try {
    const { id } = req.params;
    const warningId = parseInt(id, 10);
    const { motivo, observacao, dataInicio, dataFim } = req.body;

    if (!warningId || isNaN(warningId)) {
      return res.status(400).json({ error: "ID de advertência inválido" });
    }

    // Obter dados anteriores para auditoria
    const warningBefore = await db.getWarningById(warningId);
    
    const updateData = {
      motivo: motivo || undefined,
      observacao: observacao || undefined,
      dataInicio: dataInicio || undefined,
      dataFim: dataFim || undefined,
    };
    
    await db.updateWarning(warningId, updateData);
    
    // Log de auditoria (apenas para admins)
    const userId = (req as any).user?.id || 0;
    const userEmail = (req as any).user?.email || "sistema";
    const userName = (req as any).user?.name || "Sistema";
    const userRole = (req as any).user?.role || "user";
    
    if (userRole === "admin" && warningBefore) {
      // Identificar quais campos foram alterados
      const camposAlterados = [];
      const valorAnterior: Record<string, unknown> = {};
      const valorNovo: Record<string, unknown> = {};
      
      if (motivo && motivo !== warningBefore.motivo) {
        camposAlterados.push("motivo");
        valorAnterior.motivo = warningBefore.motivo;
        valorNovo.motivo = motivo;
      }
      if (observacao && observacao !== warningBefore.observacao) {
        camposAlterados.push("observacao");
        valorAnterior.observacao = warningBefore.observacao;
        valorNovo.observacao = observacao;
      }
      if (dataInicio && dataInicio !== warningBefore.dataInicio?.toString()) {
        camposAlterados.push("dataInicio");
        valorAnterior.dataInicio = warningBefore.dataInicio;
        valorNovo.dataInicio = dataInicio;
      }
      if (dataFim && dataFim !== warningBefore.dataFim?.toString()) {
        camposAlterados.push("dataFim");
        valorAnterior.dataFim = warningBefore.dataFim;
        valorNovo.dataFim = dataFim;
      }
      
      if (camposAlterados.length > 0) {
        await db.logWarningAudit(
          warningId,
          "editado",
          userId,
          userEmail,
          userName,
          warningBefore.conductorName,
          camposAlterados,
          valorAnterior,
          valorNovo,
          req.body.motivo_auditoria || undefined,
          req.ip
        );
      }
    }

    return res.status(200).json({ success: true, message: "Advertência atualizada com sucesso" });
  } catch (error) {
    console.error("[API] Error updating warning:", error);
    return res.status(500).json({ error: "Erro ao atualizar advertência: " + (error instanceof Error ? error.message : String(error)) });
  }
});


// GET /api/auth/warnings-audit-log - Get warning audit history
authRestRouter.get("/warnings-audit-log", async (req, res) => {
  try {
    // Verificar se é admin
    const userRole = (req as any).user?.role;
    if (userRole !== "admin") {
      return res.status(403).json({ error: "Apenas administradores podem acessar o histórico de auditoria" });
    }

    const { conductor, action, startDate, endDate } = req.query;
    
    let history: any[] = [];

    if (conductor) {
      // Buscar histórico por motorista
      const start = startDate ? new Date(startDate as string) : undefined;
      const end = endDate ? new Date(endDate as string) : undefined;
      history = await db.getConductorWarningAuditHistory(conductor as string, start, end);
    } else if (action) {
      // Buscar histórico por ação (não implementado, mas pode ser adicionado)
      history = [];
    } else {
      // Retornar vazio se nenhum filtro for fornecido
      history = [];
    }

    // Filtrar por ação se fornecido
    if (action) {
      history = history.filter((log) => log.acao === action);
    }

    return res.status(200).json(history);
  } catch (error) {
    console.error("[API] Error getting warning audit history:", error);
    return res.status(500).json({ error: "Erro ao buscar histórico de auditoria: " + (error instanceof Error ? error.message : String(error)) });
  }
});

