import {
  deleteSession,
  generateState,
  getDiscordAuthUrl,
  hasUsers,
} from "../lib/auth";
import { publicProcedure } from "../lib/orpc";

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

export const authRouter = {
  hasUsers: publicProcedure.handler(async () => {
    const usersExist = await hasUsers();
    return { hasUsers: usersExist };
  }),

  getSession: publicProcedure.handler(async ({ context }) => {
    // Parse session token from request headers
    // Note: We need to access the raw request to get cookies
    // Since context already has session, we can use that
    if (!context.session) {
      return { session: null };
    }

    return {
      session: {
        user: context.session.user,
        expiresAt: context.session.expiresAt.toISOString(),
      },
    };
  }),

  signOut: publicProcedure.handler(async ({ context }) => {
    const sessionToken = parseSessionToken(context.cookieHeader);

    if (sessionToken) {
      await deleteSession(sessionToken);
    }

    return { success: true };
  }),

  getDiscordAuthUrl: publicProcedure.handler(async () => {
    const state = generateState();
    const authUrl = getDiscordAuthUrl(state);
    return { url: authUrl, state };
  }),
};
