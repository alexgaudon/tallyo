import { merchant, merchantKeyword, transaction } from "@/db/schema";
import { and, desc, eq, ilike, isNull, or, sql } from "drizzle-orm";
import { z } from "zod";
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

const getTransactionWithRelations = async (transactionId: string) => {
	return await db.query.transaction.findFirst({
		where: eq(transaction.id, transactionId),
		with: {
			merchant: true,
			category: {
				with: {
					parentCategory: true,
				},
			},
		},
	});
};

const validateTransactionOwnership = async (
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

const updateTransactionField = async (
	transactionId: string,
	updates: Record<string, unknown>,
	errorContext: string,
	userId: string,
) => {
	const updatedTransaction = await db
		.update(transaction)
		.set({
			...updates,
			updatedAt: new Date(),
		})
		.where(eq(transaction.id, transactionId))
		.returning();

	if (!updatedTransaction || updatedTransaction.length === 0) {
		logger.error(
			`Transaction ${transactionId} not found or update failed for user ${userId}`,
		);
		throw new Error("Transaction not found or update failed");
	}

	return updatedTransaction[0];
};

const handleKeywordRemoval = async (
	currentTransaction: { transactionDetails: string },
	currentMerchantId: string,
	transactionId: string,
) => {
	if (!currentMerchantId) return;

	const currentMerchant = await db.query.merchant.findFirst({
		where: eq(merchant.id, currentMerchantId),
		with: { keywords: true },
	});

	if (!currentMerchant) return;

	const matchingKeyword = currentMerchant.keywords.find(
		(keyword) => keyword.keyword === currentTransaction.transactionDetails,
	);

	if (matchingKeyword) {
		logger.info(
			`Removing keyword "${matchingKeyword.keyword}" from merchant ${currentMerchant.name}`,
			{ keyword: matchingKeyword.keyword, merchantId: currentMerchant.id },
		);

		await db
			.delete(merchantKeyword)
			.where(eq(merchantKeyword.id, matchingKeyword.id));
	}
};

const handleKeywordAddition = async (
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

export const transactionsRouter = {
	createTransaction: protectedProcedure
		.input(
			z.object({
				amount: z.number().int(),
				date: z.date(),
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
							date: input.date.toISOString().split("T")[0],
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

					const createdTransaction = await getTransactionWithRelations(
						newTransaction[0].id,
					);
					return { transaction: createdTransaction };
				},
				"Error creating transaction",
				context.session?.user?.id,
			);
		}),

	getUserTransactions: protectedProcedure
		.input(
			z.object({
				page: z.number().min(1).default(1),
				pageSize: z.number().min(1).max(100).default(10),
				category: z.string().optional(),
				filter: z.string().optional(),
				merchant: z.string().optional(),
				onlyWithoutMerchant: z.boolean().optional(),
				onlyUnreviewed: z.boolean().optional(),
			}),
		)
		.handler(async ({ input, context }) => {
			return withErrorHandling(
				async () => {
					const conditions = [];

					if (input.category)
						conditions.push(eq(transaction.categoryId, input.category));
					if (input.merchant)
						conditions.push(eq(transaction.merchantId, input.merchant));
					if (input.onlyUnreviewed)
						conditions.push(eq(transaction.reviewed, false));
					if (input.onlyWithoutMerchant) {
						conditions.push(
							or(
								isNull(transaction.merchantId),
								eq(transaction.merchantId, ""),
							),
						);
					}
					if (input.filter) {
						conditions.push(
							or(
								ilike(transaction.transactionDetails, `%${input.filter}%`),
								ilike(transaction.notes, `%${input.filter}%`),
								ilike(transaction.id, `%${input.filter}%`),
							),
						);
					}

					const baseConditions = and(
						eq(transaction.userId, context.session?.user?.id),
						...conditions,
					);

					const [{ count }] = await db
						.select({ count: sql<number>`count(*)` })
						.from(transaction)
						.leftJoin(merchant, eq(transaction.merchantId, merchant.id))
						.where(and(baseConditions));

					const userTransactions = await db.query.transaction.findMany({
						where: and(baseConditions),
						with: {
							merchant: true,
							category: { with: { parentCategory: true } },
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
				},
				"Error fetching transactions",
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
		.handler(async ({ input }) => {
			return withErrorHandling(async () => {
				const deletedTransaction = await db
					.delete(transaction)
					.where(eq(transaction.id, input.id))
					.returning();

				if (!deletedTransaction || deletedTransaction.length === 0) {
					throw new Error("Transaction not found");
				}

				return { success: true };
			}, "Error deleting transaction");
		}),
};
