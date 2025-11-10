import { RPCHandler } from "@orpc/server/fetch";
import "dotenv/config";
import { Hono } from "hono";
import { serveStatic } from "hono/bun";
import { cors } from "hono/cors";
import { z } from "zod";
import { healthCheck } from "./db";
import {
  deleteSession,
  generateState,
  getDiscordAuthUrl,
  getSession,
  handleDiscordCallback,
  hasUsers,
  validateState,
} from "./lib/auth";
import { createContext } from "./lib/context";
import { logger } from "./lib/logger";
import {
  createOpenAPIGenerator,
  generateOpenAPISpec,
  getScalarHTML,
} from "./lib/openapi";
import { appRouter } from "./routers/index";

const app = new Hono();

// app.use(honoLogger());

if (process.env.NODE_ENV === "development") {
  app.use(async (_c, next) => {
    const delay = Math.floor(Math.random() * 40);
    await new Promise((resolve) => setTimeout(resolve, delay));
    await next();
  });
}

// Log slow requests and errors
app.use(async (c, next) => {
  const start = Date.now();
  try {
    await next();
  } catch (error) {
    logger.error("Request failed", {
      error,
      metadata: {
        method: c.req.method,
        url: c.req.url,
        path: new URL(c.req.url).pathname,
      },
    });
    throw error;
  }

  const ms = Date.now() - start;
  // Only log requests that take longer than 100ms
  if (ms > 100) {
    logger.warn(
      `Slow request detected: ${c.req.method} ${c.req.url} - ${ms}ms`,
      {
        metadata: {
          method: c.req.method,
          url: new URL(c.req.url).pathname,
          ms,
        },
      },
    );
  }
});

// Log CORS errors
app.use("*", async (c, next) => {
  try {
    await next();
  } catch (error) {
    if (error instanceof Error && error.message.includes("CORS")) {
      logger.error("CORS error", {
        error,
        metadata: {
          origin: c.req.header("Origin"),
          url: c.req.url,
        },
      });
    }
    throw error;
  }
});

app.use(
  "/*",
  cors({
    origin: process.env.CORS_ORIGIN || "",
    allowMethods: ["GET", "POST", "OPTIONS"],
    allowHeaders: ["Content-Type", "Authorization"],
    credentials: true,
  }),
);

// Check if users exist
app.get("/api/auth/has-users", async (c) => {
  try {
    const usersExist = await hasUsers();
    return c.json({ hasUsers: usersExist });
  } catch (error) {
    logger.error("Failed to check users", { error });
    return c.json({ error: "Failed to check users" }, 500);
  }
});

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

/**
 * Build secure cookie string
 */
function buildCookieString(
  name: string,
  value: string,
  maxAge: number,
  options: {
    httpOnly?: boolean;
    secure?: boolean;
    sameSite?: "Lax" | "Strict";
  } = {},
): string {
  const isProduction = process.env.NODE_ENV === "production";
  const parts = [`${name}=${value}`, `Path=/`, `Max-Age=${maxAge}`];

  if (options.httpOnly !== false) {
    parts.push("HttpOnly");
  }

  if (options.secure !== false && isProduction) {
    parts.push("Secure");
  }

  parts.push(`SameSite=${options.sameSite || "Lax"}`);

  return parts.join("; ");
}

// Get session
app.get("/api/auth/session", async (c) => {
  try {
    const sessionToken = parseSessionToken(c.req.header("Cookie"));
    const session = await getSession(sessionToken);

    if (!session) {
      return c.json({ session: null }, 200);
    }

    return c.json({ session }, 200);
  } catch (error) {
    logger.error("Failed to get session", { error });
    return c.json({ error: "Failed to get session" }, 500);
  }
});

// Discord OAuth - initiate
app.get("/api/auth/discord/authorize", async (c) => {
  try {
    const state = generateState();
    const authUrl = getDiscordAuthUrl(state);

    // Store state in secure cookie for CSRF protection (10 minutes expiration)
    const stateCookie = buildCookieString("oauth_state", state, 600, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "Lax",
    });

    const response = c.redirect(authUrl);
    response.headers.set("Set-Cookie", stateCookie);
    return response;
  } catch (error) {
    logger.error("Failed to initiate Discord auth", { error });
    return c.json({ error: "Failed to initiate authentication" }, 500);
  }
});

// Discord OAuth - callback
app.get("/api/auth/callback/discord", async (c) => {
  try {
    const code = c.req.query("code");
    const state = c.req.query("state");
    const error = c.req.query("error");

    if (error) {
      return c.redirect(
        `${process.env.CORS_ORIGIN}/signin?error=${encodeURIComponent("Authentication failed")}`,
      );
    }

    // Validate state parameter for CSRF protection
    const cookieHeader = c.req.header("Cookie");
    let storedState: string | null = null;
    if (cookieHeader) {
      const cookies = cookieHeader.split(";");
      for (const cookie of cookies) {
        const trimmed = cookie.trim();
        if (trimmed.startsWith("oauth_state=")) {
          storedState = trimmed.substring(12); // "oauth_state=".length
          break;
        }
      }
    }

    if (!validateState(state) || !storedState || state !== storedState) {
      logger.warn("Invalid state parameter in OAuth callback", {
        metadata: { hasState: !!state, hasStoredState: !!storedState },
      });
      return c.redirect(
        `${process.env.CORS_ORIGIN}/signin?error=${encodeURIComponent("Authentication failed")}`,
      );
    }

    if (!code) {
      return c.redirect(
        `${process.env.CORS_ORIGIN}/signin?error=${encodeURIComponent("Authentication failed")}`,
      );
    }

    // Determine if this is a register or sign-in
    const usersExist = await hasUsers();
    const isRegister = !usersExist;

    const { sessionToken } = await handleDiscordCallback(code, isRegister);

    // Set session cookie and redirect
    const redirectUrl = `${process.env.CORS_ORIGIN}/`;
    const response = c.redirect(redirectUrl);

    // Clear state cookie and set session cookie
    const clearStateCookie = buildCookieString("oauth_state", "", 0, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "Lax",
    });
    const sessionCookie = buildCookieString(
      "session",
      sessionToken,
      30 * 24 * 60 * 60,
      {
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        sameSite: "Lax",
      },
    );

    response.headers.set(
      "Set-Cookie",
      [clearStateCookie, sessionCookie].join(", "),
    );
    return response;
  } catch (error) {
    logger.error("Discord callback failed", { error });
    return c.redirect(
      `${process.env.CORS_ORIGIN}/signin?error=${encodeURIComponent("Authentication failed")}`,
    );
  }
});

// Sign out
app.post("/api/auth/signout", async (c) => {
  try {
    const sessionToken = parseSessionToken(c.req.header("Cookie"));

    if (sessionToken) {
      await deleteSession(sessionToken);
    }

    const clearCookie = buildCookieString("session", "", 0, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "Lax",
    });

    return c.json({ success: true }, 200, {
      "Set-Cookie": clearCookie,
    });
  } catch (error) {
    logger.error("Failed to sign out", { error });
    return c.json({ error: "Failed to sign out" }, 500);
  }
});

// API route for creating transactions with custom auth token
app.post("/api/transactions", async (c) => {
  try {
    const authHeader = c.req.header("Authorization");
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return c.json({ error: "Missing or invalid Authorization header" }, 401);
    }

    const token = authHeader.substring(7); // Remove "Bearer " prefix

    // Validate the custom auth token
    const { validateAuthToken } = await import("./lib/auth-token");
    const userId = await validateAuthToken(token);

    if (!userId) {
      return c.json({ error: "Invalid or expired token" }, 401);
    }

    // Parse and validate request body with Zod
    const body = await c.req.json();

    const transactionSchema = z.object({
      amount: z.number().int(),
      date: z.string().or(z.date()),
      transactionDetails: z.string(),
      merchantId: z.string().optional(),
      categoryId: z.string().optional(),
      notes: z.string().optional(),
      externalId: z.string(),
    });

    const requestSchema = z.object({
      transactions: z.array(transactionSchema).min(1).max(100),
    });

    const validationResult = requestSchema.safeParse(body);
    if (!validationResult.success) {
      return c.json(
        {
          error: "Invalid request format",
          details: validationResult.error.issues,
        },
        400,
      );
    }

    const { transactions } = validationResult.data;

    console.log("Transaction Count:", transactions.length);
    const { getMerchantFromVendor } = await import("./routers/merchants");
    const { transaction } = await import("./db/schema");
    const { db } = await import("./db");

    // Prepare all transaction data
    const transactionData = await Promise.all(
      transactions.map(async (newTransaction) => {
        const merchant = await getMerchantFromVendor(
          newTransaction.transactionDetails,
          userId,
        );

        return {
          ...newTransaction,
          merchantId: merchant?.id,
          categoryId: merchant?.recommendedCategoryId,
          userId: userId,
          date: new Date(newTransaction.date).toISOString().split("T")[0],
        };
      }),
    );

    // Single bulk insert
    const insertedTransactions = await db
      .insert(transaction)
      .values(transactionData)
      .onConflictDoNothing()
      .returning();

    const addedCount = insertedTransactions.length;

    return c.json({
      message: "Transactions received",
      count: addedCount,
    });
  } catch (error) {
    logger.error("API transaction creation failed", {
      error,
      metadata: {
        method: c.req.method,
        url: c.req.url,
      },
    });

    if (error instanceof Error) {
      return c.json({ error: error.message }, 500);
    }
    return c.json({ error: "Internal server error" }, 500);
  }
});

const handler = new RPCHandler(appRouter);
app.use("/rpc/*", async (c, next) => {
  const context = await createContext({ context: c });

  try {
    const { matched, response } = await handler.handle(c.req.raw, {
      prefix: "/rpc",
      context: context,
    });
    if (matched) {
      return c.newResponse(response.body, response);
    }
    await next();
  } catch (error) {
    logger.error("RPC request failed", {
      error,
      metadata: {
        method: c.req.method,
        url: c.req.url,
        userId: context.session?.user?.id,
      },
    });
    throw error;
  }
});

// OpenAPI / Swagger UI Documentation
const openAPIGenerator = createOpenAPIGenerator();

app.get("/api-docs/spec.json", async (c) => {
  try {
    const url = new URL(c.req.url);
    const baseUrl = `${url.protocol}//${url.host}/rpc`;
    const spec = await generateOpenAPISpec(
      openAPIGenerator,
      appRouter,
      baseUrl,
    );
    return c.json(spec);
  } catch (error) {
    logger.error("OpenAPI spec generation failed", {
      error,
      metadata: {
        url: c.req.url,
      },
    });
    return c.json({ error: "Failed to generate OpenAPI spec" }, 500);
  }
});

app.get("/api-docs", async (c) => {
  try {
    const url = new URL(c.req.url);
    const specUrl = `${url.protocol}//${url.host}/api-docs/spec.json`;
    const html = getScalarHTML(specUrl);
    return c.html(html);
  } catch (error) {
    logger.error("OpenAPI docs page failed", {
      error,
      metadata: {
        url: c.req.url,
      },
    });
    return c.json({ error: "Failed to load API documentation" }, 500);
  }
});

app.get("/", async (c) => {
  try {
    const url = new URL(c.req.url);
    if (
      process.env.NODE_ENV === "development" &&
      url.hostname === "localhost"
    ) {
      return c.redirect("http://localhost:3001");
    }
    await healthCheck();
    if (process.env.NODE_ENV === "production") {
      return c.html(await Bun.file("./public/index.html").text());
    }
    if (
      c.req.header("accept")?.includes("text/html") ||
      c.req.header("accept")?.includes("application/xhtml+xml")
    ) {
      return c.redirect("/api-docs");
    }
    return c.text("OK");
  } catch (error) {
    logger.error("Health check failed", {
      error,
      metadata: {
        url: c.req.url,
      },
    });
    return c.text("DB Not OK", 500);
  }
});

// Serve static files in production
if (process.env.NODE_ENV === "production") {
  app.use("/*", serveStatic({ root: "./public" }));

  // Handle client-side routing for SPA
  app.get("*", async (c) => {
    const url = new URL(c.req.url);
    // Don't serve index.html for API routes
    if (
      url.pathname.startsWith("/api/") ||
      url.pathname.startsWith("/rpc/") ||
      url.pathname.startsWith("/api-docs")
    ) {
      return c.notFound();
    }
    return c.html(await Bun.file("./public/index.html").text());
  });
}

// Log application startup errors
process.on("uncaughtException", (error) => {
  logger.error("Uncaught exception", { error });
  process.exit(1);
});

process.on("unhandledRejection", (reason) => {
  logger.error("Unhandled rejection", { error: reason });
});

export default app;
