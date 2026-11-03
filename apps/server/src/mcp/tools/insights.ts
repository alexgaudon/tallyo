import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { transactionViewFilterSchema } from "@/lib/transaction-view";
import type { TallyoClient } from "../client";
import { runTool } from "../result";

const isoDate = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/, "Date must be in YYYY-MM-DD format");

const readOnly = {
  readOnlyHint: true,
  destructiveHint: false,
  idempotentHint: true,
  openWorldHint: false,
} as const;

export function registerInsightTools(server: McpServer, client: TallyoClient) {
  server.registerTool(
    "get_dashboard_overview",
    {
      title: "Get dashboard overview",
      description: `The whole dashboard for one period, in a single call:
totals and averages, category and income-category breakdowns, top merchants,
largest expense transactions, the income-flow Sankey graph, and the comparison
against the previous period of equal length.

By default it answers "how is my month going" over the insights scope (reviewed,
transfer-free transactions only). Pass the same filter object as
list_transactions to narrow it, e.g. { "range": { "from": "2026-10-01",
"to": "2026-10-31" } }.

Prefer the focused tools (get_spending_breakdown, get_period_comparison,
get_transactions_summary) when you only need one number: this payload is large.

Amounts are integer cents.`,
      inputSchema: transactionViewFilterSchema.shape,
      annotations: readOnly,
    },
    (input) =>
      runTool("get_dashboard_overview", () =>
        client.dashboard.getCanvasOverview(
          transactionViewFilterSchema.parse(input),
        ),
      ),
  );

  server.registerTool(
    "get_spending_breakdown",
    {
      title: "Get spending breakdown",
      description: `Spending or income grouped by category or by merchant for a
date range — the answer to "where did my money go".

- dimension "category" supports both sides, so use side "income" for where
  money came from.
- dimension "merchant" is expense-only and returns the top 5 merchants.

Both use the insights scope: transfers, hidden categories and rows excluded from
insights are left out. Amounts are positive integer cents.`,
      inputSchema: {
        dimension: z
          .enum(["category", "merchant"])
          .default("category")
          .describe("Group by category or by merchant."),
        side: z
          .enum(["expense", "income"])
          .default("expense")
          .describe("Only used for dimension=category."),
        from: isoDate.optional(),
        to: isoDate.optional(),
      },
      annotations: readOnly,
    },
    (input) =>
      runTool("get_spending_breakdown", async () => {
        const range = { from: input.from, to: input.to };

        if (input.dimension === "merchant") {
          if (input.side === "income") {
            throw new Error(
              "Merchant breakdown supports expenses only; use dimension=category for income",
            );
          }
          return {
            dimension: "merchant",
            rows: await client.dashboard.getMerchantStats(range),
          };
        }

        return {
          dimension: "category",
          side: input.side,
          rows: await client.dashboard.getCategoryData({
            ...range,
            income: input.side === "income",
          }),
        };
      }),
  );

  server.registerTool(
    "get_period_comparison",
    {
      title: "Compare with previous period",
      description: `Compare a date range against the immediately preceding range
of the same length.

Requires both "from" and "to" (YYYY-MM-DD). Returns whether a previous period
exists, its totals (income, expenses, transaction count), and per-category and
per-merchant deltas so you can explain what changed.

Amounts are integer cents.`,
      inputSchema: {
        from: isoDate,
        to: isoDate,
      },
      annotations: readOnly,
    },
    ({ from, to }) =>
      runTool("get_period_comparison", () =>
        client.dashboard.getPeriodComparison({ from, to }),
      ),
  );
}
