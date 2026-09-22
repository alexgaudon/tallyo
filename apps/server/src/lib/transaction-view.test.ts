import { PgDialect } from "drizzle-orm/pg-core";
import { describe, expect, it } from "vitest";
import {
  buildTransactionOrderBy,
  buildTransactionWhere,
  effectiveSideExpression,
  MAX_FUTURE_TRANSACTION_DAYS,
  transactionViewFilterSchema,
  transactionViewSchema,
} from "@/lib/transaction-view";

const dialect = new PgDialect();
const USER_ID = "user_test";

function toQuery(input: Record<string, unknown>) {
  const filter = transactionViewFilterSchema.parse(input);
  return dialect.sqlToQuery(buildTransactionWhere(USER_ID, filter));
}

const whereSql = (input: Record<string, unknown>) => toQuery(input).sql;
const whereParams = (input: Record<string, unknown>) => toQuery(input).params;

/** Mirrors the guard inside buildTransactionWhere. */
function expectedMaxDate(): string {
  const maxDate = new Date();
  maxDate.setDate(maxDate.getDate() + MAX_FUTURE_TRANSACTION_DAYS);
  return maxDate.toISOString().split("T")[0];
}

describe("buildTransactionWhere", () => {
  it("always scopes by userId and guards against far-future dates", () => {
    expect(MAX_FUTURE_TRANSACTION_DAYS).toBe(30);

    const { sql, params } = toQuery({});
    expect(sql).toContain('"transactions"."user_id" = $1');
    expect(params[0]).toBe(USER_ID);
    expect(sql).toContain('"transactions"."date" <= $2');
    expect(params[1]).toBe(expectedMaxDate());
  });

  describe("scope", () => {
    it("ledger adds no insight-eligibility predicates", () => {
      const sql = whereSql({ scope: "ledger" });
      expect(sql).not.toContain("excluded_from_insights");
      expect(sql).not.toContain("<> 'transfer'");
      expect(sql).not.toContain("NOT EXISTS");
      expect(sql).not.toContain("hide_from_insights");
    });

    it("insights excludes flagged rows, transfers, and hidden categories", () => {
      const { sql, params } = toQuery({ scope: "insights" });
      expect(sql).toContain('"transactions"."excluded_from_insights" = $3');
      expect(params[2]).toBe(false);
      expect(sql).toContain(
        `"transactions"."flow" IS NULL OR "transactions"."flow" <> 'transfer'`,
      );
      expect(sql).toContain("NOT EXISTS");
      expect(sql).toContain('"c"."hide_from_insights" = true');
    });
  });

  describe("side", () => {
    it("income compares the effective side expression to 'income'", () => {
      const { sql, params } = toQuery({ side: "income" });
      expect(sql).toContain("COALESCE(");
      expect(sql).toContain(") = $3");
      expect(params[2]).toBe("income");
    });

    it("expense compares the effective side expression to 'expense'", () => {
      const { params } = toQuery({ side: "expense" });
      expect(params[2]).toBe("expense");
    });

    it("all adds no side predicate at all", () => {
      const { sql, params } = toQuery({ side: "all" });
      expect(sql).not.toContain("COALESCE");
      expect(params).toEqual([USER_ID, expectedMaxDate()]);
    });
  });

  describe("reviewState", () => {
    it("reviewed filters reviewed = true", () => {
      const { sql, params } = toQuery({ reviewState: "reviewed" });
      expect(sql).toContain('"transactions"."reviewed" = $3');
      expect(params[2]).toBe(true);
    });

    it("unreviewed filters reviewed = false", () => {
      const { params } = toQuery({ reviewState: "unreviewed" });
      expect(params[2]).toBe(false);
    });

    it("all adds no reviewed predicate", () => {
      const sql = whereSql({ reviewState: "all" });
      expect(sql).not.toContain('"transactions"."reviewed"');
    });
  });

  describe("individual predicates", () => {
    it("withoutMerchant matches null or empty merchant ids", () => {
      const { sql, params } = toQuery({ withoutMerchant: true });
      expect(sql).toContain('"transactions"."merchant_id" is null');
      expect(sql).toContain('"transactions"."merchant_id" = $3');
      expect(params[2]).toBe("");
    });

    it("text searches details, notes and id with ILIKE wildcards", () => {
      const { sql, params } = toQuery({ text: "coffee" });
      expect(sql).toContain('"transactions"."transaction_details" ilike $3');
      expect(sql).toContain('"transactions"."notes" ilike $4');
      expect(sql).toContain('"transactions"."id" ilike $5');
      expect(params.slice(2)).toEqual(["%coffee%", "%coffee%", "%coffee%"]);
    });

    it("categories renders an IN clause with each id as a parameter", () => {
      const { sql, params } = toQuery({ categories: ["cat-a", "cat-b"] });
      expect(sql).toContain('"transactions"."category_id" in ($3, $4)');
      expect(params.slice(2)).toEqual(["cat-a", "cat-b"]);
    });

    it("an empty categories array adds no predicate", () => {
      const { sql, params } = toQuery({ categories: [] });
      expect(sql).not.toContain('"transactions"."category_id" in');
      expect(params).toHaveLength(2);
    });

    it("merchants renders an IN clause with each id as a parameter", () => {
      const { sql, params } = toQuery({ merchants: ["merchant-1"] });
      expect(sql).toContain('"transactions"."merchant_id" in ($3)');
      expect(params.slice(2)).toEqual(["merchant-1"]);
    });

    it("amount carries the exact cents for min and max", () => {
      const { sql, params } = toQuery({ amount: { min: -500, max: 1000 } });
      expect(sql).toContain('"transactions"."amount" >= $3');
      expect(sql).toContain('"transactions"."amount" <= $4');
      expect(params.slice(2)).toEqual([-500, 1000]);
    });

    it("amount supports a min only or a max only", () => {
      expect(whereParams({ amount: { min: 42 } }).slice(2)).toEqual([42]);
      expect(whereSql({ amount: { min: 42 } })).not.toContain("<= $4");
      expect(whereParams({ amount: { max: 42 } }).slice(2)).toEqual([42]);
      expect(whereSql({ amount: { max: 42 } })).not.toContain(">= $3");
    });

    it("range bounds the date inclusively", () => {
      const { sql, params } = toQuery({
        range: { from: "2024-01-01", to: "2024-02-01" },
      });
      expect(sql).toContain('"transactions"."date" >= $3');
      expect(sql).toContain('"transactions"."date" <= $4');
      expect(params.slice(2)).toEqual(["2024-01-01", "2024-02-01"]);
    });
  });

  it("combines every predicate in a stable order", () => {
    const { sql, params } = toQuery({
      scope: "insights",
      side: "expense",
      reviewState: "reviewed",
      categories: ["c1"],
      merchants: ["m1"],
      text: "x",
      withoutMerchant: true,
      amount: { min: 1, max: 2 },
      range: { from: "2024-01-01", to: "2024-02-01" },
    });

    expect(sql).toContain('"transactions"."date" >= $3');
    expect(sql).toContain('"transactions"."category_id" in ($5)');
    expect(sql).toContain('"transactions"."merchant_id" in ($6)');
    expect(sql).toContain('"transactions"."reviewed" = $7');
    expect(sql).toContain('"transactions"."transaction_details" ilike $9');
    expect(sql).toContain('"transactions"."amount" >= $12');
    expect(sql).toContain('"transactions"."amount" <= $13');
    expect(sql).toContain(") = $14");
    expect(sql).toContain('"transactions"."excluded_from_insights" = $15');
    expect(sql).toContain("NOT EXISTS");

    expect(params[0]).toBe(USER_ID);
    expect(params.slice(2, 15)).toEqual([
      "2024-01-01",
      "2024-02-01",
      "c1",
      "m1",
      true,
      "",
      "%x%",
      "%x%",
      "%x%",
      1,
      2,
      "expense",
      false,
    ]);
  });

  it("never emits the transaction-aliased category column bug", () => {
    const { sql } = toQuery({ side: "expense", scope: "insights" });
    expect(sql).not.toContain('"transaction"."treat_as_income"');
    expect(sql).toContain('"c"."treat_as_income"');
  });
});

describe("buildTransactionOrderBy", () => {
  it("sorts by date descending, then amount descending", () => {
    const order = buildTransactionOrderBy("date");
    expect(order).toHaveLength(2);
    expect(dialect.sqlToQuery(order[0]).sql).toBe('"transactions"."date" desc');
    expect(dialect.sqlToQuery(order[1]).sql).toBe(
      '"transactions"."amount" desc',
    );
  });

  it("sorts by amount ascending, then date descending", () => {
    const order = buildTransactionOrderBy("amount");
    expect(order).toHaveLength(2);
    expect(dialect.sqlToQuery(order[0]).sql).toBe(
      '"transactions"."amount" ASC',
    );
    expect(dialect.sqlToQuery(order[1]).sql).toBe('"transactions"."date" desc');
  });
});

describe("effectiveSideExpression", () => {
  it("renders a COALESCE over flow and the category income flag", () => {
    const sql = dialect.sqlToQuery(effectiveSideExpression()).sql;
    expect(sql).toContain("COALESCE(");
    expect(sql).toContain('"transactions"."flow"');
    expect(sql).toContain('"c"."treat_as_income"');
    expect(sql).toContain("'income'");
    expect(sql).toContain("'expense'");
  });
});

describe("schemas", () => {
  it("applies the filter defaults", () => {
    const filter = transactionViewFilterSchema.parse({});
    expect(filter.scope).toBe("ledger");
    expect(filter.reviewState).toBe("all");
    expect(filter.side).toBe("all");
  });

  it("applies the view pagination and sort defaults", () => {
    const view = transactionViewSchema.parse({});
    expect(view.sort).toBe("date");
    expect(view.page).toBe(1);
    expect(view.pageSize).toBe(50);
  });

  it("rejects pageSize outside 1..100", () => {
    expect(() => transactionViewSchema.parse({ pageSize: 101 })).toThrow();
    expect(() => transactionViewSchema.parse({ pageSize: 0 })).toThrow();
  });

  it("rejects unknown enum values", () => {
    expect(() =>
      transactionViewFilterSchema.parse({ scope: "nope" }),
    ).toThrow();
    expect(() => transactionViewFilterSchema.parse({ side: "nope" })).toThrow();
    expect(() =>
      transactionViewFilterSchema.parse({ reviewState: "nope" }),
    ).toThrow();
    expect(() => transactionViewSchema.parse({ sort: "nope" })).toThrow();
  });

  it("rejects non-ISO dates and non-integer amounts", () => {
    expect(() =>
      transactionViewFilterSchema.parse({ range: { from: "01/02/2024" } }),
    ).toThrow();
    expect(() =>
      transactionViewFilterSchema.parse({ amount: { min: 1.5 } }),
    ).toThrow();
  });
});
