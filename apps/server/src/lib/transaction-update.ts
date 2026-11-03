import { and, eq } from "drizzle-orm";
import { db } from "@/db";
import { category, merchant } from "@/db/schema";
import {
  getTransactionWithRelations,
  handleKeywordAddition,
  handleKeywordRemoval,
  updateTransactionField,
  validateTransactionOwnership,
} from "@/routers/transactions";

/** Fields an update may change. `undefined` means "leave alone". */
export type TransactionPatch = {
  reviewed?: boolean;
  merchantId?: string | null;
  categoryId?: string | null;
  notes?: string | null;
};

/** An update failure that maps directly to an HTTP status code. */
export class TransactionUpdateError extends Error {
  status: 400 | 403 | 404;

  constructor(message: string, status: 400 | 403 | 404) {
    super(message);
    this.name = "TransactionUpdateError";
    this.status = status;
  }
}

/**
 * Apply a partial update to one transaction.
 *
 * This is the single implementation of transaction editing, shared by the
 * bearer-token REST API (`PATCH /api/transactions/:id`) and the MCP
 * `update_transaction` tool. It preserves the product invariants:
 *
 * - assigning a merchant also applies that merchant's recommended category
 *   unless a category is provided in the same patch;
 * - changing merchants learns and forgets merchant keywords, exactly like the
 *   web UI;
 * - marking a transaction reviewed requires both a merchant and a category.
 */
export async function applyTransactionUpdate(
  userId: string,
  transactionId: string,
  patch: TransactionPatch,
): Promise<
  NonNullable<Awaited<ReturnType<typeof getTransactionWithRelations>>>
> {
  const { reviewed, merchantId, categoryId, notes } = patch;

  let currentTransaction: Awaited<
    ReturnType<typeof validateTransactionOwnership>
  >;
  try {
    currentTransaction = await validateTransactionOwnership(
      transactionId,
      userId,
    );
  } catch (error) {
    if (error instanceof Error && error.message === "Transaction not found") {
      throw new TransactionUpdateError(error.message, 404);
    }
    if (
      error instanceof Error &&
      error.message === "Unauthorized to update this transaction"
    ) {
      throw new TransactionUpdateError(error.message, 403);
    }
    throw error;
  }

  if (merchantId) {
    const merchantRecord = await db.query.merchant.findFirst({
      where: and(eq(merchant.id, merchantId), eq(merchant.userId, userId)),
    });
    if (!merchantRecord) {
      throw new TransactionUpdateError("Merchant not found", 404);
    }
  }

  if (categoryId) {
    const categoryRecord = await db.query.category.findFirst({
      where: and(eq(category.id, categoryId), eq(category.userId, userId)),
    });
    if (!categoryRecord) {
      throw new TransactionUpdateError("Category not found", 404);
    }
  }

  let effectiveMerchantId = currentTransaction.merchantId;
  let effectiveCategoryId = currentTransaction.categoryId;

  if (merchantId !== undefined) {
    effectiveMerchantId = merchantId;
    if (categoryId === undefined) {
      const newMerchantRecord = merchantId
        ? await db.query.merchant.findFirst({
            where: eq(merchant.id, merchantId),
          })
        : null;
      effectiveCategoryId = newMerchantRecord?.recommendedCategoryId ?? null;
    }
  }

  if (categoryId !== undefined) {
    effectiveCategoryId = categoryId;
  }

  if (reviewed === true) {
    if (!effectiveMerchantId && !effectiveCategoryId) {
      throw new TransactionUpdateError(
        "Assign a category and merchant before reviewing",
        400,
      );
    }
    if (!effectiveCategoryId) {
      throw new TransactionUpdateError(
        "Assign a category before reviewing",
        400,
      );
    }
    if (!effectiveMerchantId) {
      throw new TransactionUpdateError(
        "Assign a merchant before reviewing",
        400,
      );
    }
  }

  const updates: Record<string, unknown> = {};

  if (reviewed !== undefined) {
    updates.reviewed = reviewed;
  }

  if (notes !== undefined) {
    updates.notes = notes;
  }

  if (merchantId !== undefined) {
    if (
      currentTransaction.merchantId &&
      currentTransaction.merchantId !== merchantId
    ) {
      await handleKeywordRemoval(
        currentTransaction,
        currentTransaction.merchantId,
        transactionId,
      );
    }

    const newMerchantRecord = merchantId
      ? await db.query.merchant.findFirst({
          where: eq(merchant.id, merchantId),
          with: { keywords: true },
        })
      : null;

    updates.merchantId = merchantId;

    if (categoryId === undefined) {
      updates.categoryId = newMerchantRecord?.recommendedCategoryId ?? null;
    } else {
      updates.categoryId = categoryId;
    }

    await updateTransactionField(
      transactionId,
      updates,
      "updating transaction",
      userId,
    );

    if (merchantId) {
      await handleKeywordAddition(currentTransaction, merchantId, userId);
    }
  } else if (Object.keys(updates).length > 0 || categoryId !== undefined) {
    if (categoryId !== undefined) {
      updates.categoryId = categoryId;
    }

    await updateTransactionField(
      transactionId,
      updates,
      "updating transaction",
      userId,
    );
  }

  const updatedTransaction = await getTransactionWithRelations(transactionId);
  if (!updatedTransaction) {
    throw new TransactionUpdateError("Transaction not found", 404);
  }

  return updatedTransaction;
}
