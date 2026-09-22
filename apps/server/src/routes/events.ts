import { Hono } from "hono";
import { streamSSE } from "hono/streaming";
import { createContext } from "../lib/context";
import { logger } from "../lib/logger";
import { subscribeToSuggestions } from "../lib/suggestion-events";

const HEARTBEAT_MS = 25_000;

/**
 * Server-sent events for the web app: currently AI category suggestions. Session
 * authed via the cookie (not the bearer-token external API).
 */
export const eventsRoutes = new Hono();

eventsRoutes.get("/events", async (c) => {
  const context = await createContext({ context: c });
  const userId = context.session?.user?.id;
  if (!userId) {
    return c.json({ error: "Unauthorized" }, 401);
  }

  // Ask nginx (and any other proxy) not to buffer the stream.
  c.header("X-Accel-Buffering", "no");
  c.header("Cache-Control", "no-cache, no-transform");

  return streamSSE(c, async (stream) => {
    let closed = false;
    const unsubscribe = subscribeToSuggestions(userId, (event) => {
      void stream
        .writeSSE({ event: "suggestion", data: JSON.stringify(event) })
        .catch((error) =>
          logger.warn("Failed to write suggestion SSE:", { error }),
        );
    });

    stream.onAbort(() => {
      closed = true;
      unsubscribe();
    });

    try {
      while (!closed) {
        await stream.writeSSE({ event: "ping", data: "" });
        await stream.sleep(HEARTBEAT_MS);
      }
    } finally {
      unsubscribe();
    }
  });
});
