import { transaction } from "@/db/schema";
import { desc, eq, sql } from "drizzle-orm";
import { z } from "zod";
import { db } from "../db";
import { logger } from "../lib/logger";
import { protectedProcedure } from "../lib/orpc";

export const transactionsRouter = {
	getUserTransactions: protectedProcedure
		.input(
			z.object({
				page: z.number().min(1).default(1),
				pageSize: z.number().min(1).max(100).default(10),
			}),
		)
		.handler(async ({ input, context }) => {
			try {
				const [{ count }] = await db
					.select({ count: sql<number>`count(*)` })
					.from(transaction)
					.where(eq(transaction.userId, context.session?.user?.id));

				const userTransactions = await db.query.transaction.findMany({
					where: eq(transaction.userId, context.session?.user?.id),
					with: {
						merchant: true,
						category: true,
					},
					orderBy: [desc(transaction.date), desc(transaction.amount)],
					limit: input.pageSize,
					offset: (input.page - 1) * input.pageSize,
				});

				return {
					transactions: userTransactions,
					pagination: {
						total: count,
						page: input.page,
						pageSize: input.pageSize,
						totalPages: Math.ceil(count / input.pageSize),
					},
				};
			} catch (error) {
				logger.error(
					`Error fetching transactions for user ${context.session?.user?.id}:`,
					{ error },
				);
				throw error;
			}
		}),
	updateTransactionCategory: protectedProcedure
		.input(
			z.object({
				id: z.string(),
				categoryId: z.string().nullable(),
			}),
		)
		.handler(async ({ input, context }) => {
			try {
				const updatedTransaction = await db
					.update(transaction)
					.set({
						categoryId: input.categoryId,
						updatedAt: new Date(),
					})
					.where(eq(transaction.id, input.id))
					.returning();

				if (!updatedTransaction || updatedTransaction.length === 0) {
					logger.error(
						`Transaction ${input.id} not found or update failed for user ${context.session?.user?.id}`,
					);
					throw new Error("Transaction not found or update failed");
				}

				return {
					transaction: updatedTransaction[0],
				};
			} catch (error) {
				logger.error(`Error updating transaction ${input.id}:`, { error });
				if (error instanceof Error) {
					throw new Error(`Failed to update transaction: ${error.message}`);
				}
				throw new Error(
					"An unexpected error occurred while updating transaction",
				);
			}
		}),
	updateTransactionMerchant: protectedProcedure
		.input(
			z.object({
				id: z.string(),
				merchantId: z.string().nullable(),
			}),
		)
		.handler(async ({ input, context }) => {
			try {
				const updatedTransaction = await db
					.update(transaction)
					.set({
						merchantId: input.merchantId,
						updatedAt: new Date(),
					})
					.where(eq(transaction.id, input.id))
					.returning();

				if (!updatedTransaction || updatedTransaction.length === 0) {
					logger.error(
						`Transaction ${input.id} not found or update failed for user ${context.session?.user?.id}`,
					);
					throw new Error("Transaction not found or update failed");
				}

				return {
					transaction: updatedTransaction[0],
				};
			} catch (error) {
				logger.error(`Error updating transaction ${input.id}:`, { error });
				if (error instanceof Error) {
					throw new Error(`Failed to update transaction: ${error.message}`);
				}
				throw new Error(
					"An unexpected error occurred while updating transaction",
				);
			}
		}),
	toggleTransactionReviewed: protectedProcedure
		.input(
			z.object({
				id: z.string(),
			}),
		)
		.handler(async ({ input, context }) => {
			try {
				const currentTransaction = await db.query.transaction.findFirst({
					where: eq(transaction.id, input.id),
				});

				if (!currentTransaction) {
					throw new Error("Transaction not found");
				}

				if (currentTransaction.userId !== context.session?.user?.id) {
					throw new Error("Unauthorized to update this transaction");
				}

				const updatedTransaction = await db
					.update(transaction)
					.set({
						reviewed: !currentTransaction.reviewed,
						updatedAt: new Date(),
					})
					.where(eq(transaction.id, input.id))
					.returning();

				if (!updatedTransaction || updatedTransaction.length === 0) {
					logger.error(
						`Transaction ${input.id} not found or update failed for user ${context.session?.user?.id}`,
					);
					throw new Error("Transaction not found or update failed");
				}

				return {
					transaction: updatedTransaction[0],
				};
			} catch (error) {
				logger.error(
					`Error toggling reviewed status for transaction ${input.id}:`,
					{ error },
				);
				if (error instanceof Error) {
					throw new Error(`Failed to update transaction: ${error.message}`);
				}
				throw new Error(
					"An unexpected error occurred while updating transaction",
				);
			}
		}),
	updateTransactionNotes: protectedProcedure
		.input(
			z.object({
				id: z.string(),
				notes: z.string().nullable(),
			}),
		)
		.handler(async ({ input, context }) => {
			try {
				const updatedTransaction = await db
					.update(transaction)
					.set({
						notes: input.notes,
						updatedAt: new Date(),
					})
					.where(eq(transaction.id, input.id))
					.returning();

				if (!updatedTransaction || updatedTransaction.length === 0) {
					logger.error(
						`Transaction ${input.id} not found or update failed for user ${context.session?.user?.id}`,
					);
					throw new Error("Transaction not found or update failed");
				}

				return {
					transaction: updatedTransaction[0],
				};
			} catch (error) {
				logger.error(`Error updating transaction notes for ${input.id}:`, {
					error,
				});
				if (error instanceof Error) {
					throw new Error(
						`Failed to update transaction notes: ${error.message}`,
					);
				}
				throw new Error(
					"An unexpected error occurred while updating transaction notes",
				);
			}
		}),
};
