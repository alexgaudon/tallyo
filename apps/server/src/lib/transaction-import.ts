import { db } from "@/db";
import { transaction } from "@/db/schema";
import { findBestMatchingMerchant } from "@/lib/merchant-matching";
import { logger } from "@/lib/logger";
import { enqueueSuggestionJobs } from "@/lib/suggestion-queue";
import { getUserMerchantsForMatching } from "@/routers/merchants";

/** One row from an import batch. Mirrors the external API's transaction shape. */
export type TransactionImportInput = {
  amount: number;
  date: string | Date;
  transactionDetails: string;
  externalId: string;
  merchantId?: string;
  categoryId?: string;
  notes?: string;
  /**
   * When true, skip merchant auto-matching. The submitted `merchantId` and
   * `categoryId` are kept exactly as provided.
   */
  doNotAutoMatch?: boolean;
};

/**
 * Insert a batch of transactions for one user.
 *
 * This is the single implementation of bulk import, shared by the bearer-token
 * REST API (`POST /api/transactions`) and the MCP `create_transactions` tool.
 * Merchant matching runs once per batch against an in-memory merchant list, and
 * duplicates are skipped by the `(externalId, userId)` unique index.
 *
 * Uncategorized rows are queued for advisory AI suggestions; that is
 * best-effort and never blocks the import.
 */
export async function importTransactions(
  userId: string,
  transactions: TransactionImportInput[],
): Promise<{ count: number }> {
  // Load the user's merchants once and match all transactions in memory
  // instead of re-querying the full merchant list for each transaction.
  const userMerchants = await getUserMerchantsForMatching(userId);

  const transactionData = transactions.map((newTransaction) => {
    const normalized = {
      ...newTransaction,
      userId,
      date: new Date(newTransaction.date).toISOString().split("T")[0],
    };

    if (newTransaction.doNotAutoMatch) {
      return normalized;
    }

    const merchantRecord = findBestMatchingMerchant(
      userMerchants,
      newTransaction.transactionDetails,
    );

    return {
      ...normalized,
      merchantId: merchantRecord?.id,
      categoryId: merchantRecord?.recommendedCategoryId,
    };
  });

  const insertedTransactions = await db
    .insert(transaction)
    .values(transactionData)
    .onConflictDoNothing()
    .returning();

  // Queue AI category suggestions for newly inserted rows with no category.
  // Advisory only; the worker fills them in asynchronously.
  const uncategorizedIds = insertedTransactions
    .filter((row) => !row.categoryId)
    .map((row) => row.id);
  if (uncategorizedIds.length > 0) {
    try {
      await enqueueSuggestionJobs(uncategorizedIds, userId);
    } catch (error) {
      logger.warn("Failed to enqueue Jev suggestion jobs:", { error });
    }
  }

  return { count: insertedTransactions.length };
}
