import { RPCHandler } from "@orpc/server/fetch";
import "dotenv/config";
import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { serveStatic } from "@hono/node-server/serve-static";
import { Hono } from "hono";
import { cors } from "hono/cors";
import { healthCheck } from "./db";
import externalApi from "./external-api";
import { createContext } from "./lib/context";
import { logger } from "./lib/logger";
import { appRouter } from "./routers/index";
import authRoutes from "./routes/auth";

// ---- constants ----
const IS_PROD = process.env.NODE_ENV === "production";
const CORS_ORIGIN = process.env.CORS_ORIGIN || "";

// ---- app ----
const app = new Hono();

// ---- middleware ----

if (process.env.NODE_ENV === "development") {
  app.use(async (_c, next) => {
    await new Promise((r) => setTimeout(r, Math.random() * 40));
    await next();
  });
}

app.use(async (c, next) => {
  const start = Date.now();
  await next();
  const ms = Date.now() - start;
  if (ms > 100) {
    logger.warn(
      `Slow request: ${c.req.method} ${new URL(c.req.url).pathname} - ${ms}ms`,
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

app.use(
  "/*",
  cors({
    origin: CORS_ORIGIN,
    allowMethods: ["GET", "POST", "OPTIONS"],
    allowHeaders: ["Content-Type", "Authorization"],
    credentials: true,
  }),
);

app.onError((err, c) => {
  const pathname = new URL(c.req.url).pathname;

  if (err instanceof Error && err.message.includes("CORS")) {
    logger.error("CORS error", {
      error: err,
      metadata: { origin: c.req.header("Origin"), url: c.req.url },
    });
  } else {
    logger.error("Request failed", {
      error: err,
      metadata: { method: c.req.method, url: c.req.url, path: pathname },
    });
  }

  return c.json({ error: "Internal server error" }, 500);
});

// ---- routes ----
app.route("/api/auth", authRoutes);
app.route("/api", externalApi);

// ---- RPC ----
const rpcHandler = new RPCHandler(appRouter);
app.use("/rpc/*", async (c, next) => {
  const context = await createContext({ context: c });

  try {
    const { matched, response } = await rpcHandler.handle(c.req.raw, {
      prefix: "/rpc",
      context,
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
    return c.json({ error: "Internal server error" }, 500);
  }
});

// ---- root ----
app.get("/", async (c) => {
  try {
    const url = new URL(c.req.url);
    if (!IS_PROD && url.hostname === "localhost") {
      return c.redirect("http://localhost:3001");
    }
    await healthCheck();
    if (IS_PROD) {
      return c.html(
        await readFile(join(process.cwd(), "public", "index.html"), "utf-8"),
      );
    }
    return c.text("OK");
  } catch (error) {
    logger.error("Health check failed", {
      error,
      metadata: { url: c.req.url },
    });
    return c.text("DB Not OK", 500);
  }
});

// ---- production: static files + SPA fallback ----
if (IS_PROD) {
  app.use("/*", serveStatic({ root: "./public" }));

  app.get("*", async (c) => {
    const url = new URL(c.req.url);
    if (url.pathname.startsWith("/api/") || url.pathname.startsWith("/rpc/")) {
      return c.notFound();
    }
    return c.html(
      await readFile(join(process.cwd(), "public", "index.html"), "utf-8"),
    );
  });
}

// ---- process error handlers ----
process.on("uncaughtException", (error) => {
  logger.error("Uncaught exception", { error });
  console.error(error);
  process.exit(1);
});

process.on("unhandledRejection", (reason) => {
  logger.error("Unhandled rejection", { error: reason });
});

export default app;
