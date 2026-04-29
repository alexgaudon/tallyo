import { Hono } from "hono";
import {
  deleteSession,
  getDiscordAuthUrl,
  getSession,
  handleDiscordCallback,
  hasUsers,
  validateState,
} from "../lib/auth";
import {
  buildCookieString,
  clearCookieString,
  parseCookie,
  parseSessionToken,
  sessionCookieString,
} from "../lib/cookies";
import { logger } from "../lib/logger";

const CORS_ORIGIN = process.env.CORS_ORIGIN || "";

const authRoutes = new Hono();

authRoutes.get("/has-users", async (c) => {
  const usersExist = await hasUsers();
  return c.json({ hasUsers: usersExist });
});

authRoutes.get("/session", async (c) => {
  const sessionToken = parseSessionToken(c.req.header("Cookie"));
  const session = await getSession(sessionToken);
  return c.json({ session: session ?? null });
});

authRoutes.get("/discord/authorize", async (c) => {
  const stateParam = c.req.query("state");
  if (!stateParam) {
    return c.json({ error: "State parameter required" }, 400);
  }
  if (!validateState(stateParam)) {
    return c.json({ error: "Invalid state parameter" }, 400);
  }

  const authUrl = getDiscordAuthUrl(stateParam);
  const response = c.redirect(authUrl);
  response.headers.set(
    "Set-Cookie",
    buildCookieString("oauth_state", stateParam, 600),
  );
  return response;
});

authRoutes.get("/callback/discord", async (c) => {
  const code = c.req.query("code");
  const state = c.req.query("state");
  const error = c.req.query("error");

  if (error) {
    return callbackError("Authentication failed");
  }
  if (!validateState(state)) {
    logger.warn("Invalid state parameter format in OAuth callback", {
      metadata: { hasState: !!state },
    });
    return callbackError("Authentication failed");
  }

  const stateCookie = parseCookie(c.req.header("Cookie"), "oauth_state");
  if (!stateCookie || stateCookie !== state) {
    logger.warn("State cookie mismatch in OAuth callback", {
      metadata: {
        hasStateCookie: !!stateCookie,
        stateMatches: stateCookie === state,
      },
    });
    return callbackError("Authentication failed");
  }

  if (!code) {
    return callbackError("Authentication failed");
  }

  try {
    const usersExist = await hasUsers();
    const isRegister = !usersExist;
    const { sessionToken } = await handleDiscordCallback(code, isRegister);

    const response = c.redirect(`${CORS_ORIGIN}/dashboard`);
    response.headers.append("Set-Cookie", sessionCookieString(sessionToken));
    response.headers.append("Set-Cookie", clearCookieString("oauth_state"));
    return response;
  } catch (err) {
    logger.error("Discord callback failed", { error: err });
    return callbackError("Authentication failed");
  }
});

authRoutes.post("/signout", async (c) => {
  const sessionToken = parseSessionToken(c.req.header("Cookie"));
  if (sessionToken) {
    await deleteSession(sessionToken);
  }
  return c.json({ success: true }, 200, {
    "Set-Cookie": clearCookieString("session"),
  });
});

function callbackError(message: string): Response {
  const headers = new Headers({
    Location: `${CORS_ORIGIN}/signin?error=${encodeURIComponent(message)}`,
  });
  headers.append("Set-Cookie", clearCookieString("oauth_state"));
  return new Response(null, { status: 302, headers });
}

export default authRoutes;
