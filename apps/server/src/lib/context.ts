import type { Context as HonoContext } from "hono";
import { getSession } from "./auth";

export type CreateContextOptions = {
  context: HonoContext;
};

/**
 * Parse session token from cookie header
 */
function parseSessionToken(cookieHeader: string | undefined): string | null {
  if (!cookieHeader) {
    return null;
  }
  const cookies = cookieHeader.split(";");
  for (const cookie of cookies) {
    const trimmed = cookie.trim();
    if (trimmed.startsWith("session=")) {
      const value = trimmed.substring(8); // "session=".length
      return value || null;
    }
  }
  return null;
}

export async function createContext({ context }: CreateContextOptions) {
  const sessionToken = parseSessionToken(context.req.header("Cookie"));
  const session = await getSession(sessionToken);

  return {
    session: session
      ? {
          user: session.user,
          expiresAt: session.session.expiresAt,
        }
      : null,
  };
}

export type Context = Awaited<ReturnType<typeof createContext>>;
