import { addDays, format } from "date-fns";
import { and, asc, count, desc, eq, lte } from "drizzle-orm";
import { z } from "zod";
import { db } from "@/db";
import { account, settings, suggestionJob, transaction } from "@/db/schema";
import { protectedProcedure } from "../lib/orpc";

export const metaRouter = {
  triggerWebhookRefresh: protectedProcedure.handler(async ({ context }) => {
    const webhookUrls = await db.query.settings.findFirst({
      where: eq(settings.userId, context.session?.user?.id),
      columns: {
        webhookUrls: true,
      },
    });

    const urls = webhookUrls?.webhookUrls ?? [];

    // Fetch to each webhook URL with POST (no data)
    const responses = await Promise.allSettled(
      urls.map(async (url) => {
        try {
          const response = await fetch(url, {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
            },
          });

          let responseBody: unknown = null;
          const contentType = response.headers.get("content-type");

          // Try to parse response body if available
          try {
            if (contentType?.includes("application/json")) {
              responseBody = await response.json();
            } else {
              const text = await response.text();
              responseBody = text || null;
            }
          } catch {
            // If parsing fails, responseBody stays null
          }

          return {
            url,
            success: response.ok,
            status: response.status,
            statusText: response.statusText,
            body: responseBody,
          };
        } catch (error) {
          return {
            url,
            success: false,
            status: null,
            statusText:
              error instanceof Error ? error.message : "Unknown error",
            body: null,
          };
        }
      }),
    );

    // Transform Promise.allSettled results into a cleaner format
    const results = responses.map((result) => {
      if (result.status === "fulfilled") {
        return result.value;
      } else {
        return {
          url: "unknown",
          success: false,
          status: null,
          statusText:
            result.reason instanceof Error
              ? result.reason.message
              : "Unknown error",
          body: null,
        };
      }
    });

    return {
      results,
    };
  }),
  isOauthUserOrEmailUser: protectedProcedure.handler(async ({ context }) => {
    const userAccount = await db.query.account.findFirst({
      where: eq(account.userId, context.session?.user?.id),
    });

    // Check if user has a password (email/password authentication)
    const hasPassword =
      userAccount?.password !== null && userAccount?.password !== undefined;

    return {
      isOauthUser: !hasPassword,
      isEmailUser: hasPassword,
    };
  }),
  getUserMeta: protectedProcedure.handler(async ({ context }) => {
    const earliestTransactionDate = await db.query.transaction.findFirst({
      where: eq(transaction.userId, context.session?.user?.id),
      orderBy: [asc(transaction.date)],
      columns: {
        date: true,
      },
    });

    const unreviewedTransactionCount = await db
      .select({ count: count() })
      .from(transaction)
      .where(
        and(
          eq(transaction.userId, context.session?.user?.id),
          eq(transaction.reviewed, false),
          lte(transaction.date, format(addDays(new Date(), 30), "yyyy-MM-dd")),
        ),
      );

    return {
      earliestTransactionDate:
        earliestTransactionDate?.date ?? format(new Date(), "yyyy-MM-dd"),
      unreviewedTransactionCount: unreviewedTransactionCount[0]?.count ?? 0,
    };
  }),
  /** Dev tooling: recent AI suggestion jobs with their transaction context. */
  getSuggestionJobs: protectedProcedure
    .input(z.object({ limit: z.number().min(1).max(200).default(50) }))
    .handler(async ({ context, input }) => {
      return db
        .select({
          id: suggestionJob.id,
          status: suggestionJob.status,
          attempts: suggestionJob.attempts,
          runAt: suggestionJob.runAt,
          lastError: suggestionJob.lastError,
          createdAt: suggestionJob.createdAt,
          updatedAt: suggestionJob.updatedAt,
          transactionId: suggestionJob.transactionId,
          transactionDetails: transaction.transactionDetails,
          amount: transaction.amount,
          categoryId: transaction.categoryId,
          suggestedCategoryId: transaction.suggestedCategoryId,
          suggestedCategoryConfidence: transaction.suggestedCategoryConfidence,
        })
        .from(suggestionJob)
        .leftJoin(transaction, eq(suggestionJob.transactionId, transaction.id))
        .where(eq(suggestionJob.userId, context.session.user.id))
        .orderBy(desc(suggestionJob.createdAt))
        .limit(input.limit);
    }),
  /** Dev tooling: put a suggestion job back on the queue. */
  retrySuggestionJob: protectedProcedure
    .input(z.object({ id: z.string() }))
    .handler(async ({ context, input }) => {
      const updated = await db
        .update(suggestionJob)
        .set({
          status: "pending",
          attempts: 0,
          runAt: new Date(),
          lastError: null,
          updatedAt: new Date(),
        })
        .where(
          and(
            eq(suggestionJob.id, input.id),
            eq(suggestionJob.userId, context.session.user.id),
          ),
        )
        .returning({ id: suggestionJob.id });
      return { requeued: updated.length };
    }),
};
