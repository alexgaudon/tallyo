import { describe, expect, it, vi } from "vitest";

vi.mock("@/utils/orpc", () => ({ orpc: {} }));

import {
  clearedViewSearch,
  DEFAULT_VIEW_SEARCH,
  hasActiveViewFilters,
  type ViewSearch,
  viewSearchSchema,
  viewToFilter,
  viewToInput,
} from "@/lib/transaction-view";

const makeSearch = (partial: Record<string, unknown> = {}): ViewSearch =>
  viewSearchSchema.parse(partial);

describe("viewSearchSchema", () => {
  it("applies defaults for an empty object", () => {
    const parsed = viewSearchSchema.parse({});

    expect(parsed.review).toBe("all");
    expect(parsed.side).toBe("all");
    expect(parsed.sort).toBe("date");
    expect(parsed.page).toBe(1);
    expect(parsed.pageSize).toBe(50);
  });

  it("exposes the same defaults via DEFAULT_VIEW_SEARCH", () => {
    expect(DEFAULT_VIEW_SEARCH).toEqual({
      review: "all",
      side: "all",
      sort: "date",
      page: 1,
      pageSize: 50,
    });
  });

  it("coerces numeric strings into numbers", () => {
    const parsed = viewSearchSchema.parse({
      page: "3",
      pageSize: "25",
      min: "10.5",
      max: "-4",
    });

    expect(parsed.page).toBe(3);
    expect(parsed.pageSize).toBe(25);
    expect(parsed.min).toBe(10.5);
    expect(parsed.max).toBe(-4);
  });

  it("rejects a pageSize above 100", () => {
    expect(viewSearchSchema.safeParse({ pageSize: 101 }).success).toBe(false);
    expect(viewSearchSchema.safeParse({ pageSize: 100 }).success).toBe(true);
  });

  it("rejects a page below 1 or non-integer", () => {
    expect(viewSearchSchema.safeParse({ page: 0 }).success).toBe(false);
    expect(viewSearchSchema.safeParse({ page: -1 }).success).toBe(false);
    expect(viewSearchSchema.safeParse({ page: 1.5 }).success).toBe(false);
  });

  it("rejects invalid enum values", () => {
    expect(viewSearchSchema.safeParse({ review: "bogus" }).success).toBe(false);
    expect(viewSearchSchema.safeParse({ side: "bogus" }).success).toBe(false);
    expect(viewSearchSchema.safeParse({ sort: "bogus" }).success).toBe(false);
  });
});

describe("viewToFilter", () => {
  it("defaults the scope to ledger", () => {
    expect(viewToFilter(makeSearch()).scope).toBe("ledger");
  });

  it("passes an explicit scope through", () => {
    expect(viewToFilter(makeSearch(), "insights").scope).toBe("insights");
  });

  it("produces no range unless both from and to are set", () => {
    expect(
      viewToFilter(makeSearch({ from: "2024-01-01" })).range,
    ).toBeUndefined();
    expect(
      viewToFilter(makeSearch({ to: "2024-12-31" })).range,
    ).toBeUndefined();
    expect(
      viewToFilter(makeSearch({ from: "2024-01-01", to: "2024-12-31" })).range,
    ).toEqual({ from: "2024-01-01", to: "2024-12-31" });
  });

  it("omits empty category and merchant arrays", () => {
    const filter = viewToFilter(makeSearch({ categories: [], merchants: [] }));

    expect(filter.categories).toBeUndefined();
    expect(filter.merchants).toBeUndefined();
  });

  it("passes non-empty category and merchant arrays through", () => {
    const filter = viewToFilter(
      makeSearch({ categories: ["cat_1"], merchants: ["mer_1", "mer_2"] }),
    );

    expect(filter.categories).toEqual(["cat_1"]);
    expect(filter.merchants).toEqual(["mer_1", "mer_2"]);
  });

  it("maps q to text and treats an empty q as undefined", () => {
    expect(viewToFilter(makeSearch({ q: "coffee" })).text).toBe("coffee");
    expect(viewToFilter(makeSearch({ q: "" })).text).toBeUndefined();
  });

  it("passes review and side through", () => {
    const filter = viewToFilter(
      makeSearch({ review: "unreviewed", side: "income" }),
    );

    expect(filter.reviewState).toBe("unreviewed");
    expect(filter.side).toBe("income");
  });

  it("passes noMerchant through as withoutMerchant", () => {
    expect(viewToFilter(makeSearch({ noMerchant: true })).withoutMerchant).toBe(
      true,
    );
    expect(
      viewToFilter(makeSearch({ noMerchant: false })).withoutMerchant,
    ).toBe(false);
  });

  it("omits amount when neither min nor max is set", () => {
    expect(viewToFilter(makeSearch()).amount).toBeUndefined();
  });

  it("converts min and max dollars to integer cents", () => {
    const filter = viewToFilter(makeSearch({ min: 12.34, max: 99.99 }));

    expect(filter.amount).toEqual({ min: 1234, max: 9999 });
  });

  it("rounds fractional dollar amounts to the nearest cent", () => {
    const filter = viewToFilter(makeSearch({ min: 12.345, max: 99.999 }));

    expect(filter.amount).toEqual({ min: 1235, max: 10000 });
  });

  it("keeps a defined min or max even when the other is absent", () => {
    expect(viewToFilter(makeSearch({ min: 5 })).amount).toEqual({
      min: 500,
      max: undefined,
    });
    expect(viewToFilter(makeSearch({ max: -5 })).amount).toEqual({
      min: undefined,
      max: -500,
    });
  });

  it("preserves a zero amount instead of dropping it", () => {
    expect(viewToFilter(makeSearch({ min: 0 })).amount).toEqual({
      min: 0,
      max: undefined,
    });
  });
});

describe("viewToInput", () => {
  it("includes the filter plus sort, page and pageSize", () => {
    const input = viewToInput(
      makeSearch({ q: "coffee", sort: "amount", page: 2, pageSize: 10 }),
    );

    expect(input).toEqual({
      scope: "ledger",
      range: undefined,
      categories: undefined,
      merchants: undefined,
      text: "coffee",
      reviewState: "all",
      withoutMerchant: undefined,
      side: "all",
      amount: undefined,
      sort: "amount",
      page: 2,
      pageSize: 10,
    });
  });

  it("forwards the scope argument", () => {
    expect(viewToInput(makeSearch(), "insights").scope).toBe("insights");
  });
});

describe("hasActiveViewFilters", () => {
  const cases: Array<[string, Record<string, unknown>]> = [
    ["from", { from: "2024-01-01" }],
    ["to", { to: "2024-12-31" }],
    ["categories", { categories: ["cat_1"] }],
    ["merchants", { merchants: ["mer_1"] }],
    ["q", { q: "coffee" }],
    ["noMerchant", { noMerchant: true }],
    ["side", { side: "expense" }],
    ["review", { review: "reviewed" }],
    ["min", { min: 0 }],
    ["max", { max: 0 }],
  ];

  it.each(cases)("is true when %s is set", (_label, partial) => {
    expect(hasActiveViewFilters(makeSearch(partial))).toBe(true);
  });

  it("is false for the default search", () => {
    expect(hasActiveViewFilters(DEFAULT_VIEW_SEARCH)).toBe(false);
  });

  it("ignores empty arrays and false flags", () => {
    expect(
      hasActiveViewFilters(
        makeSearch({ categories: [], merchants: [], noMerchant: false }),
      ),
    ).toBe(false);
  });
});

describe("clearedViewSearch", () => {
  it("clears every filter while preserving sort and pageSize", () => {
    const cleared = clearedViewSearch(
      makeSearch({
        from: "2024-01-01",
        to: "2024-12-31",
        categories: ["cat_1"],
        merchants: ["mer_1"],
        q: "coffee",
        noMerchant: true,
        side: "income",
        review: "reviewed",
        min: 5,
        max: 50,
        sort: "amount",
        page: 7,
        pageSize: 25,
      }),
    );

    expect(cleared).toEqual({
      ...DEFAULT_VIEW_SEARCH,
      sort: "amount",
      pageSize: 25,
    });
  });

  it("resets pagination back to the default page", () => {
    expect(clearedViewSearch(makeSearch({ page: 9 })).page).toBe(1);
  });
});
