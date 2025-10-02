import { sql } from "drizzle-orm";
import { initTRPC, TRPCError } from "@trpc/server";

import { db } from "~/db/connection";

export type Context = {
  session: {
    user: {
      id: string;
    };
  } | null;
  db: typeof db;
};

const t = initTRPC.context<Context>().create();

export const router = t.router;
export const procedure = t.procedure;
export const middleware = t.middleware;

export const isAuthed = middleware(async ({ ctx, next }) => {
  if (!ctx.session?.user) {
    throw new TRPCError({ code: "UNAUTHORIZED" });
  }
  return next({
    ctx: {
      ...ctx,
      session: ctx.session,
    },
  });
});

export const authedProcedure = procedure.use(isAuthed);

// Helper function to generate transaction ID for Electric sync
export async function generateTxId(
  tx: Parameters<Parameters<typeof import("~/db/connection").db.transaction>[0]>[0]
): Promise<number> {
  const result = await tx.execute(sql`SELECT pg_current_xact_id()::xid::text as txid`);
  const txid = result.rows[0]?.txid;

  if (txid === undefined) {
    throw new Error(`Failed to get transaction ID`);
  }

  return parseInt(txid as string, 10);
}
