import {
  and,
  desc,
  eq,
  gte,
  ilike,
  inArray,
  isNull,
  lte,
  or,
  type SQL,
  sql,
} from "drizzle-orm";
import { z } from "zod";
import { category, transaction } from "@/db/schema";

/**
 * Transactions dated further in the future than this are filtered out as likely
 * data-entry errors. The external import API allows up to this window.
 */
export const MAX_FUTURE_TRANSACTION_DAYS = 30;

/**
 * `ledger`     — the full record: everything, reviewed or not, income, expense
 *                or transfer, including hidden and uncategorized rows.
 * `insights`   — only rows eligible for aggregation: excludes transactions
 *                flagged `excludedFromInsights`, transfers, and categories
 *                flagged `hideFromInsights`. Callers usually also pass
 *                `reviewState: "reviewed"`.
 */
export const transactionScopeSchema = z.enum(["ledger", "insights"]);

export const transactionReviewStateSchema = z.enum([
  "all",
  "reviewed",
  "unreviewed",
]);

/** Which side of the ledger to return. Derived from `flow`, else the category. */
export const transactionSideSchema = z.enum(["all", "income", "expense"]);

export const transactionSortSchema = z.enum(["date", "amount"]);

const isoDate = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/, "Date must be in YYYY-MM-DD format");

/**
 * The filter half of a transaction view. This is the single contract every
 * surface (ledger, canvas panels, reports) speaks; `buildTransactionWhere`
 * turns it into SQL.
 */
export const transactionViewFilterSchema = z.object({
  scope: transactionScopeSchema.default("ledger"),
  range: z
    .object({ from: isoDate.optional(), to: isoDate.optional() })
    .optional(),
  categories: z.array(z.string()).optional(),
  merchants: z.array(z.string()).optional(),
  text: z.string().optional(),
  reviewState: transactionReviewStateSchema.default("all"),
  withoutMerchant: z.boolean().optional(),
  side: transactionSideSchema.default("all"),
  amount: z
    .object({
      min: z.number().int().optional(),
      max: z.number().int().optional(),
    })
    .optional(),
});

export type TransactionViewFilter = z.infer<typeof transactionViewFilterSchema>;

/** A filter plus pagination and ordering. */
export const transactionViewSchema = transactionViewFilterSchema.extend({
  sort: transactionSortSchema.default("date"),
  page: z.number().min(1).default(1),
  pageSize: z.number().min(1).max(100).default(50),
});

export type TransactionView = z.infer<typeof transactionViewSchema>;

/**
 * Effective income/expense side of a row: explicit `flow` wins, otherwise the
 * category's `treatAsIncome`, otherwise expense (uncategorized is treated as
 * an expense, matching the historical report behaviour).
 */
const effectiveSideSql = sql`COALESCE(
  ${transaction.flow},
  (
    SELECT CASE WHEN ${category.treatAsIncome} THEN 'income' ELSE 'expense' END
    FROM ${category}
    WHERE ${category.id} = ${transaction.categoryId}
  ),
  'expense'
)`;

const notHiddenFromInsightsSql = sql`NOT EXISTS (
  SELECT 1 FROM ${category}
  WHERE ${category.id} = ${transaction.categoryId}
    AND ${category.hideFromInsights} = true
)`;

/**
 * Builds the WHERE clause for a transaction view. Uses scalar subqueries for
 * category-derived rules so callers can use either `db.select()` (with joins)
 * or the relational query builder without an implicit join requirement.
 */
export function buildTransactionWhere(
  userId: string,
  filter: TransactionViewFilter,
): SQL {
  const conditions: SQL[] = [eq(transaction.userId, userId)];

  const maxDate = new Date();
  maxDate.setDate(maxDate.getDate() + MAX_FUTURE_TRANSACTION_DAYS);
  conditions.push(lte(transaction.date, maxDate.toISOString().split("T")[0]));

  if (filter.range?.from) {
    conditions.push(gte(transaction.date, filter.range.from));
  }
  if (filter.range?.to) {
    conditions.push(lte(transaction.date, filter.range.to));
  }

  if (filter.categories && filter.categories.length > 0) {
    conditions.push(inArray(transaction.categoryId, filter.categories));
  }

  if (filter.merchants && filter.merchants.length > 0) {
    conditions.push(inArray(transaction.merchantId, filter.merchants));
  }

  if (filter.reviewState === "reviewed") {
    conditions.push(eq(transaction.reviewed, true));
  }
  if (filter.reviewState === "unreviewed") {
    conditions.push(eq(transaction.reviewed, false));
  }

  if (filter.withoutMerchant) {
    conditions.push(
      or(isNull(transaction.merchantId), eq(transaction.merchantId, "")) as SQL,
    );
  }

  if (filter.text) {
    conditions.push(
      or(
        ilike(transaction.transactionDetails, `%${filter.text}%`),
        ilike(transaction.notes, `%${filter.text}%`),
        ilike(transaction.id, `%${filter.text}%`),
      ) as SQL,
    );
  }

  if (filter.amount?.min !== undefined) {
    conditions.push(gte(transaction.amount, filter.amount.min));
  }
  if (filter.amount?.max !== undefined) {
    conditions.push(lte(transaction.amount, filter.amount.max));
  }

  if (filter.side !== "all") {
    conditions.push(sql`${effectiveSideSql} = ${filter.side}`);
  }

  if (filter.scope === "insights") {
    conditions.push(eq(transaction.excludedFromInsights, false));
    conditions.push(
      sql`(${transaction.flow} IS NULL OR ${transaction.flow} <> 'transfer')`,
    );
    conditions.push(notHiddenFromInsightsSql);
  }

  return and(...conditions) as SQL;
}

/** Ordering for a transaction view. Amount sorting puts largest outflow first. */
export function buildTransactionOrderBy(sort: TransactionView["sort"]): SQL[] {
  return sort === "amount"
    ? [sql`${transaction.amount} ASC`, desc(transaction.date)]
    : [desc(transaction.date), desc(transaction.amount)];
}
