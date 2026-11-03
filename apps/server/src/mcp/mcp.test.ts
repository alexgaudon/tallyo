import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { InMemoryTransport } from "@modelcontextprotocol/sdk/inMemory.js";
import { Hono } from "hono";
import { afterEach, describe, expect, it, vi } from "vite-plus/test";
import type { TallyoClient } from "./client";
import { mcpHandler } from "./route";
import { buildTallyoMcpServer } from "./server";

// The oRPC router validates its OAuth config at import time. These placeholders
// only satisfy that check; nothing in this suite performs a login.
vi.hoisted(() => {
  process.env.DISCORD_CLIENT_ID ||= "test-client-id";
  process.env.DISCORD_CLIENT_SECRET ||= "test-client-secret";
  process.env.CORS_ORIGIN ||= "http://localhost:3001";
});

const EXPECTED_TOOLS = [
  "list_transactions",
  "get_transactions_summary",
  "create_transactions",
  "update_transaction",
  "apply_suggestion",
  "split_transaction",
  "delete_transaction",
  "get_dashboard_overview",
  "get_spending_breakdown",
  "get_period_comparison",
  "list_categories",
  "list_merchants",
  "get_taxonomy_usage",
  "create_category",
  "update_category",
  "delete_category",
  "create_merchant",
  "update_merchant",
  "delete_merchant",
  "merge_merchants",
  "apply_merchant",
  "apply_all_merchants",
];

function createStubClient() {
  return {
    transactions: {
      getView: vi.fn(async () => ({
        transactions: [],
        pagination: { total: 0, page: 1, pageSize: 50, totalPages: 0 },
      })),
      getViewSummary: vi.fn(async () => ({
        totalCount: 0,
        totalAmount: 0,
        averageAmount: 0,
      })),
      splitTransaction: vi.fn(async () => ({ transactions: [] })),
      deleteTransaction: vi.fn(async () => ({ success: true })),
    },
    categories: {
      getUserCategories: vi.fn(async () => ({ categories: [] })),
      getCategoryUsage: vi.fn(async () => []),
      createCategory: vi.fn(),
      updateCategory: vi.fn(),
      deleteCategory: vi.fn(),
    },
    merchants: {
      getUserMerchants: vi.fn(async () => []),
      getMerchantUsage: vi.fn(async () => []),
      createMerchant: vi.fn(),
      updateMerchant: vi.fn(),
      deleteMerchant: vi.fn(),
      mergeMerchants: vi.fn(),
      applyMerchant: vi.fn(),
      applyAllMerchants: vi.fn(),
    },
    dashboard: {
      getCanvasOverview: vi.fn(),
      getCategoryData: vi.fn(async () => []),
      getMerchantStats: vi.fn(async () => []),
      getPeriodComparison: vi.fn(async () => ({ hasPrevious: false })),
    },
  } as unknown as TallyoClient;
}

const open: Array<() => Promise<void>> = [];

async function connectTestPair() {
  const stub = createStubClient();
  const server = buildTallyoMcpServer(stub, "user-1");
  const [clientTransport, serverTransport] =
    InMemoryTransport.createLinkedPair();

  const client = new Client({ name: "tallyo-test", version: "1.0.0" });
  await server.connect(serverTransport);
  await client.connect(clientTransport);

  open.push(async () => {
    await client.close();
    await server.close();
  });

  return { client, stub };
}

afterEach(async () => {
  await Promise.all(open.splice(0).map((close) => close()));
});

describe("tallyo MCP server", () => {
  it("exposes the documented tool surface", async () => {
    const { client } = await connectTestPair();
    const { tools } = await client.listTools();

    const names = tools.map((tool) => tool.name);
    for (const expected of EXPECTED_TOOLS) {
      expect(names).toContain(expected);
    }
  });

  it("marks read tools as read-only", async () => {
    const { client } = await connectTestPair();
    const { tools } = await client.listTools();

    const listing = tools.find((tool) => tool.name === "list_transactions");
    expect(listing?.annotations?.readOnlyHint).toBe(true);

    const deletion = tools.find((tool) => tool.name === "delete_transaction");
    expect(deletion?.annotations?.destructiveHint).toBe(true);
  });

  it("applies schema defaults before calling the router client", async () => {
    const { client, stub } = await connectTestPair();

    await client.callTool({
      name: "list_transactions",
      arguments: { pageSize: 5 },
    });

    const getView = stub.transactions.getView as ReturnType<typeof vi.fn>;
    expect(getView).toHaveBeenCalledWith(
      expect.objectContaining({ pageSize: 5, scope: "ledger", side: "all" }),
    );
  });

  it("returns tool failures as MCP error results", async () => {
    const { client, stub } = await connectTestPair();
    (
      stub.categories.getUserCategories as ReturnType<typeof vi.fn>
    ).mockRejectedValueOnce(new Error("database is down"));

    const result = await client.callTool({
      name: "list_categories",
      arguments: {},
    });

    expect(result.isError).toBe(true);
    expect(result.content).toEqual([
      { type: "text", text: "Error: database is down" },
    ]);
  });
});

describe("MCP endpoint authentication", () => {
  const app = new Hono();
  app.all("/mcp", mcpHandler);

  it("rejects requests without a bearer token", async () => {
    const response = await app.request("/mcp", { method: "POST" });

    expect(response.status).toBe(401);
    expect(response.headers.get("WWW-Authenticate")).toContain("Bearer");
  });

  it("rejects requests with a malformed Authorization header", async () => {
    const response = await app.request("/mcp", {
      method: "POST",
      headers: { Authorization: "Basic dXNlcjpwYXNz" },
    });

    expect(response.status).toBe(401);
  });
});
