import { eq, inArray } from "drizzle-orm";
import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";

vi.mock("./jev", () => ({
  isJevEnabled: vi.fn(() => true),
  suggestForTransactions: vi.fn(),
}));

import { db } from "@/db";
import { category, suggestionJob, transaction, user } from "@/db/schema";
import { isJevEnabled, suggestForTransactions } from "@/lib/jev";
import {
  type SuggestionEvent,
  subscribeToSuggestions,
} from "@/lib/suggestion-events";
import {
  enqueueSuggestionJobs,
  runSuggestionBatchOnce,
} from "@/lib/suggestion-queue";

// Integration: needs a real database. Read/write, but every row it creates is
// removed afterwards.
const run = describe.skipIf(!process.env.DATABASE_URL);

run("suggestion queue", () => {
  let userId: string | null = null;
  let categoryId: string | null = null;
  let createdCategory = false;
  const transactionIds: string[] = [];

  beforeAll(async () => {
    const [existingUser] = await db.select().from(user).limit(1);
    if (!existingUser) return;
    userId = existingUser.id;

    const [existingCategory] = await db
      .select()
      .from(category)
      .where(eq(category.userId, userId))
      .limit(1);
    if (existingCategory) {
      categoryId = existingCategory.id;
    } else {
      const [created] = await db
        .insert(category)
        .values({ userId, name: `JevTest ${Date.now()}` })
        .returning();
      categoryId = created.id;
      createdCategory = true;
    }
  });

  afterAll(async () => {
    if (transactionIds.length > 0) {
      await db
        .delete(transaction)
        .where(inArray(transaction.id, transactionIds));
    }
    if (createdCategory && categoryId) {
      await db.delete(category).where(eq(category.id, categoryId));
    }
  });

  async function createTransaction(
    overrides: Partial<typeof transaction.$inferInsert> = {},
  ) {
    const [created] = await db
      .insert(transaction)
      .values({
        userId: userId as string,
        amount: -1999,
        date: "2026-01-15",
        transactionDetails: `JEV TEST ${Date.now()}-${Math.random().toString(36).slice(2)}`,
        ...overrides,
      })
      .returning();
    transactionIds.push(created.id);
    return created;
  }

  it("does not enqueue when Jev is disabled", async (ctx) => {
    if (!userId) return ctx.skip();
    vi.mocked(isJevEnabled).mockReturnValueOnce(false);

    const created = await createTransaction();
    await enqueueSuggestionJobs([created.id], userId);

    const jobs = await db
      .select()
      .from(suggestionJob)
      .where(eq(suggestionJob.transactionId, created.id));
    expect(jobs).toHaveLength(0);
  });

  it("enqueues one job per transaction, idempotently", async (ctx) => {
    if (!userId) return ctx.skip();

    const created = await createTransaction();
    await enqueueSuggestionJobs([created.id], userId);
    await enqueueSuggestionJobs([created.id], userId);

    const jobs = await db
      .select()
      .from(suggestionJob)
      .where(eq(suggestionJob.transactionId, created.id));
    expect(jobs).toHaveLength(1);
    expect(jobs[0].status).toBe("pending");
  });

  it("writes the suggestion, completes the job, and publishes an event", async (ctx) => {
    if (!userId || !categoryId) return ctx.skip();

    const created = await createTransaction();
    await enqueueSuggestionJobs([created.id], userId);
    vi.mocked(suggestForTransactions).mockResolvedValue(
      new Map([[created.id, { categoryId, categoryConfidence: 0.91 }]]),
    );

    const events: SuggestionEvent[] = [];
    const unsubscribe = subscribeToSuggestions(userId, (event) =>
      events.push(event),
    );
    await runSuggestionBatchOnce();
    unsubscribe();

    const [updated] = await db
      .select()
      .from(transaction)
      .where(eq(transaction.id, created.id));
    expect(updated.suggestedCategoryId).toBe(categoryId);
    expect(updated.suggestedCategoryConfidence).toBeCloseTo(0.91);

    const [job] = await db
      .select()
      .from(suggestionJob)
      .where(eq(suggestionJob.transactionId, created.id));
    expect(job.status).toBe("done");
    expect(
      events.some(
        (event) =>
          event.transactionId === created.id &&
          event.suggestedCategoryId === categoryId,
      ),
    ).toBe(true);
  });

  it("does not overwrite a category assigned in the meantime", async (ctx) => {
    if (!userId || !categoryId) return ctx.skip();

    const created = await createTransaction({ categoryId });
    await enqueueSuggestionJobs([created.id], userId);
    vi.mocked(suggestForTransactions).mockResolvedValue(
      new Map([[created.id, { categoryId, categoryConfidence: 0.99 }]]),
    );

    await runSuggestionBatchOnce();

    const [updated] = await db
      .select()
      .from(transaction)
      .where(eq(transaction.id, created.id));
    expect(updated.suggestedCategoryId).toBeNull();

    const [job] = await db
      .select()
      .from(suggestionJob)
      .where(eq(suggestionJob.transactionId, created.id));
    expect(job.status).toBe("done");
  });

  it("reschedules a failure with backoff, then gives up at the max attempts", async (ctx) => {
    if (!userId) return ctx.skip();

    const created = await createTransaction();
    await enqueueSuggestionJobs([created.id], userId);
    vi.mocked(suggestForTransactions).mockRejectedValue(
      new Error("provider down"),
    );

    await runSuggestionBatchOnce();

    let [job] = await db
      .select()
      .from(suggestionJob)
      .where(eq(suggestionJob.transactionId, created.id));
    expect(job.status).toBe("pending");
    expect(job.attempts).toBe(1);
    expect(job.lastError).toContain("provider down");
    expect(job.runAt.getTime()).toBeGreaterThan(Date.now());

    // Pretend it has already failed twice; the next failure is terminal.
    await db
      .update(suggestionJob)
      .set({ attempts: 2, runAt: new Date(Date.now() - 1000) })
      .where(eq(suggestionJob.id, job.id));

    await runSuggestionBatchOnce();

    [job] = await db
      .select()
      .from(suggestionJob)
      .where(eq(suggestionJob.transactionId, created.id));
    expect(job.status).toBe("failed");
    expect(job.attempts).toBe(3);
  });
});
