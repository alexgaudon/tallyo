import { and, asc, eq, inArray, isNull, lte } from "drizzle-orm";
import { category, merchant, suggestionJob, transaction } from "@/db/schema";
import { db } from "../db";
import {
  isJevEnabled,
  type JevSuggestion,
  suggestForTransactions,
} from "./jev";
import { logger } from "./logger";
import { publishSuggestion } from "./suggestion-events";

const BATCH_SIZE = 25;
const POLL_INTERVAL_MS = 2_000;
const MAX_ATTEMPTS = 3;
const BACKOFF_BASE_MS = 30_000;

interface ClaimedJob {
  id: string;
  userId: string;
  transactionId: string;
  attempts: number;
}

/**
 * Enqueue one suggestion job per transaction. No-op when Jev is not configured
 * (no `OPENROUTER_API_KEY`), so nothing is queued that the worker cannot run.
 */
export async function enqueueSuggestionJobs(
  transactionIds: string[],
  userId: string,
): Promise<void> {
  if (!isJevEnabled() || transactionIds.length === 0) return;
  const now = new Date();
  await db
    .insert(suggestionJob)
    .values(
      transactionIds.map((transactionId) => ({
        transactionId,
        userId,
        createdAt: now,
        updatedAt: now,
      })),
    )
    .onConflictDoNothing({ target: suggestionJob.transactionId });
}

/**
 * Atomically claim up to `limit` due jobs. `FOR UPDATE SKIP LOCKED` makes this
 * safe if more than one worker ever runs.
 */
async function claimJobs(limit: number): Promise<ClaimedJob[]> {
  return db.transaction(async (tx) => {
    const rows = await tx
      .select({
        id: suggestionJob.id,
        userId: suggestionJob.userId,
        transactionId: suggestionJob.transactionId,
        attempts: suggestionJob.attempts,
      })
      .from(suggestionJob)
      .where(
        and(
          eq(suggestionJob.status, "pending"),
          lte(suggestionJob.runAt, new Date()),
        ),
      )
      .orderBy(asc(suggestionJob.runAt))
      .limit(limit)
      .for("update", { skipLocked: true });

    if (rows.length === 0) return [];

    await tx
      .update(suggestionJob)
      .set({ status: "processing", updatedAt: new Date() })
      .where(
        inArray(
          suggestionJob.id,
          rows.map((row) => row.id),
        ),
      );

    return rows;
  });
}

async function processUserJobs(
  userId: string,
  jobs: ClaimedJob[],
): Promise<void> {
  try {
    const rows = await db.query.transaction.findMany({
      where: inArray(
        transaction.id,
        jobs.map((job) => job.transactionId),
      ),
      columns: {
        id: true,
        transactionDetails: true,
        amount: true,
        categoryId: true,
        merchantId: true,
      },
    });
    const rowById = new Map(rows.map((row) => [row.id, row]));

    const candidates = rows
      .map((row) => ({
        row,
        needsCategory: !row.categoryId,
        needsMerchant: !row.merchantId,
      }))
      .filter((c) => c.needsCategory || c.needsMerchant);

    const userCategories = await db.query.category.findMany({
      where: eq(category.userId, userId),
      columns: { id: true, name: true },
    });
    const userMerchants = await db.query.merchant.findMany({
      where: eq(merchant.userId, userId),
      columns: { id: true, name: true },
    });

    const suggestions: Map<string, JevSuggestion> =
      candidates.length > 0 &&
      (userCategories.length > 0 || userMerchants.length > 0)
        ? await suggestForTransactions({
            categories: userCategories,
            merchants: userMerchants,
            transactions: candidates.map((c) => ({
              id: c.row.id,
              transactionDetails: c.row.transactionDetails,
              amount: c.row.amount,
              needsCategory: c.needsCategory,
              needsMerchant: c.needsMerchant,
            })),
          })
        : new Map<string, JevSuggestion>();

    for (const job of jobs) {
      const suggestion = suggestions.get(job.transactionId);
      const current = rowById.get(job.transactionId);

      let categoryWritten = false;
      let merchantWritten = false;

      if (suggestion?.categoryId && current && !current.categoryId) {
        // Guarded on the column: a manual assignment always wins over a
        // late suggestion.
        const updated = await db
          .update(transaction)
          .set({
            suggestedCategoryId: suggestion.categoryId,
            suggestedCategoryConfidence: suggestion.categoryConfidence ?? null,
            updatedAt: new Date(),
          })
          .where(
            and(
              eq(transaction.id, job.transactionId),
              isNull(transaction.categoryId),
            ),
          )
          .returning({ id: transaction.id });
        categoryWritten = updated.length > 0;
      }

      if (suggestion?.merchantId && current && !current.merchantId) {
        const updated = await db
          .update(transaction)
          .set({
            suggestedMerchantId: suggestion.merchantId,
            suggestedMerchantConfidence: suggestion.merchantConfidence ?? null,
            updatedAt: new Date(),
          })
          .where(
            and(
              eq(transaction.id, job.transactionId),
              isNull(transaction.merchantId),
            ),
          )
          .returning({ id: transaction.id });
        merchantWritten = updated.length > 0;
      }

      if (categoryWritten || merchantWritten) {
        publishSuggestion(userId, {
          transactionId: job.transactionId,
          suggestedCategoryId: categoryWritten
            ? (suggestion?.categoryId ?? null)
            : null,
          suggestedCategoryConfidence: categoryWritten
            ? (suggestion?.categoryConfidence ?? null)
            : null,
          suggestedMerchantId: merchantWritten
            ? (suggestion?.merchantId ?? null)
            : null,
          suggestedMerchantConfidence: merchantWritten
            ? (suggestion?.merchantConfidence ?? null)
            : null,
        });
      }

      await db
        .update(suggestionJob)
        .set({ status: "done", updatedAt: new Date() })
        .where(eq(suggestionJob.id, job.id));
    }
  } catch (error) {
    await rescheduleJobs(jobs, error);
  }
}

async function rescheduleJobs(
  jobs: ClaimedJob[],
  error: unknown,
): Promise<void> {
  const message = error instanceof Error ? error.message : String(error);
  logger.warn("Jev suggestion batch failed:", { error });

  for (const job of jobs) {
    const attempts = job.attempts + 1;
    const failed = attempts >= MAX_ATTEMPTS;
    await db
      .update(suggestionJob)
      .set({
        status: failed ? "failed" : "pending",
        attempts,
        runAt: new Date(Date.now() + BACKOFF_BASE_MS * 2 ** (attempts - 1)),
        lastError: message,
        updatedAt: new Date(),
      })
      .where(eq(suggestionJob.id, job.id));
  }
}

/** Claim and process one batch. Exported for tests; the worker calls it on a timer. */
export async function runSuggestionBatchOnce(): Promise<void> {
  const jobs = await claimJobs(BATCH_SIZE);
  if (jobs.length === 0) return;

  const byUser = new Map<string, ClaimedJob[]>();
  for (const job of jobs) {
    const list = byUser.get(job.userId) ?? [];
    list.push(job);
    byUser.set(job.userId, list);
  }

  for (const [userId, userJobs] of byUser) {
    await processUserJobs(userId, userJobs);
  }
}

let timer: ReturnType<typeof setInterval> | null = null;
let running = false;

/** Start the in-process suggestion worker. No-op when Jev is not configured. */
export function startSuggestionWorker(): void {
  if (timer || !isJevEnabled()) return;

  timer = setInterval(() => {
    if (running) return;
    running = true;
    runSuggestionBatchOnce()
      .catch((error) =>
        logger.warn("Jev suggestion worker tick failed:", { error }),
      )
      .finally(() => {
        running = false;
      });
  }, POLL_INTERVAL_MS);

  logger.info("Jev suggestion worker started");
}

export function stopSuggestionWorker(): void {
  if (timer) {
    clearInterval(timer);
    timer = null;
  }
}
