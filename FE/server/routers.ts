import { systemRouter } from "./_core/systemRouter";
import { publicProcedure, router } from "./_core/trpc";

export const appRouter = router({
  // if you need to use socket.io, read and register route in server/_core/index.ts, all api should start with '/api/' so that the gateway can route correctly
  system: systemRouter,
  
  // Authentication is now handled by the Go backend via JWT
  // This router is kept for compatibility but auth endpoints are in the Go backend
  auth: router({
    me: publicProcedure.query(() => null), // Always returns null, auth is handled by Go backend
    logout: publicProcedure.mutation(() => ({
      success: true,
    } as const)),
  }),

  // TODO: add feature routers here
  // All API endpoints should be in the Go backend
});

export type AppRouter = typeof appRouter;
