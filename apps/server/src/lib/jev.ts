import { choice, decide, type WireQuestion } from "@tanstack/ai";
import { openRouterDecider } from "@tanstack/ai-openrouter";
import { logger } from "./logger";

const DEFAULT_JEV_MODEL = "typesafe/jev-1.13";
const DEFAULT_CONFIDENCE_THRESHOLD = 0.5;
const MAX_CONCURRENCY = 8;
const REQUEST_TIMEOUT_MS = 15_000;

/** Advisory suggestions for one transaction. Either half may be absent. */
export interface JevSuggestion {
  categoryId?: string;
  categoryConfidence?: number;
  merchantId?: string;
  merchantConfidence?: number;
}

export interface JevCategorizeInput {
  categories: { id: string; name: string }[];
  merchants: { id: string; name: string }[];
  transactions: {
    id: string;
    transactionDetails: string;
    amount: number;
    /** Ask Jev for a category only when the row has none. */
    needsCategory: boolean;
    /** Ask Jev for a merchant only when keyword matching did not match one. */
    needsMerchant: boolean;
  }[];
}

export const isJevEnabled = (): boolean => {
  return Boolean(process.env.OPENROUTER_API_KEY);
};

const getConfidenceThreshold = (): number => {
  const parsed = Number.parseFloat(process.env.JEV_CONFIDENCE_THRESHOLD ?? "");
  return Number.isFinite(parsed) ? parsed : DEFAULT_CONFIDENCE_THRESHOLD;
};

const getModel = (): string => process.env.JEV_MODEL || DEFAULT_JEV_MODEL;

// Amounts are integer cents: negative = expense, positive = income.
const buildState = (transactionDetails: string, amount: number): string => {
  const direction = amount < 0 ? "charged" : "incoming credit";
  const dollars = Math.abs(amount) / 100;
  return `Description: ${transactionDetails}\nAmount: $${dollars.toFixed(2)} ${direction} to the account`;
};

// The category schema has no description field, so Jev would otherwise only
// see bare category names. This best-effort dictionary covers common
// personal-finance category names; anything unmatched stays description-less.
const CATEGORY_DESCRIPTIONS: Record<string, string> = {
  income: "salary and money coming in",
  auto: "car maintenance and vehicle expenses",
  gas: "fuel fill-ups at the pump",
  fuel: "fuel fill-ups at the pump",
  insurance: "insurance premiums",
  loan: "loan payments",
  loans: "loan payments",
  housing: "home maintenance and repairs",
  rent: "monthly rent",
  mortgage: "mortgage payments",
  utilities: "electricity and water",
  internet: "home internet service",
  food: "groceries and food shopping",
  groceries: "supermarket purchases",
  restaurants: "dining out",
  "dining out": "dining out",
  "fast food": "quick-service restaurants",
  treats: "small snacks, drinks, and impulse purchases",
  "health & wellness": "pharmacy and medical",
  health: "pharmacy and medical",
  healthcare: "pharmacy and medical",
  "gym membership": "fitness memberships",
  fitness: "fitness memberships",
  spending: "general discretionary spending",
  donations: "charity and giving",
  entertainment: "movies, games, and leisure",
  gifts: "presents for others",
  homelab: "servers and tech infrastructure",
  tech: "technology purchases",
  misc: "small uncategorized purchases",
  miscellaneous: "small uncategorized purchases",
  "phone bill": "mobile phone service",
  phone: "mobile phone service",
  shopping: "retail purchases",
  subscriptions: "recurring services",
  transfer: "moving money between accounts",
  travel: "flights, hotels, and trips",
  vacation: "flights, hotels, and trips",
  pets: "pet food and care",
  kids: "children's expenses",
  education: "tuition and learning",
  savings: "money set aside",
};

const describeCategory = (name: string): string | null => {
  const lower = name.toLowerCase().trim();
  if (CATEGORY_DESCRIPTIONS[lower]) return CATEGORY_DESCRIPTIONS[lower];
  // Fuzzy fallback for names like "Gas Bill" or "Treats & Snacks".
  for (const [key, description] of Object.entries(CATEGORY_DESCRIPTIONS)) {
    if (lower.includes(key)) return description;
  }
  return null;
};

const CATEGORY_INSTRUCTIONS =
  "Pick the single best category for this bank or card transaction. Judge the amount against each category's typical transaction size, then pick the most plausible category and assign it confidently. For example, a charge of only a few dollars at a fuel station or cafe counter is almost never the primary product (fuel, a full meal); it is usually a small convenience purchase such as snacks or a drink.";

const MERCHANT_INSTRUCTIONS =
  "Pick the single existing merchant that most likely matches this bank or card transaction, judging from the description. Only pick a merchant when the description plausibly refers to it; a generic or ambiguous description should not be forced onto a merchant.";

interface SuggestionAnswers {
  category?: { name: string; confidence: number };
  merchant?: { name: string; confidence: number };
}

const requestSuggestion = async (
  input: JevCategorizeInput,
  transaction: JevCategorizeInput["transactions"][number],
): Promise<SuggestionAnswers | null> => {
  const questions: Record<string, WireQuestion> = {};

  if (transaction.needsCategory && input.categories.length > 0) {
    questions.category = choice({
      instructions: CATEGORY_INSTRUCTIONS,
      options: Object.fromEntries(
        input.categories.map((c) => [c.name, describeCategory(c.name)]),
      ),
    });
  }

  if (transaction.needsMerchant && input.merchants.length > 0) {
    questions.merchant = choice({
      instructions: MERCHANT_INSTRUCTIONS,
      options: Object.fromEntries(input.merchants.map((m) => [m.name, null])),
    });
  }

  if (Object.keys(questions).length === 0) {
    return null;
  }

  const result = await decide({
    adapter: openRouterDecider(getModel()),
    state: buildState(transaction.transactionDetails, transaction.amount),
    questions,
    abortSignal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
  });

  const answers: SuggestionAnswers = {};
  if (result.category?.type === "choice") {
    answers.category = {
      name: result.category.value,
      confidence: result.category.probability,
    };
  }
  if (result.merchant?.type === "choice") {
    answers.merchant = {
      name: result.merchant.value,
      confidence: result.merchant.probability,
    };
  }
  return answers;
};

/**
 * Suggest a category and/or merchant per transaction. Advisory only — callers
 * store the result as metadata and never auto-apply it.
 */
export const suggestForTransactions = async (
  input: JevCategorizeInput,
): Promise<Map<string, JevSuggestion>> => {
  const result = new Map<string, JevSuggestion>();

  if (!isJevEnabled()) {
    return result;
  }
  if (input.categories.length === 0 && input.merchants.length === 0) {
    return result;
  }

  const threshold = getConfidenceThreshold();

  // One call per transaction: evaluation semantics treat a state as a single
  // shared context, so unrelated transactions must not share one call.
  // Requests are independent, so they run with bounded concurrency.
  const tasks = input.transactions.map(
    async (t): Promise<[string, JevSuggestion] | null> => {
      if (!t.needsCategory && !t.needsMerchant) return null;
      try {
        const answers = await requestSuggestion(input, t);
        if (!answers) return null;

        const suggestion: JevSuggestion = {};

        if (answers.category && answers.category.confidence >= threshold) {
          const category = input.categories.find(
            (c) => c.name === answers.category?.name,
          );
          if (category) {
            suggestion.categoryId = category.id;
            suggestion.categoryConfidence = answers.category.confidence;
          }
        }

        if (answers.merchant && answers.merchant.confidence >= threshold) {
          const merchant = input.merchants.find(
            (m) => m.name === answers.merchant?.name,
          );
          if (merchant) {
            suggestion.merchantId = merchant.id;
            suggestion.merchantConfidence = answers.merchant.confidence;
          }
        }

        return Object.keys(suggestion).length > 0 ? [t.id, suggestion] : null;
      } catch (error) {
        logger.warn("Jev suggestion failed:", {
          error,
          transactionId: t.id,
        });
        return null;
      }
    },
  );

  const settled = await runWithConcurrency(tasks, MAX_CONCURRENCY);
  for (const outcome of settled) {
    if (outcome.status === "fulfilled" && outcome.value) {
      result.set(outcome.value[0], outcome.value[1]);
    }
  }

  return result;
};

const runWithConcurrency = async <T>(
  tasks: Promise<T>[],
  concurrency: number,
): Promise<PromiseSettledResult<T>[]> => {
  const results: PromiseSettledResult<T>[] = new Array(tasks.length);
  let next = 0;

  const worker = async () => {
    while (next < tasks.length) {
      const index = next++;
      try {
        results[index] = { status: "fulfilled", value: await tasks[index] };
      } catch (error) {
        results[index] = { status: "rejected", reason: error };
      }
    }
  };

  await Promise.all(
    Array.from({ length: Math.min(concurrency, tasks.length) }, worker),
  );

  return results;
};
