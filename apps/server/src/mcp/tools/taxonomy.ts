import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import type { TallyoClient } from "../client";
import { runTool } from "../result";

const readOnly = {
  readOnlyHint: true,
  destructiveHint: false,
  idempotentHint: true,
  openWorldHint: false,
} as const;

const write = {
  readOnlyHint: false,
  destructiveHint: false,
  idempotentHint: false,
  openWorldHint: false,
} as const;

const destructive = {
  readOnlyHint: false,
  destructiveHint: true,
  idempotentHint: true,
  openWorldHint: false,
} as const;

export function registerTaxonomyTools(server: McpServer, client: TallyoClient) {
  server.registerTool(
    "list_categories",
    {
      title: "List categories",
      description: `List every category with its optional parent category.

Categories can be hierarchical (parentCategory / parentCategoryId). A category
with treatAsIncome puts its transactions on the income side; hideFromInsights
takes it out of dashboard aggregates. Use the returned ids in the "categories"
filter of list_transactions and get_transactions_summary.`,
      inputSchema: {},
      annotations: readOnly,
    },
    () =>
      runTool("list_categories", () => client.categories.getUserCategories()),
  );

  server.registerTool(
    "list_merchants",
    {
      title: "List merchants",
      description: `List every merchant with its keyword rules and recommended
category.

Merchant keywords are the matching rules used during imports and the
apply_merchant tools: when a transaction description contains a keyword, the
merchant is applied automatically. Use the returned ids in the "merchants"
filter of list_transactions and get_transactions_summary.`,
      inputSchema: {},
      annotations: readOnly,
    },
    () => runTool("list_merchants", () => client.merchants.getUserMerchants()),
  );

  server.registerTool(
    "get_taxonomy_usage",
    {
      title: "Get taxonomy usage",
      description: `Usage counts per category or per merchant: transaction count,
total absolute amount, and the most recent transaction date. Useful for finding
dead categories/merchants before deleting or merging.

Amounts are positive integer cents.`,
      inputSchema: {
        dimension: z.enum(["category", "merchant"]).default("category"),
      },
      annotations: readOnly,
    },
    ({ dimension }) =>
      runTool("get_taxonomy_usage", async () => ({
        dimension,
        rows:
          dimension === "category"
            ? await client.categories.getCategoryUsage()
            : await client.merchants.getMerchantUsage(),
      })),
  );

  server.registerTool(
    "create_category",
    {
      title: "Create category",
      description: `Create a category. Names must be unique per user.

Set parentCategoryId for a subcategory. treatAsIncome marks the whole category
as income; hideFromInsights excludes it from dashboard aggregates.`,
      inputSchema: {
        name: z.string().min(1),
        parentCategoryId: z.string().nullable().optional(),
        icon: z
          .string()
          .optional()
          .describe("Optional emoji or icon name used by the UI."),
        treatAsIncome: z.boolean().optional(),
        hideFromInsights: z.boolean().optional(),
      },
      annotations: write,
    },
    (input) =>
      runTool("create_category", () => client.categories.createCategory(input)),
  );

  server.registerTool(
    "update_category",
    {
      title: "Update category",
      description: `Update a category's name, parent, icon, or its income and
insights flags. Only the fields you pass change.

A category cannot be its own parent.`,
      inputSchema: {
        id: z.string(),
        name: z.string().optional(),
        parentCategoryId: z.string().nullable().optional(),
        icon: z.string().optional(),
        treatAsIncome: z.boolean().optional(),
        hideFromInsights: z.boolean().optional(),
      },
      annotations: {
        readOnlyHint: false,
        destructiveHint: false,
        idempotentHint: true,
        openWorldHint: false,
      },
    },
    (input) =>
      runTool("update_category", () => client.categories.updateCategory(input)),
  );

  server.registerTool(
    "delete_category",
    {
      title: "Delete category",
      description: `Permanently delete a category. Transactions that used it keep
their other relations but lose this category. Subcategories are deleted with
their parent (cascade).

Cannot be undone.`,
      inputSchema: {
        id: z.string(),
      },
      annotations: destructive,
    },
    ({ id }) =>
      runTool("delete_category", () =>
        client.categories.deleteCategory({ id }),
      ),
  );

  server.registerTool(
    "create_merchant",
    {
      title: "Create merchant",
      description: `Create a merchant with an optional recommended category and
keyword rules.

The recommended category is applied automatically whenever this merchant is
assigned to a transaction. Keywords are matched case-insensitively against
transaction descriptions.`,
      inputSchema: {
        name: z.string().min(1),
        recommendedCategoryId: z.string().optional(),
        keywords: z.array(z.string()).optional(),
      },
      annotations: write,
    },
    (input) =>
      runTool("create_merchant", () => client.merchants.createMerchant(input)),
  );

  server.registerTool(
    "update_merchant",
    {
      title: "Update merchant",
      description: `Update a merchant's name, recommended category, and/or
keywords. Passing "keywords" replaces the whole keyword list; omit it to keep
the current rules.

When keywords are provided, matching unreviewed transactions are also updated
with this merchant (and its recommended category).`,
      inputSchema: {
        id: z.string(),
        name: z.string().optional(),
        recommendedCategoryId: z.string().optional(),
        keywords: z.array(z.string()).optional(),
      },
      annotations: write,
    },
    (input) =>
      runTool("update_merchant", () => client.merchants.updateMerchant(input)),
  );

  server.registerTool(
    "delete_merchant",
    {
      title: "Delete merchant",
      description: `Permanently delete a merchant and its keyword rules.
Transactions that referenced it keep their other relations but lose the
merchant.

Cannot be undone; consider merge_merchants instead when consolidating.`,
      inputSchema: {
        id: z.string(),
      },
      annotations: destructive,
    },
    ({ id }) =>
      runTool("delete_merchant", () => client.merchants.deleteMerchant({ id })),
  );

  server.registerTool(
    "merge_merchants",
    {
      title: "Merge merchants",
      description: `Move every transaction and keyword rule from a source merchant
into a target merchant, then delete the source. Use this to clean up duplicates
(e.g. "WHOLE FOODS" and "WHOLEFDS").

Cannot merge a merchant into itself.`,
      inputSchema: {
        sourceMerchantId: z.string().describe("Merchant to absorb and delete."),
        targetMerchantId: z.string().describe("Merchant that survives."),
      },
      annotations: {
        readOnlyHint: false,
        destructiveHint: true,
        idempotentHint: false,
        openWorldHint: false,
      },
    },
    (input) =>
      runTool("merge_merchants", () => client.merchants.mergeMerchants(input)),
  );

  server.registerTool(
    "apply_merchant",
    {
      title: "Apply merchant rules",
      description: `Re-run one merchant's keyword rules: every unreviewed
transaction whose description matches the merchant name or one of its keywords
gets that merchant (and its recommended category if set).

Reviewed transactions are never touched. Returns how many rows changed.`,
      inputSchema: {
        id: z.string().describe("Merchant id."),
      },
      annotations: write,
    },
    ({ id }) =>
      runTool("apply_merchant", () => client.merchants.applyMerchant({ id })),
  );

  server.registerTool(
    "apply_all_merchants",
    {
      title: "Apply all merchant rules",
      description: `Re-run keyword matching for every merchant at once, most
specific rules first. Only unreviewed transactions change.

Bulk cleanup after importing new merchants. Returns per-merchant counts.`,
      inputSchema: {},
      annotations: write,
    },
    () =>
      runTool("apply_all_merchants", () =>
        client.merchants.applyAllMerchants({}),
      ),
  );
}
