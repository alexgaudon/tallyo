import crypto from "node:crypto";
import { and, eq, sql } from "drizzle-orm";
import { z } from "zod";
import { merchant, merchantKeyword, transaction } from "@/db/schema";
import { enqueueSuggestionJobs } from "@/lib/suggestion-queue";
import {
  buildTransactionOrderBy,
  buildTransactionWhere,
  type TransactionViewFilter,
  transactionViewFilterSchema,
  transactionViewSchema,
} from "@/lib/transaction-view";
import { db } from "../db";
import { logger } from "../lib/logger";
import { protectedProcedure } from "../lib/orpc";
import { getMerchantFromVendor } from "./merchants";

// Helper functions
const withErrorHandling = <T>(
  operation: () => Promise<T>,
  errorContext: string,
  userId?: string,
): Promise<T> => {
  return operation().catch((error) => {
    logger.error(`${errorContext}${userId ? ` for user ${userId}` : ""}:`, {
      error,
    });
    if (error instanceof Error) {
      throw new Error(`${errorContext}: ${error.message}`);
    }
    throw new Error(
      `An unexpected error occurred while ${errorContext.toLowerCase()}`,
    );
  });
};

export const getTransactionWithRelations = async (transactionId: string) => {
  return await db.query.transaction.findFirst({
    where: eq(transaction.id, transactionId),
    with: {
      merchant: true,
      category: {
        with: {
          parentCategory: true,
        },
      },
      suggestedCategory: true,
    },
  });
};

export const validateTransactionOwnership = async (
  transactionId: string,
  userId: string,
) => {
  const currentTransaction = await db.query.transaction.findFirst({
    where: eq(transaction.id, transactionId),
  });

  if (!currentTransaction) {
    throw new Error("Transaction not found");
  }

  if (currentTransaction.userId !== userId) {
    throw new Error("Unauthorized to update this transaction");
  }

  return currentTransaction;
};

export const updateTransactionField = async (
  transactionId: string,
  updates: Record<string, unknown>,
  _errorContext: string,
  userId: string,
) => {
  const updatedTransaction = await db
    .update(transaction)
    .set({
      ...updates,
      updatedAt: new Date(),
    })
    .where(
      and(eq(transaction.id, transactionId), eq(transaction.userId, userId)),
    )
    .returning();

  if (!updatedTransaction || updatedTransaction.length === 0) {
    logger.error(
      `Transaction ${transactionId} not found or update failed for user ${userId}`,
    );
    throw new Error("Transaction not found or update failed");
  }

  return updatedTransaction[0];
};

export const handleKeywordRemoval = async (
  currentTransaction: { transactionDetails: string },
  currentMerchantId: string,
  _transactionId: string,
) => {
  if (!currentMerchantId) return;

  const currentMerchant = await db.query.merchant.findFirst({
    where: eq(merchant.id, currentMerchantId),
    with: { keywords: true },
  });

  if (!currentMerchant) return;

  // Look for keywords that match the transaction details (case-insensitive)
  const matchingKeywords = currentMerchant.keywords.filter(
    (keyword) =>
      keyword.keyword.toLowerCase() ===
      currentTransaction.transactionDetails.toLowerCase(),
  );

  for (const matchingKeyword of matchingKeywords) {
    logger.info(
      `Removing keyword "${matchingKeyword.keyword}" from merchant ${currentMerchant.name}`,
      { keyword: matchingKeyword.keyword, merchantId: currentMerchant.id },
    );

    await db
      .delete(merchantKeyword)
      .where(eq(merchantKeyword.id, matchingKeyword.id));
  }
};

export const handleKeywordAddition = async (
  currentTransaction: { transactionDetails: string },
  newMerchantId: string,
  userId: string,
) => {
  if (!newMerchantId) return;

  const newMerchantRecord = await db.query.merchant.findFirst({
    where: eq(merchant.id, newMerchantId),
    with: { keywords: true },
  });

  if (!newMerchantRecord) return;

  const description = currentTransaction.transactionDetails.toLowerCase();
  const keywordMatchFound = newMerchantRecord.keywords.some((keyword) =>
    description.includes(keyword.keyword.toLowerCase()),
  );

  if (!keywordMatchFound) {
    try {
      await db.insert(merchantKeyword).values({
        keyword: currentTransaction.transactionDetails,
        merchantId: newMerchantRecord.id,
        userId,
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      logger.info(
        `Added new keyword "${currentTransaction.transactionDetails}" for merchant ${newMerchantRecord.name}`,
        {
          newKeyword: currentTransaction.transactionDetails,
          merchantId: newMerchantRecord.id,
        },
      );
    } catch (error) {
      logger.warn(
        `Failed to add keyword "${currentTransaction.transactionDetails}" for merchant ${newMerchantRecord.name}`,
        {
          error,
          keyword: currentTransaction.transactionDetails,
          merchantId: newMerchantRecord.id,
        },
      );
    }
  }
};

type TransactionSummary = {
  totalCount: number;
  totalAmount: number;
  averageAmount: number;
  monthlyAverage?: number;
};

/**
 * Aggregates a filtered set of transactions. `monthlyAverage` is only defined
 * when exactly one category or exactly one merchant is selected, matching the
 * historical report behaviour.
 */
export const computeTransactionSummary = (
  rows: { amount: number; date: string }[],
  filter: Pick<TransactionViewFilter, "categories" | "merchants">,
): TransactionSummary => {
  const totalCount = rows.length;
  const totalAmount = rows.reduce((sum, row) => sum + Number(row.amount), 0);
  const averageAmount = totalCount > 0 ? totalAmount / totalCount : 0;

  let monthlyAverage: number | undefined;
  const shouldCalculateMonthlyAverage =
    filter.categories?.length === 1 || filter.merchants?.length === 1;

  if (shouldCalculateMonthlyAverage && rows.length > 0) {
    const dates = rows.map((row) => new Date(row.date));
    const minDate = new Date(Math.min(...dates.map((d) => d.getTime())));
    const maxDate = new Date(Math.max(...dates.map((d) => d.getTime())));

    const monthsDiff =
      (maxDate.getFullYear() - minDate.getFullYear()) * 12 +
      (maxDate.getMonth() - minDate.getMonth()) +
      1;

    monthlyAverage = totalAmount / monthsDiff;
  }

  return { totalCount, totalAmount, averageAmount, monthlyAverage };
};

export const transactionsRouter = {
  createTransaction: protectedProcedure
    .input(
      z.object({
        amount: z.number().int(),
        date: z
          .string()
          .regex(/^\d{4}-\d{2}-\d{2}$/, "Date must be in YYYY-MM-DD format"),
        transactionDetails: z
          .string()
          .min(1, "Transaction details are required"),
        merchantId: z.string().optional(),
        categoryId: z.string().optional(),
        notes: z.string().optional(),
      }),
    )
    .handler(async ({ input, context }) => {
      return withErrorHandling(
        async () => {
          const merchantRecord = await getMerchantFromVendor(
            input.transactionDetails,
            context.session?.user?.id,
          );

          const newTransaction = await db
            .insert(transaction)
            .values({
              userId: context.session?.user?.id,
              amount: input.amount,
              date: input.date,
              transactionDetails: input.transactionDetails,
              merchantId: input.merchantId || merchantRecord?.id,
              categoryId:
                input.categoryId || merchantRecord?.recommendedCategoryId,
              notes: input.notes,
            })
            .returning();

          if (!newTransaction || newTransaction.length === 0) {
            throw new Error("Failed to create transaction");
          }

          // Queue an AI category suggestion when nothing was assigned. Advisory
          // only; the worker stores it as metadata for the UI to offer. Never
          // blocks the create.
          if (!newTransaction[0].categoryId) {
            try {
              await enqueueSuggestionJobs(
                [newTransaction[0].id],
                context.session.user.id,
              );
            } catch (error) {
              logger.warn("Failed to enqueue Jev suggestion job:", { error });
            }
          }

          const createdTransaction = await getTransactionWithRelations(
            newTransaction[0].id,
          );
          return { transaction: createdTransaction };
        },
        "Error creating transaction",
        context.session?.user?.id,
      );
    }),

  getView: protectedProcedure
    .input(transactionViewSchema)
    .handler(async ({ input, context }) => {
      return withErrorHandling(
        async () => {
          const userId = context.session.user.id;
          const where = buildTransactionWhere(userId, input);
          const offset = (input.page - 1) * input.pageSize;

          const [{ count }] = await db
            .select({ count: sql<number>`count(*)` })
            .from(transaction)
            .where(where);

          const viewTransactions = await db.query.transaction.findMany({
            where,
            orderBy: buildTransactionOrderBy(input.sort),
            with: {
              merchant: true,
              category: { with: { parentCategory: true } },
              suggestedCategory: true,
            },
            limit: input.pageSize,
            offset,
          });

          const total = Number(count);
          return {
            transactions: viewTransactions,
            pagination: {
              total,
              page: input.page,
              pageSize: input.pageSize,
              totalPages: Math.ceil(total / input.pageSize),
            },
          };
        },
        "Error fetching transaction view",
        context.session?.user?.id,
      );
    }),

  getViewSummary: protectedProcedure
    .input(transactionViewFilterSchema)
    .handler(async ({ input, context }) => {
      return withErrorHandling(
        async () => {
          const userId = context.session.user.id;
          const where = buildTransactionWhere(userId, input);

          const summaryRows = await db
            .select({
              amount: transaction.amount,
              date: transaction.date,
            })
            .from(transaction)
            .where(where);

          return computeTransactionSummary(summaryRows, input);
        },
        "Error fetching transaction view summary",
        context.session?.user?.id,
      );
    }),

  updateTransactionCategory: protectedProcedure
    .input(z.object({ id: z.string(), categoryId: z.string().nullable() }))
    .handler(async ({ input, context }) => {
      return withErrorHandling(
        async () => {
          const updatedTransaction = await updateTransactionField(
            input.id,
            { categoryId: input.categoryId },
            "updating transaction category",
            context.session?.user?.id,
          );
          return { transaction: updatedTransaction };
        },
        "Error updating transaction category",
        context.session?.user?.id,
      );
    }),

  updateTransactionMerchant: protectedProcedure
    .input(z.object({ id: z.string(), merchantId: z.string().nullable() }))
    .handler(async ({ input, context }) => {
      return withErrorHandling(
        async () => {
          const currentTransaction = await validateTransactionOwnership(
            input.id,
            context.session?.user?.id,
          );

          // Handle keyword removal from old merchant
          if (
            currentTransaction.merchantId &&
            currentTransaction.merchantId !== input.merchantId
          ) {
            await handleKeywordRemoval(
              currentTransaction,
              currentTransaction.merchantId,
              input.id,
            );
          }

          // Get new merchant record
          const newMerchantRecord = input.merchantId
            ? await db.query.merchant.findFirst({
                where: eq(merchant.id, input.merchantId),
                with: { keywords: true },
              })
            : null;

          // Update transaction
          const updatedTransaction = await updateTransactionField(
            input.id,
            {
              merchantId: input.merchantId,
              categoryId: newMerchantRecord?.recommendedCategoryId ?? null,
            },
            "updating transaction merchant",
            context.session?.user?.id,
          );

          if (input.merchantId) {
            await handleKeywordAddition(
              currentTransaction,
              input.merchantId,
              context.session?.user?.id,
            );
          }

          return { transaction: updatedTransaction };
        },
        "Error updating transaction merchant",
        context.session?.user?.id,
      );
    }),

  toggleTransactionReviewed: protectedProcedure
    .input(z.object({ id: z.string() }))
    .handler(async ({ input, context }) => {
      return withErrorHandling(
        async () => {
          const currentTransaction = await validateTransactionOwnership(
            input.id,
            context.session?.user?.id,
          );

          const updatedTransaction = await updateTransactionField(
            input.id,
            { reviewed: !currentTransaction.reviewed },
            "toggling transaction reviewed status",
            context.session?.user?.id,
          );

          return { transaction: updatedTransaction };
        },
        "Error toggling reviewed status",
        context.session?.user?.id,
      );
    }),

  updateTransactionNotes: protectedProcedure
    .input(z.object({ id: z.string(), notes: z.string().nullable() }))
    .handler(async ({ input, context }) => {
      return withErrorHandling(
        async () => {
          const updatedTransaction = await updateTransactionField(
            input.id,
            { notes: input.notes },
            "updating transaction notes",
            context.session?.user?.id,
          );
          return { transaction: updatedTransaction };
        },
        "Error updating transaction notes",
        context.session?.user?.id,
      );
    }),

  deleteTransaction: protectedProcedure
    .input(z.object({ id: z.string() }))
    .handler(async ({ input, context }) => {
      return withErrorHandling(async () => {
        const deletedTransaction = await db
          .delete(transaction)
          .where(
            and(
              eq(transaction.id, input.id),
              eq(transaction.userId, context.session?.user?.id),
            ),
          )
          .returning();

        if (!deletedTransaction || deletedTransaction.length === 0) {
          throw new Error("Transaction not found");
        }

        return { success: true };
      }, "Error deleting transaction");
    }),

  splitTransaction: protectedProcedure
    .input(
      z.object({
        id: z.string(),
        splits: z
          .array(
            z.object({
              amount: z.number().int(),
              categoryId: z.string().nullable(),
            }),
          )
          .min(2, "At least 2 splits are required"),
      }),
    )
    .handler(async ({ input, context }) => {
      return withErrorHandling(
        async () => {
          const originalTransaction = await validateTransactionOwnership(
            input.id,
            context.session?.user?.id,
          );

          // Check if this is already a split transaction
          if (originalTransaction.splitGroupId) {
            throw new Error(
              "Cannot split a transaction that is already a split",
            );
          }

          // Validate that split amounts sum to original amount
          const totalSplitAmount = input.splits.reduce(
            (sum, split) => sum + split.amount,
            0,
          );
          if (totalSplitAmount !== originalTransaction.amount) {
            throw new Error(
              `Split amounts must sum to the original transaction amount (${originalTransaction.amount}), got ${totalSplitAmount}`,
            );
          }

          // The original row is deleted below, so the split children share a
          // logical group id rather than referencing a parent transaction.
          const splitGroupId = crypto.randomUUID();

          // Delete the original and insert the splits atomically so a failed
          // insert cannot leave the transaction permanently deleted.
          return db.transaction(async (tx) => {
            await tx.delete(transaction).where(eq(transaction.id, input.id));

            // Create new transactions for each split
            const createdTransactions = [];

            for (let i = 0; i < input.splits.length; i++) {
              const split = input.splits[i];
              // First split keeps original external ID, subsequent splits get -split-N suffix
              const splitExternalId =
                i === 0
                  ? originalTransaction.externalId
                  : originalTransaction.externalId
                    ? `${originalTransaction.externalId}-split-${i}`
                    : `${originalTransaction.id}-split-${i}`;

              const [newTransaction] = await tx
                .insert(transaction)
                .values({
                  userId: context.session?.user?.id,
                  merchantId: originalTransaction.merchantId,
                  categoryId: split.categoryId,
                  amount: split.amount,
                  date: originalTransaction.date,
                  transactionDetails: originalTransaction.transactionDetails,
                  notes: originalTransaction.notes,
                  externalId: splitExternalId,
                  reviewed: originalTransaction.reviewed,
                  flow: originalTransaction.flow,
                  excludedFromInsights:
                    originalTransaction.excludedFromInsights,
                  splitGroupId,
                  createdAt: new Date(),
                  updatedAt: new Date(),
                })
                .returning();

              createdTransactions.push(newTransaction);
            }

            return {
              success: true,
              transactions: createdTransactions,
            };
          });
        },
        "Error splitting transaction",
        context.session?.user?.id,
      );
    }),
};
