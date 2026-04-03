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

  // Middleware para logar todas as requisições
  app.use((req, res, next) => {
    console.log(`[${new Date().toISOString()}] ${req.method} ${req.path}`);
    console.log(`[HEADERS] Content-Type: ${req.get('Content-Type')}`);
    console.log(`[QUERY] ${JSON.stringify(req.query)}`);
    next();
  });

  // Configure body parser with larger size limit for file uploads
  app.use(express.json({ limit: "50mb" }));
  
  // Middleware para logar o body após parsing
  app.use((req, res, next) => {
    console.log(`[BODY] ${req.method} ${req.path}`, req.body);
    console.log(`[QUERY] ${req.method} ${req.path}`, req.query);
    next();
  });

  app.use(express.urlencoded({ limit: "50mb", extended: true }));
  
  // Middleware para fazer parse do input do tRPC quando for string
  app.use((req, res, next) => {
    if (req.query.input && typeof req.query.input === 'string') {
      try {
        // tRPC envia input como JSON string na query
        const parsed = JSON.parse(req.query.input);
        // Copiar para req.body para que o tRPC reconheça
        req.body = parsed;
        console.log(`[PARSED INPUT] ${req.path}`, parsed);
      } catch (e: unknown) {
        console.error(`[PARSE ERROR] ${req.path}`, (e as Error).message);
      }
    }
    next();
  });

  // OAuth callback under /api/oauth/callback
  registerOAuthRoutes(app);

  // REST API for authentication
  app.use("/api/auth", authRestRouter);

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
