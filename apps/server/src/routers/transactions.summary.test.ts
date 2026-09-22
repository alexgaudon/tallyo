import { describe, expect, it } from "vitest";
import { computeTransactionSummary } from "@/routers/transactions";

const threeMonthRows = [
  { amount: 100, date: "2024-01-05" },
  { amount: -40, date: "2024-01-20" },
  { amount: 240, date: "2024-03-10" },
];

describe("computeTransactionSummary", () => {
  it("computes count, total and average for the rows", () => {
    const summary = computeTransactionSummary(threeMonthRows, {});
    expect(summary.totalCount).toBe(3);
    expect(summary.totalAmount).toBe(300);
    expect(summary.averageAmount).toBe(100);
    expect(summary.monthlyAverage).toBeUndefined();
  });

  it("handles an empty row set without dividing by zero", () => {
    const summary = computeTransactionSummary([], {});
    expect(summary).toEqual({
      totalCount: 0,
      totalAmount: 0,
      averageAmount: 0,
      monthlyAverage: undefined,
    });
  });

  it("computes a negative average for expense-only rows", () => {
    const summary = computeTransactionSummary(
      [
        { amount: -100, date: "2024-01-01" },
        { amount: -300, date: "2024-01-02" },
      ],
      {},
    );
    expect(summary.totalAmount).toBe(-400);
    expect(summary.averageAmount).toBe(-200);
  });

  describe("monthlyAverage eligibility", () => {
    it("computes it when exactly one category is selected", () => {
      const summary = computeTransactionSummary(threeMonthRows, {
        categories: ["cat-1"],
      });
      expect(summary.monthlyAverage).toBe(100);
    });

    it("computes it when exactly one merchant is selected", () => {
      const summary = computeTransactionSummary(threeMonthRows, {
        merchants: ["merchant-1"],
      });
      expect(summary.monthlyAverage).toBe(100);
    });

    it("computes it when one category and one merchant are selected", () => {
      const summary = computeTransactionSummary(threeMonthRows, {
        categories: ["cat-1"],
        merchants: ["merchant-1"],
      });
      expect(summary.monthlyAverage).toBe(100);
    });

    it("is undefined for two categories", () => {
      const summary = computeTransactionSummary(threeMonthRows, {
        categories: ["cat-1", "cat-2"],
      });
      expect(summary.monthlyAverage).toBeUndefined();
    });

    it("is undefined for two merchants", () => {
      const summary = computeTransactionSummary(threeMonthRows, {
        merchants: ["merchant-1", "merchant-2"],
      });
      expect(summary.monthlyAverage).toBeUndefined();
    });

    it("is undefined for one category when there are no rows", () => {
      const summary = computeTransactionSummary([], {
        categories: ["cat-1"],
      });
      expect(summary.monthlyAverage).toBeUndefined();
    });
  });

  describe("month-span math", () => {
    it("uses a single month for rows in the same month", () => {
      const summary = computeTransactionSummary(
        [
          { amount: 60, date: "2024-05-15" },
          { amount: 40, date: "2024-05-20" },
        ],
        { categories: ["cat-1"] },
      );
      expect(summary.monthlyAverage).toBe(100);
    });

    it("spans inclusive calendar months across a year boundary", () => {
      const summary = computeTransactionSummary(
        [
          { amount: 120, date: "2023-12-15" },
          { amount: 60, date: "2024-02-10" },
        ],
        { categories: ["cat-1"] },
      );
      // Dec 2023 -> Feb 2024 is three inclusive months.
      expect(summary.monthlyAverage).toBe(60);
    });

    it("divides the total amount, not the average", () => {
      const summary = computeTransactionSummary(threeMonthRows, {
        merchants: ["merchant-1"],
      });
      expect(summary.totalAmount / 3).toBe(summary.monthlyAverage);
    });
  });
});
