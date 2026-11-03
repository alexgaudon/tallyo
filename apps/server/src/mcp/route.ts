import { WebStandardStreamableHTTPServerTransport } from "@modelcontextprotocol/sdk/server/webStandardStreamableHttp.js";
import type { Context } from "hono";
import { validateAuthToken } from "@/lib/auth-token";
import { logger } from "@/lib/logger";
import { createTallyoMcpServer } from "./server";

function unauthorized(c: Context) {
  return c.json(
    {
      jsonrpc: "2.0",
      id: null,
      error: {
        code: -32001,
        message:
          "Missing, invalid, or expired Authorization header. Generate an API token in Tallyo Settings.",
      },
    },
    401,
    { "WWW-Authenticate": 'Bearer realm="tallyo"' },
  );
}

/**
 * MCP endpoint (Streamable HTTP, stateless).
 *
 * Clients authenticate with the same bearer token the external REST API uses:
 *
 *   claude mcp add --transport http tallyo https://<host>/mcp \
 *     --header "Authorization: Bearer <token>"
 *
 * A fresh server + transport per request keeps the endpoint stateless, so
 * several machines can use the same token and no session table is needed.
 */
export async function mcpHandler(c: Context) {
  const authHeader = c.req.header("Authorization");
  if (!authHeader?.startsWith("Bearer ")) {
    return unauthorized(c);
  }

  const userId = await validateAuthToken(authHeader.slice("Bearer ".length));
  if (!userId) {
    return unauthorized(c);
  }

  try {
    const server = await createTallyoMcpServer(userId);
    const transport = new WebStandardStreamableHTTPServerTransport({
      // No session generator: every request is independent.
      sessionIdGenerator: undefined,
      // Plain JSON responses are easier to proxy than SSE streams, and no tool
      // here streams progress notifications.
      enableJsonResponse: true,
    });

    await server.connect(transport);
    return await transport.handleRequest(c.req.raw);
  } catch (error) {
    logger.error("MCP request failed", {
      error,
      metadata: { userId, method: c.req.method },
    });

    return c.json(
      {
        jsonrpc: "2.0",
        id: null,
        error: { code: -32603, message: "Internal server error" },
      },
      500,
    );
  }
}
