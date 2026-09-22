import { sql } from "drizzle-orm";
import { describe, expect, it } from "vitest";
import { db } from "@/db";
import { transaction } from "@/db/schema";
import {
  buildTransactionOrderBy,
  buildTransactionWhere,
  transactionViewSchema,
} from "@/lib/transaction-view";

/**
 * These tests exercise the SQL against a real Postgres. They are read-only and
 * only run when DATABASE_URL is set (the DB schema may not exist otherwise).
 */
const hasDatabase = Boolean(process.env.DATABASE_URL);

const filters: Array<{ name: string; filter: Record<string, unknown> }> = [
  { name: "ledger/expense", filter: { scope: "ledger", side: "expense" } },
  { name: "ledger/income", filter: { scope: "ledger", side: "income" } },
  {
    name: "insights/reviewed",
    filter: { scope: "insights", reviewState: "reviewed" },
  },
  {
    name: "insights/amount-sorted",
    filter: { scope: "insights", sort: "amount" },
  },
  { name: "text search", filter: { text: "a" } },
];

describe.skipIf(!hasDatabase)("transaction-view integration", () => {
  it("has a user row to test against", async (context) => {
    const user = await db.query.user.findFirst();
    if (!user) {
      context.skip();
      return;
    }
    expect(typeof user.id).toBe("string");
  });

  for (const { name, filter } of filters) {
    it(`runs the relational query and the count query for ${name}`, async (context) => {
      const user = await db.query.user.findFirst();
      if (!user) {
        context.skip();
        return;
      }

      const parsed = transactionViewSchema.parse(filter);
      const where = buildTransactionWhere(user.id, parsed);

      const rows = await db.query.transaction.findMany({
        where,
        orderBy: buildTransactionOrderBy(parsed.sort),
        with: {
          merchant: true,
          category: { with: { parentCategory: true } },
        },
        limit: 2,
      });

      expect(Array.isArray(rows)).toBe(true);
      expect(rows.length).toBeLessThanOrEqual(2);
      for (const row of rows) {
        expect(typeof row.id).toBe("string");
        expect(typeof row.amount).toBe("number");
        expect(typeof row.date).toBe("string");
      }

      const countRows = await db
        .select({ count: sql<number>`count(*)` })
        .from(transaction)
        .where(where);

      expect(countRows).toHaveLength(1);
      expect(Number.isFinite(Number(countRows[0].count))).toBe(true);
      expect(Number(countRows[0].count)).toBeGreaterThanOrEqual(0);
    });
  }
});
