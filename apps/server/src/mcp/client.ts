import { createRouterClient } from "@orpc/server";
import { eq } from "drizzle-orm";
import { db } from "@/db";
import { user } from "@/db/schema";
import { appRouter } from "@/routers";

/**
 * Typed server-side client for the whole oRPC router.
 *
 * MCP tools call procedures through this client instead of re-implementing
 * queries, so every tool shares the exact validation, ownership checks and
 * aggregation semantics the web UI uses. `createRouterClient` runs the
 * procedure in-process: no HTTP hop, no session cookie.
 */
export async function createTallyoClient(userId: string) {
  const sessionUser = await db.query.user.findFirst({
    where: eq(user.id, userId),
  });

  if (!sessionUser) {
    throw new Error("No user matches this token");
  }

  return createRouterClient(appRouter, {
    context: {
      cookieHeader: undefined,
      session: {
        user: sessionUser,
        expiresAt: new Date(Date.now() + 60_000),
      },
    },
  });
}

export type TallyoClient = Awaited<ReturnType<typeof createTallyoClient>>;
