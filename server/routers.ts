import { COOKIE_NAME } from "@shared/const";
import { getSessionCookieOptions } from "./_core/cookies";
import { systemRouter } from "./_core/systemRouter";
import { publicProcedure, router } from "./_core/trpc";
import { importRouter } from "./routers/importRouter";
import { dashboardRouter } from "./routers/dashboardRouter";
import { configRouter } from "./routers/configRouter";
import { auditRouter } from "./routers/auditRouter";
import { retentionRouter } from "./routers/retentionRouter";
import { templateRouter } from "./routers/templateRouter";

export const appRouter = router({
    // if you need to use socket.io, read and register route in server/_core/index.ts, all api should start with '/api/' so that the gateway can route correctly
  system: systemRouter,
  auth: router({
    me: publicProcedure.query(opts => opts.ctx.user),
    logout: publicProcedure.mutation(({ ctx }) => {
      const cookieOptions = getSessionCookieOptions(ctx.req);
      ctx.res.clearCookie(COOKIE_NAME, { ...cookieOptions, maxAge: -1 });
      return {
        success: true,
      } as const;
    }),
  }),
  import: importRouter,
  dashboard: dashboardRouter,
  config: configRouter,
  audit: auditRouter,
  retention: retentionRouter,
  templates: templateRouter,
});

export type AppRouter = typeof appRouter;
