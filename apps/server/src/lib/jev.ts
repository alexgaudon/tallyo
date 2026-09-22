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

// The Jev/OpenRouter decisions API rejects a request with more than 255
// choices, so a user with hundreds of merchants cannot be asked in one go.
// Chunk below that limit for headroom.
const MAX_CHOICES = 200;

interface SuggestionAnswers {
  category?: { name: string; confidence: number };
  merchant?: { name: string; confidence: number };
}

const buildOptions = (
  entities: { name: string }[],
  describe: (name: string) => string | null,
): Record<string, string | null> =>
  Object.fromEntries(
    entities.map((entity) => [entity.name, describe(entity.name)]),
  );

const runDecide = (state: string, questions: Record<string, WireQuestion>) =>
  decide({
    adapter: openRouterDecider(getModel()),
    state,
    questions,
    abortSignal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
  });

const readChoice = (
  answer: unknown,
): { name: string; confidence: number } | null => {
  const value = answer as
    | { type?: string; value?: string; probability?: number }
    | undefined;
  if (value?.type !== "choice" || typeof value.value !== "string") return null;
  return { name: value.value, confidence: value.probability ?? 0 };
};

/**
 * Ask one question in chunks of at most MAX_CHOICES and keep the highest
 * probability answer. Probabilities are only comparable within a chunk, so this
 * is a heuristic across chunks — fine for an advisory suggestion.
 */
const decideInChunks = async (
  state: string,
  key: string,
  entities: { name: string }[],
  describe: (name: string) => string | null,
  instructions: string,
): Promise<{ name: string; confidence: number } | null> => {
  let best: { name: string; confidence: number } | null = null;

  for (let index = 0; index < entities.length; index += MAX_CHOICES) {
    const chunk = entities.slice(index, index + MAX_CHOICES);
    const result = await runDecide(state, {
      [key]: choice({ instructions, options: buildOptions(chunk, describe) }),
    });
    const answer = readChoice((result as Record<string, unknown>)[key]);
    if (answer && (!best || answer.confidence > best.confidence)) {
      best = answer;
    }
  }

  return best;
};

const requestSuggestion = async (
  input: JevCategorizeInput,
  transaction: JevCategorizeInput["transactions"][number],
): Promise<SuggestionAnswers | null> => {
  const wantsCategory =
    transaction.needsCategory && input.categories.length > 0;
  const wantsMerchant = transaction.needsMerchant && input.merchants.length > 0;
  if (!wantsCategory && !wantsMerchant) {
    return null;
  }

  const state = buildState(transaction.transactionDetails, transaction.amount);
  const fitsInOneCall =
    input.categories.length <= MAX_CHOICES &&
    input.merchants.length <= MAX_CHOICES;

  if (fitsInOneCall) {
    const questions: Record<string, WireQuestion> = {};
    if (wantsCategory) {
      questions.category = choice({
        instructions: CATEGORY_INSTRUCTIONS,
        options: buildOptions(input.categories, describeCategory),
      });
    }
    if (wantsMerchant) {
      questions.merchant = choice({
        instructions: MERCHANT_INSTRUCTIONS,
        options: buildOptions(input.merchants, () => null),
      });
    }

    const result = (await runDecide(state, questions)) as Record<
      string,
      unknown
    >;
    const answers: SuggestionAnswers = {};
    const category = wantsCategory ? readChoice(result.category) : null;
    const merchant = wantsMerchant ? readChoice(result.merchant) : null;
    if (category) answers.category = category;
    if (merchant) answers.merchant = merchant;
    return answers;
  }

  // A list exceeds the API limit: ask each question separately, chunked.
  logger.warn("Jev question exceeds the choice limit; chunking", {
    categories: input.categories.length,
    merchants: input.merchants.length,
  });

  const answers: SuggestionAnswers = {};
  if (wantsCategory) {
    const category = await decideInChunks(
      state,
      "category",
      input.categories,
      describeCategory,
      CATEGORY_INSTRUCTIONS,
    );
    if (category) answers.category = category;
  }
  if (wantsMerchant) {
    const merchant = await decideInChunks(
      state,
      "merchant",
      input.merchants,
      () => null,
      MERCHANT_INSTRUCTIONS,
    );
    if (merchant) answers.merchant = merchant;
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
