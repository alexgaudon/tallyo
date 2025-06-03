import { transaction } from "@/db/schema";
import { desc, eq } from "drizzle-orm";
import { z } from "zod";
import { db } from "../db";
import { logger } from "../lib/logger";
import { protectedProcedure } from "../lib/orpc";

export const transactionsRouter = {
	getUserTransactions: protectedProcedure.handler(async ({ context }) => {
		try {
			const userTransactions = await db.query.transaction.findMany({
				where: eq(transaction.userId, context.session?.user?.id),
				with: {
					merchant: true,
					category: true,
				},
				orderBy: [desc(transaction.date), desc(transaction.amount)],
			});

			return userTransactions;
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
};
