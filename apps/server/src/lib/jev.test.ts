import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const { decideMock } = vi.hoisted(() => ({ decideMock: vi.fn() }));

vi.mock("@tanstack/ai", () => ({
  choice: (options: {
    instructions: unknown;
    options: Record<string, string | null>;
  }) => ({
    type: "choice",
    instructions: options.instructions,
    criteria: options.options,
  }),
  decide: decideMock,
}));
vi.mock("@tanstack/ai-openrouter", () => ({
  openRouterDecider: () => ({ kind: "evaluate", name: "openrouter" }),
}));

import { isJevEnabled, suggestForTransactions } from "@/lib/jev";

const categories = [
  { id: "cat-gas", name: "Gas" },
  { id: "cat-food", name: "Food" },
];
const merchants = [
  { id: "mer-foods", name: "Whole Foods" },
  { id: "mer-shell", name: "Shell" },
];

const tx = (overrides: Record<string, unknown> = {}) => ({
  id: "t1",
  transactionDetails: "SHELL OIL 1234",
  amount: -1234,
  needsCategory: true,
  needsMerchant: false,
  ...overrides,
});

const originalKey = process.env.OPENROUTER_API_KEY;
const originalThreshold = process.env.JEV_CONFIDENCE_THRESHOLD;

beforeEach(() => {
  process.env.OPENROUTER_API_KEY = "test-key";
  delete process.env.JEV_CONFIDENCE_THRESHOLD;
  decideMock.mockReset();
});

afterEach(() => {
  if (originalKey === undefined) delete process.env.OPENROUTER_API_KEY;
  else process.env.OPENROUTER_API_KEY = originalKey;
  if (originalThreshold === undefined) {
    delete process.env.JEV_CONFIDENCE_THRESHOLD;
  } else {
    process.env.JEV_CONFIDENCE_THRESHOLD = originalThreshold;
  }
});

describe("isJevEnabled", () => {
  it("is false without an API key", () => {
    delete process.env.OPENROUTER_API_KEY;
    expect(isJevEnabled()).toBe(false);
  });

  it("is true with an API key", () => {
    expect(isJevEnabled()).toBe(true);
  });
});

describe("suggestForTransactions", () => {
  it("returns nothing when Jev is disabled", async () => {
    delete process.env.OPENROUTER_API_KEY;
    const result = await suggestForTransactions({
      categories,
      merchants,
      transactions: [tx()],
    });
    expect(result.size).toBe(0);
    expect(decideMock).not.toHaveBeenCalled();
  });

  it("returns nothing when there are no categories or merchants", async () => {
    const result = await suggestForTransactions({
      categories: [],
      merchants: [],
      transactions: [tx()],
    });
    expect(result.size).toBe(0);
    expect(decideMock).not.toHaveBeenCalled();
  });

  it("maps the chosen category name to its id with the confidence", async () => {
    decideMock.mockResolvedValue({
      category: { type: "choice", value: "Gas", probability: 0.82 },
    });
    const result = await suggestForTransactions({
      categories,
      merchants: [],
      transactions: [tx()],
    });
    expect(result.get("t1")).toEqual({
      categoryId: "cat-gas",
      categoryConfidence: 0.82,
    });
  });

  it("drops an answer below the confidence threshold", async () => {
    decideMock.mockResolvedValue({
      category: { type: "choice", value: "Gas", probability: 0.4 },
    });
    const result = await suggestForTransactions({
      categories,
      merchants: [],
      transactions: [tx()],
    });
    expect(result.size).toBe(0);
  });

  it("honours JEV_CONFIDENCE_THRESHOLD", async () => {
    process.env.JEV_CONFIDENCE_THRESHOLD = "0.3";
    decideMock.mockResolvedValue({
      category: { type: "choice", value: "Gas", probability: 0.4 },
    });
    const result = await suggestForTransactions({
      categories,
      merchants: [],
      transactions: [tx()],
    });
    expect(result.get("t1")?.categoryId).toBe("cat-gas");
  });

  it("ignores an answer that is not one of the offered names", async () => {
    decideMock.mockResolvedValue({
      category: { type: "choice", value: "Nonsense", probability: 0.99 },
    });
    const result = await suggestForTransactions({
      categories,
      merchants: [],
      transactions: [tx()],
    });
    expect(result.size).toBe(0);
  });

  it("suggests a merchant when the transaction needs one", async () => {
    decideMock.mockResolvedValue({
      merchant: { type: "choice", value: "Shell", probability: 0.9 },
    });
    const result = await suggestForTransactions({
      categories: [],
      merchants,
      transactions: [tx({ needsCategory: false, needsMerchant: true })],
    });
    expect(result.get("t1")).toEqual({
      merchantId: "mer-shell",
      merchantConfidence: 0.9,
    });
  });

  it("asks only the questions the transaction needs", async () => {
    decideMock.mockResolvedValue({
      category: { type: "choice", value: "Gas", probability: 0.9 },
    });
    await suggestForTransactions({
      categories,
      merchants,
      transactions: [tx({ needsCategory: true, needsMerchant: false })],
    });
    const questions = decideMock.mock.calls[0][0].questions;
    expect(Object.keys(questions)).toEqual(["category"]);
  });

  it("sends the descriptor/amount as state and category descriptions as criteria", async () => {
    decideMock.mockResolvedValue({
      category: { type: "choice", value: "Gas", probability: 0.9 },
    });
    await suggestForTransactions({
      categories,
      merchants: [],
      transactions: [tx({ amount: -1234 })],
    });
    const args = decideMock.mock.calls[0][0];
    expect(args.state).toContain("SHELL OIL 1234");
    expect(args.state).toContain("$12.34");
    expect(args.questions.category.criteria.Gas).toBe(
      "fuel fill-ups at the pump",
    );
    expect(args.questions.category.criteria.Food).toBe(
      "groceries and food shopping",
    );
  });

  it("offers merchants with no extra description", async () => {
    decideMock.mockResolvedValue({
      merchant: { type: "choice", value: "Shell", probability: 0.9 },
    });
    await suggestForTransactions({
      categories: [],
      merchants,
      transactions: [tx({ needsCategory: false, needsMerchant: true })],
    });
    expect(decideMock.mock.calls[0][0].questions.merchant.criteria).toEqual({
      "Whole Foods": null,
      Shell: null,
    });
  });

  it("returns nothing when the model call fails", async () => {
    decideMock.mockRejectedValue(new Error("provider down"));
    const result = await suggestForTransactions({
      categories,
      merchants: [],
      transactions: [tx()],
    });
    expect(result.size).toBe(0);
  });

  it("suggests both a category and a merchant in one call", async () => {
    decideMock.mockResolvedValue({
      category: { type: "choice", value: "Gas", probability: 0.9 },
      merchant: { type: "choice", value: "Shell", probability: 0.8 },
    });
    const result = await suggestForTransactions({
      categories,
      merchants,
      transactions: [tx({ needsCategory: true, needsMerchant: true })],
    });
    expect(result.get("t1")).toEqual({
      categoryId: "cat-gas",
      categoryConfidence: 0.9,
      merchantId: "mer-shell",
      merchantConfidence: 0.8,
    });
  });

  it("chunks a question that exceeds the choice limit and keeps the best answer", async () => {
    // 250 merchants exceeds MAX_CHOICES (200), so the merchant question is
    // asked in two chunks.
    const manyMerchants = Array.from({ length: 250 }, (_, i) => ({
      id: `m${i}`,
      name: `Merchant ${i}`,
    }));
    decideMock
      .mockResolvedValueOnce({
        merchant: { type: "choice", value: "Merchant 5", probability: 0.5 },
      })
      .mockResolvedValueOnce({
        merchant: { type: "choice", value: "Merchant 220", probability: 0.9 },
      });

    const result = await suggestForTransactions({
      categories: [],
      merchants: manyMerchants,
      transactions: [tx({ needsCategory: false, needsMerchant: true })],
    });

    expect(decideMock).toHaveBeenCalledTimes(2);
    expect(result.get("t1")).toEqual({
      merchantId: "m220",
      merchantConfidence: 0.9,
    });
  });
});
