import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { importTransactions } from "@/lib/transaction-import";
import { applyTransactionUpdate } from "@/lib/transaction-update";
import {
  transactionViewFilterSchema,
  transactionViewSchema,
} from "@/lib/transaction-view";
import { validateTransactionOwnership } from "@/routers/transactions";
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

export function registerTransactionTools(
  server: McpServer,
  client: TallyoClient,
  userId: string,
) {
  server.registerTool(
    "list_transactions",
    {
      title: "List transactions",
      description: `List the user's transactions with the app's full ledger filter.

Every filter is optional. Common patterns:
- recent spending: { "range": { "from": "2026-10-01", "to": "2026-10-31" }, "side": "expense" }
- review queue: { "reviewState": "unreviewed", "scope": "ledger" }
- one category: call list_categories first, then pass ids in "categories".

"scope" is "ledger" (everything, the default) or "insights" (only rows that count
toward aggregates: excludes transfers, hidden categories and rows excluded from
insights). "side" is "all", "income" or "expense". "text" is a case-insensitive
substring match on transaction details, notes and transaction id.

Amounts are integer cents: negative is an expense, positive is income.
Returns { transactions, pagination }. pageSize is capped at 100.`,
      inputSchema: transactionViewSchema.shape,
      annotations: readOnly,
    },
    (input) =>
      runTool("list_transactions", () =>
        client.transactions.getView(transactionViewSchema.parse(input)),
      ),
  );

  server.registerTool(
    "get_transactions_summary",
    {
      title: "Summarize transactions",
      description: `Aggregate a filtered set of transactions: total count, total
amount in cents, average amount, and (when exactly one category or one merchant
is selected) a monthly average. Takes the same filter object as
list_transactions, without paging or sorting.

Use this for "how much did I spend on X" questions instead of summing
list_transactions results yourself.`,
      inputSchema: transactionViewFilterSchema.shape,
      annotations: readOnly,
    },
    (input) =>
      runTool("get_transactions_summary", () =>
        client.transactions.getViewSummary(
          transactionViewFilterSchema.parse(input),
        ),
      ),
  );

  server.registerTool(
    "create_transactions",
    {
      title: "Create transactions",
      description: `Import 1-100 transactions at once.

"amount" is integer cents (negative expense, positive income) and "date" is
YYYY-MM-DD. "externalId" is a stable id from the source system: re-importing the
same externalId is a no-op, so imports are safe to retry.

Unless "doNotAutoMatch" is true, the server matches the description against the
user's merchant keywords and applies the matched merchant and its recommended
category. Uncategorized rows are queued for an advisory AI suggestion; that
happens asynchronously.

Returns { count } of actually inserted rows (duplicates excluded).`,
      inputSchema: {
        transactions: z
          .array(
            z.object({
              amount: z
                .number()
                .int()
                .describe(
                  "Integer cents. Negative = expense, positive = income.",
                ),
              date: isoDate,
              transactionDetails: z
                .string()
                .min(1)
                .describe("Raw description as it appears on the statement."),
              externalId: z
                .string()
                .min(1)
                .describe(
                  "Stable id from the source system. Duplicates are skipped.",
                ),
              merchantId: z.string().optional(),
              categoryId: z.string().optional(),
              notes: z.string().optional(),
              doNotAutoMatch: z
                .boolean()
                .optional()
                .describe(
                  "Skip merchant keyword matching and keep the submitted ids.",
                ),
            }),
          )
          .min(1)
          .max(100),
      },
      annotations: { ...readOnly, readOnlyHint: false },
    },
    (input) =>
      runTool("create_transactions", async () => {
        const { count } = await importTransactions(userId, input.transactions);
        return { count };
      }),
  );

  server.registerTool(
    "update_transaction",
    {
      title: "Update transaction",
      description: `Update a transaction's merchant, category, notes and/or
reviewed flag. Only the fields you pass change.

Behaviour worth knowing:
- Assigning "merchantId" without "categoryId" also applies that merchant's
  recommended category (and learns the description as a merchant keyword).
  Passing merchantId: null clears the merchant.
- Marking "reviewed": true requires both a merchant and a category to be set,
  either already on the row or in the same call. Pass reviewed: false to
  unreview the row.

Returns the updated { transaction }.`,
      inputSchema: {
        id: z.string().describe("Transaction id."),
        merchantId: z.string().nullable().optional(),
        categoryId: z.string().nullable().optional(),
        notes: z.string().nullable().optional(),
        reviewed: z.boolean().optional(),
      },
      annotations: {
        readOnlyHint: false,
        destructiveHint: false,
        idempotentHint: true,
        openWorldHint: false,
      },
    },
    (input) =>
      runTool("update_transaction", async () => {
        const { id, ...patch } = input;
        const transaction = await applyTransactionUpdate(userId, id, patch);
        return { transaction };
      }),
  );

  server.registerTool(
    "apply_suggestion",
    {
      title: "Apply AI suggestion",
      description: `Apply the advisory AI suggestion stored on a transaction
(category and/or merchant) in one call. Suggestions are never applied
automatically, so this is the explicit acceptance step.

Returns an error when the transaction has no suggestion, or the updated
{ transaction } otherwise.`,
      inputSchema: {
        id: z.string().describe("Transaction id."),
      },
      annotations: {
        readOnlyHint: false,
        destructiveHint: false,
        idempotentHint: true,
        openWorldHint: false,
      },
    },
    ({ id }) =>
      runTool("apply_suggestion", async () => {
        const current = await validateTransactionOwnership(id, userId);

        if (!current.suggestedMerchantId && !current.suggestedCategoryId) {
          throw new Error("This transaction has no AI suggestion to apply");
        }

        const transaction = await applyTransactionUpdate(userId, id, {
          merchantId: current.suggestedMerchantId ?? undefined,
          categoryId: current.suggestedCategoryId ?? undefined,
        });

        return { transaction };
      }),
  );

  server.registerTool(
    "split_transaction",
    {
      title: "Split transaction",
      description: `Split one transaction into two or more categorized parts.

The split amounts (integer cents) must sum exactly to the original amount. The
original row is replaced by the splits, each carrying the original merchant and
date. A transaction that is already a split cannot be split again.

Returns the created split transactions.`,
      inputSchema: {
        id: z.string().describe("Transaction id to split."),
        splits: z
          .array(
            z.object({
              amount: z.number().int().describe("Integer cents."),
              categoryId: z.string().nullable(),
            }),
          )
          .min(2),
      },
      annotations: {
        readOnlyHint: false,
        destructiveHint: true,
        idempotentHint: false,
        openWorldHint: false,
      },
    },
    (input) =>
      runTool("split_transaction", () =>
        client.transactions.splitTransaction(input),
      ),
  );

  server.registerTool(
    "delete_transaction",
    {
      title: "Delete transaction",
      description:
        "Permanently delete one transaction by id. This cannot be undone.",
      inputSchema: {
        id: z.string().describe("Transaction id."),
      },
      annotations: {
        readOnlyHint: false,
        destructiveHint: true,
        idempotentHint: true,
        openWorldHint: false,
      },
    },
    ({ id }) =>
      runTool("delete_transaction", () =>
        client.transactions.deleteTransaction({ id }),
      ),
  );
}
