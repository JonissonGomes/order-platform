import type { CreateExpressContextOptions } from "@trpc/server/adapters/express";

export type TrpcContext = {
  req: CreateExpressContextOptions["req"];
  res: CreateExpressContextOptions["res"];
  user: null;
};

export async function createContext(
  opts: CreateExpressContextOptions
): Promise<TrpcContext> {
  // Authentication is now handled by the Go backend via JWT
  // This context is kept for compatibility with tRPC but user is always null
  return {
    req: opts.req,
    res: opts.res,
    user: null,
  };
}
