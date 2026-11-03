import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { createTallyoClient, type TallyoClient } from "./client";
import { registerInsightTools } from "./tools/insights";
import { registerTaxonomyTools } from "./tools/taxonomy";
import { registerTransactionTools } from "./tools/transactions";

const SERVER_NAME = "tallyo";
const SERVER_VERSION = "1.0.0";

const INSTRUCTIONS = `Tallyo is a personal-finance ledger: transactions, merchants,
categories, and dashboard/report aggregates.

Conventions:
- All amounts are integer cents. Negative is an expense, positive is income.
- Dates are YYYY-MM-DD.
- "category" and "merchant" are ids (see list_categories and list_merchants),
  not names.
- "insights" scope counts only reviewed, transfer-free transactions whose
  category is not hidden; "ledger" scope is everything.

Typical workflow:
1. Resolve names to ids with list_categories / list_merchants.
2. Read with list_transactions, get_transactions_summary,
   get_spending_breakdown, get_period_comparison, or get_dashboard_overview.
3. Write with update_transaction (merchant, category, notes, reviewed),
   apply_suggestion, split_transaction, or the taxonomy tools.
   Marking a transaction reviewed requires both a merchant and a category.
4. AI suggestions are advisory metadata and are never applied automatically;
   apply_suggestion is the explicit acceptance step.

Deletes are permanent. Prefer merge_merchants over deleting duplicate
merchants that still have transactions.`;

/**
 * Build an MCP server bound to one user.
 *
 * The server is created per HTTP request (stateless transport), so tool
 * closures can safely capture the authenticated user id. `buildTallyoMcpServer`
 * takes the router client explicitly so tests can substitute a stub.
 */
export function buildTallyoMcpServer(client: TallyoClient, userId: string) {
  const server = new McpServer(
    { name: SERVER_NAME, version: SERVER_VERSION },
    { instructions: INSTRUCTIONS },
  );

  registerTransactionTools(server, client, userId);
  registerInsightTools(server, client);
  registerTaxonomyTools(server, client);

  return server;
}

export async function createTallyoMcpServer(userId: string) {
  return buildTallyoMcpServer(await createTallyoClient(userId), userId);
}
