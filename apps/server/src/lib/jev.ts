import { choice, decide } from "@tanstack/ai";
import { openRouterDecider } from "@tanstack/ai-openrouter";
import { logger } from "./logger";

const DEFAULT_JEV_MODEL = "typesafe/jev-1.13";
const DEFAULT_CONFIDENCE_THRESHOLD = 0.7;
const MAX_CONCURRENCY = 8;
const REQUEST_TIMEOUT_MS = 15_000;

export interface JevCategorySuggestion {
  categoryId: string;
  confidence: number;
}

export interface JevCategorizeInput {
  categories: { id: string; name: string }[];
  transactions: {
    id: string;
    transactionDetails: string;
    amount: number;
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

interface CategoryChoice {
  choice: string;
  confidence: number;
}

const requestSuggestion = async (
  categories: { id: string; name: string }[],
  transaction: { transactionDetails: string; amount: number },
): Promise<CategoryChoice | null> => {
  const result = await decide({
    adapter: openRouterDecider(getModel()),
    state: buildState(transaction.transactionDetails, transaction.amount),
    questions: {
      category: choice({
        instructions: CATEGORY_INSTRUCTIONS,
        options: Object.fromEntries(
          categories.map((c) => [c.name, describeCategory(c.name)]),
        ),
      }),
    },
    abortSignal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
  });

  const answer = result.category;
  if (answer.type !== "choice") {
    return null;
  }
  return { choice: answer.value, confidence: answer.probability };
};

export const suggestCategoriesForTransactions = async (
  input: JevCategorizeInput,
): Promise<Map<string, JevCategorySuggestion>> => {
  const result = new Map<string, JevCategorySuggestion>();

  if (!isJevEnabled() || input.categories.length === 0) {
    return result;
  }

  // One call per transaction: evaluation semantics treat a state as a single
  // shared context, so unrelated transactions must not share one call.
  // Requests are independent, so they run with bounded concurrency.
  const tasks = input.transactions.map(
    async (t): Promise<[string, JevCategorySuggestion] | null> => {
      try {
        const answer = await requestSuggestion(input.categories, t);
        if (!answer) return null;

        if (answer.confidence < getConfidenceThreshold()) return null;

        const category = input.categories.find((c) => c.name === answer.choice);
        if (!category) return null;

        return [
          t.id,
          { categoryId: category.id, confidence: answer.confidence },
        ];
      } catch (error) {
        logger.warn("Jev category suggestion failed:", {
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
