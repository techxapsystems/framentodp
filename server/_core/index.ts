import "dotenv/config";
import express from "express";
import { createServer } from "http";
import net from "net";
import { createExpressMiddleware } from "@trpc/server/adapters/express";
import { registerOAuthRoutes } from "./oauth";
import { appRouter } from "../routers";
import { createContext } from "./context";
import { serveStatic, setupVite } from "./vite";
import { authRestRouter } from "../auth-rest";

function isPortAvailable(port: number): Promise<boolean> {
  return new Promise(resolve => {
    const server = net.createServer();
    server.listen(port, () => {
      server.close(() => resolve(true));
    });
    server.on("error", () => resolve(false));
  });
}

async function findAvailablePort(startPort: number = 3000): Promise<number> {
  for (let port = startPort; port < startPort + 20; port++) {
    if (await isPortAvailable(port)) {
      return port;
    }
  }
  throw new Error(`No available port found starting from ${startPort}`);
}

async function startServer() {
  const app = express();
  const server = createServer(app);

  // Trust proxy for correct protocol detection
  app.set('trust proxy', 1);

  // Middleware para logar todas as requisições
  app.use((req, res, next) => {
    console.log(`[${new Date().toISOString()}] ${req.method} ${req.path}`);
    console.log(`[HEADERS] Content-Type: ${req.get('Content-Type')}`);
    console.log(`[QUERY] ${JSON.stringify(req.query)}`);
    next();
  });

  // Configure body parser with larger size limit for file uploads
  app.use(express.json({ limit: "50mb" }));
  app.use(express.urlencoded({ limit: "50mb", extended: true }));

  // OAuth callback under /api/oauth/callback
  registerOAuthRoutes(app);

  // REST API for authentication
  app.use("/api/auth", authRestRouter);

  // Rota para importação de funcionários administrativos
  app.post("/api/import-administrative", async (req, res) => {
    try {
      const { employees } = req.body;
      if (!Array.isArray(employees)) {
        return res.status(400).json({ error: "employees must be an array" });
      }

      const { getDb } = await import("../db");
      const { administrativeEmployees } = await import("../../drizzle/schema");
      const { eq } = await import("drizzle-orm");

      const db = await getDb();
      if (!db) {
        return res.status(500).json({ error: "Database not available" });
      }

      let imported = 0;
      let updated = 0;
      let errors = 0;

      for (const employee of employees) {
        try {
          // Ignorar motoristas e ajudantes
          const cargo = String(employee.cargo || "").toUpperCase();
          if (cargo.includes("MOTORISTA") || cargo.includes("AJUDANTE")) {
            continue;
          }

          const existing = await db
            .select()
            .from(administrativeEmployees)
            .where(eq(administrativeEmployees.cpf, employee.cpf))
            .limit(1);

          if (existing.length > 0) {
            await db
              .update(administrativeEmployees)
              .set({
                nome: employee.nome,
                cargo: employee.cargo,
                admissao: employee.admissao,
                situacao: employee.situacao,
                updatedAt: new Date(),
              })
              .where(eq(administrativeEmployees.cpf, employee.cpf));
            updated++;
          } else {
            await db.insert(administrativeEmployees).values({
              cadastro: employee.cadastro,
              tipo: employee.tipo,
              nome: employee.nome,
              admissao: employee.admissao,
              cargo: employee.cargo,
              situacao: employee.situacao,
              cpf: employee.cpf,
              createdAt: new Date(),
              updatedAt: new Date(),
            });
            imported++;
          }
        } catch (err) {
          console.error(`Erro ao importar ${employee.nome}:`, err);
          errors++;
        }
      }

      res.json({
        success: true,
        imported,
        updated,
        errors,
        total: imported + updated + errors,
      });
    } catch (error) {
      console.error("Erro na importação:", error);
      res.status(500).json({ error: error instanceof Error ? error.message : String(error) });
    }
  });

  // tRPC API
  app.use(
    "/api/trpc",
    createExpressMiddleware({
      router: appRouter,
      createContext,
    })
  );

  // development mode uses Vite, production mode uses static files
  if (process.env.NODE_ENV === "development") {
    await setupVite(app, server);
  } else {
    serveStatic(app);
  }

  const preferredPort = parseInt(process.env.PORT || "3000");
  const port = await findAvailablePort(preferredPort);

  if (port !== preferredPort) {
    console.log(`Port ${preferredPort} is busy, using port ${port} instead`);
  }

  server.listen(port, () => {
    console.log(`Server running on http://localhost:${port}/`);
  });
}

startServer().catch(console.error);
