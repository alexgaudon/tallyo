import type { CallToolResult } from "@modelcontextprotocol/sdk/types.js";
import { logger } from "@/lib/logger";

/** Serialize a tool payload as pretty-printed JSON text. */
export function jsonResult(data: unknown): CallToolResult {
  return {
    content: [
      {
        type: "text",
        text: JSON.stringify(data, null, 2),
      },
    ],
  };
}

function errorMessage(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}

/**
 * Run a tool body, turning thrown errors into an MCP error result instead of a
 * transport failure. The model can then read the message and retry or report.
 */
export async function runTool(
  name: string,
  run: () => Promise<unknown>,
): Promise<CallToolResult> {
  try {
    return jsonResult(await run());
  } catch (error) {
    logger.warn(`MCP tool "${name}" failed`, { error });
    return {
      content: [{ type: "text", text: `Error: ${errorMessage(error)}` }],
      isError: true,
    };
  }
}
