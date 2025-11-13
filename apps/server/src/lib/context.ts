import type { Context as HonoContext } from "hono";
import { getSession } from "./auth";
import { parseSessionToken } from "./cookies";

export type CreateContextOptions = {
  context: HonoContext;
};

export async function createContext({ context }: CreateContextOptions) {
  const cookieHeader = context.req.header("Cookie");
  const sessionToken = parseSessionToken(cookieHeader);
  const session = await getSession(sessionToken);

  return {
    cookieHeader: cookieHeader || undefined,
    session: session
      ? {
          user: session.user,
          expiresAt: session.session.expiresAt,
        }
      : null,
  };
}

export type Context = Awaited<ReturnType<typeof createContext>>;
