import { COOKIE_NAME } from "@shared/const";
import { getSessionCookieOptions } from "./_core/cookies";
import { systemRouter } from "./_core/systemRouter";
import { publicProcedure, router } from "./_core/trpc";
// import { importRouter } from "./routers/importRouter"; // Desativado: módulo incompleto
import { dashboardRouter } from "./routers/dashboardRouter";
import { configRouter } from "./routers/configRouter";
import { auditRouter } from "./routers/auditRouter";
import { retentionRouter } from "./routers/retentionRouter";
import { templateRouter } from "./routers/templateRouter";
import { pdfRouter } from "./routers/pdfRouter";
import { userRouter } from "./routers/userRouter";
import { authRouter } from "./routers/authRouter";
import { txtempRouter } from "./routers/txtemp";

export const appRouter = router({
    // if you need to use socket.io, read and register route in server/_core/index.ts, all api should start with '/api/' so that the gateway can route correctly
  system: systemRouter,
  auth: authRouter,
  // import: importRouter, // Desativado: módulo incompleto
  dashboard: dashboardRouter,
  config: configRouter,
  audit: auditRouter,
  retention: retentionRouter,
  templates: templateRouter,
  pdf: pdfRouter,
  users: userRouter,
  txtemp: txtempRouter,
});

export type AppRouter = typeof appRouter;
