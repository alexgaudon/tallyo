import {
	and,
	desc,
	eq,
	gte,
	ilike,
	inArray,
	isNull,
	lte,
	or,
	sql,
} from "drizzle-orm";
import { z } from "zod";
import { category, merchant, merchantKeyword, transaction } from "@/db/schema";
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
	_errorContext: string,
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

					// Filter out transactions more than 10 days in the future
					const tenDaysFromNow = new Date();
					tenDaysFromNow.setDate(tenDaysFromNow.getDate() + 30);
					const maxDate = tenDaysFromNow.toISOString().split("T")[0];
					conditions.push(lte(transaction.date, maxDate));

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

	getTransactionReport: protectedProcedure
		.input(
			z.object({
				dateFrom: z
					.string()
					.regex(/^\d{4}-\d{2}-\d{2}$/, "Date must be in YYYY-MM-DD format")
					.optional(),
				dateTo: z
					.string()
					.regex(/^\d{4}-\d{2}-\d{2}$/, "Date must be in YYYY-MM-DD format")
					.optional(),
				categoryIds: z.array(z.string()).optional(),
				merchantIds: z.array(z.string()).optional(),
				amountMin: z.number().optional(),
				amountMax: z.number().optional(),
				reviewed: z.boolean().optional(),
				includeIncome: z.boolean().default(false),
			}),
		)
		.handler(async ({ input, context }) => {
			return withErrorHandling(
				async () => {
					const conditions = [
						eq(transaction.userId, context.session?.user?.id),
					];

					// Filter out transactions more than 10 days in the future
					const tenDaysFromNow = new Date();
					tenDaysFromNow.setDate(tenDaysFromNow.getDate() + 10);
					const maxDate = tenDaysFromNow.toISOString().split("T")[0];
					conditions.push(lte(transaction.date, maxDate));

					// Date range filters
					if (input.dateFrom) {
						conditions.push(gte(transaction.date, input.dateFrom));
					}
					if (input.dateTo) {
						conditions.push(lte(transaction.date, input.dateTo));
					}

					if (input.categoryIds && input.categoryIds.length > 0) {
						conditions.push(inArray(transaction.categoryId, input.categoryIds));
					}

					// Merchant filters
					if (input.merchantIds && input.merchantIds.length > 0) {
						conditions.push(inArray(transaction.merchantId, input.merchantIds));
					}

					// Amount range filters
					if (input.amountMin !== undefined) {
						conditions.push(gte(transaction.amount, input.amountMin));
					}
					if (input.amountMax !== undefined) {
						conditions.push(lte(transaction.amount, input.amountMax));
					}

					// Reviewed status filter
					if (input.reviewed !== undefined) {
						conditions.push(eq(transaction.reviewed, input.reviewed));
					}

					// Income/expense filter
					if (!input.includeIncome) {
						// Get transactions with expense categories
						const categorizedExpenseTransactions = await db
							.select({
								id: transaction.id,
								amount: transaction.amount,
								date: transaction.date,
								transactionDetails: transaction.transactionDetails,
								notes: transaction.notes,
								reviewed: transaction.reviewed,
								merchantId: transaction.merchantId,
								categoryId: transaction.categoryId,
							})
							.from(transaction)
							.innerJoin(category, eq(transaction.categoryId, category.id))
							.where(
								and(
									...conditions,
									eq(category.treatAsIncome, false),
									eq(category.hideFromInsights, false),
								),
							);

						// Get transactions without categories (assume they are expenses)
						const uncategorizedTransactions = await db
							.select({
								id: transaction.id,
								amount: transaction.amount,
								date: transaction.date,
								transactionDetails: transaction.transactionDetails,
								notes: transaction.notes,
								reviewed: transaction.reviewed,
								merchantId: transaction.merchantId,
								categoryId: transaction.categoryId,
							})
							.from(transaction)
							.where(and(...conditions, isNull(transaction.categoryId)));

						// Combine both sets of transactions
						const expenseTransactions = [
							...categorizedExpenseTransactions,
							...uncategorizedTransactions,
						].sort((a, b) => b.date.localeCompare(a.date));

						const totalAmount = expenseTransactions.reduce(
							(sum, t) => sum + Number(t.amount),
							0,
						);
						const totalCount = expenseTransactions.length;

						// Calculate monthly average if exactly one category and/or one merchant is selected
						let monthlyAverage: number | undefined;
						const hasExactlyOneCategory = input.categoryIds?.length === 1;
						const hasExactlyOneMerchant = input.merchantIds?.length === 1;
						const shouldCalculateMonthlyAverage =
							hasExactlyOneCategory || hasExactlyOneMerchant;

						if (
							shouldCalculateMonthlyAverage &&
							expenseTransactions.length > 0
						) {
							// Get the date range for monthly calculation
							const dates = expenseTransactions.map((t) => new Date(t.date));
							const minDate = new Date(
								Math.min(...dates.map((d) => d.getTime())),
							);
							const maxDate = new Date(
								Math.max(...dates.map((d) => d.getTime())),
							);

							// Calculate number of months in the range
							const monthsDiff =
								(maxDate.getFullYear() - minDate.getFullYear()) * 12 +
								(maxDate.getMonth() - minDate.getMonth()) +
								1;

							monthlyAverage = totalAmount / monthsDiff;
						}

						return {
							transactions: expenseTransactions,
							summary: {
								totalCount,
								totalAmount,
								averageAmount: totalCount > 0 ? totalAmount / totalCount : 0,
								monthlyAverage,
							},
						};
					}

					// Include all transactions (both income and expenses)
					const allTransactions = await db
						.select({
							id: transaction.id,
							amount: transaction.amount,
							date: transaction.date,
							transactionDetails: transaction.transactionDetails,
							notes: transaction.notes,
							reviewed: transaction.reviewed,
							merchantId: transaction.merchantId,
							categoryId: transaction.categoryId,
						})
						.from(transaction)
						.where(and(...conditions))
						.orderBy(desc(transaction.date));

					const totalAmount = allTransactions.reduce(
						(sum, t) => sum + Number(t.amount),
						0,
					);
					const totalCount = allTransactions.length;

					// Calculate monthly average if exactly one category and/or one merchant is selected
					let monthlyAverage: number | undefined;
					const hasExactlyOneCategory = input.categoryIds?.length === 1;
					const hasExactlyOneMerchant = input.merchantIds?.length === 1;
					const shouldCalculateMonthlyAverage =
						hasExactlyOneCategory || hasExactlyOneMerchant;

					if (shouldCalculateMonthlyAverage && allTransactions.length > 0) {
						// Get the date range for monthly calculation
						const dates = allTransactions.map((t) => new Date(t.date));
						const minDate = new Date(
							Math.min(...dates.map((d) => d.getTime())),
						);
						const maxDate = new Date(
							Math.max(...dates.map((d) => d.getTime())),
						);

						// Calculate number of months in the range
						const monthsDiff =
							(maxDate.getFullYear() - minDate.getFullYear()) * 12 +
							(maxDate.getMonth() - minDate.getMonth()) +
							1;

						monthlyAverage = totalAmount / monthsDiff;
					}

					return {
						transactions: allTransactions,
						summary: {
							totalCount,
							totalAmount,
							averageAmount: totalCount > 0 ? totalAmount / totalCount : 0,
							monthlyAverage,
						},
					};
				},
				"Error generating transaction report",
				context.session?.user?.id,
			);
		}),

	splitTransaction: protectedProcedure
		.input(
			z.object({
				id: z.string(),
				months: z.number().min(2).max(60),
			}),
		)
		.handler(async ({ input, context }) => {
			return withErrorHandling(
				async () => {
					// Validate transaction ownership
					const originalTransaction = await validateTransactionOwnership(
						input.id,
						context.session?.user?.id,
					);

					// Check if transaction is already part of a split
					if (originalTransaction.splitGroupId) {
						throw new Error("Transaction is already part of a split");
					}

					// Validate that merchant and category are assigned
					if (!originalTransaction.merchantId) {
						throw new Error(
							"Transaction must have a merchant assigned before splitting",
						);
					}

					if (!originalTransaction.categoryId) {
						throw new Error(
							"Transaction must have a category assigned before splitting",
						);
					}

					// Calculate split amounts with accurate division
					const totalAmount = Math.abs(originalTransaction.amount);
					const baseAmount = Math.floor(totalAmount / input.months);
					const remainder = totalAmount % input.months;

					// Create split amounts array - distribute remainder across first transactions
					const splitAmounts: number[] = [];
					for (let i = 0; i < input.months; i++) {
						const amount = baseAmount + (i < remainder ? 1 : 0);
						// Preserve the sign of the original amount
						splitAmounts.push(
							originalTransaction.amount < 0 ? -amount : amount,
						);
					}

					// Generate split group ID
					const splitGroupId = Bun.randomUUIDv7();

					// Get the original transaction date
					const originalDate = new Date(originalTransaction.date);

					// Create split transactions
					const splitTransactions = [];
					for (let i = 0; i < input.months; i++) {
						// Calculate date for this split (first of each month)
						const splitDate = new Date(
							originalDate.getFullYear(),
							originalDate.getMonth() + i,
							1,
						);

						const splitTransaction = {
							userId: originalTransaction.userId,
							merchantId: originalTransaction.merchantId,
							categoryId: originalTransaction.categoryId,
							amount: splitAmounts[i],
							date: splitDate.toISOString().split("T")[0],
							transactionDetails: `${originalTransaction.transactionDetails} (Split ${i + 1}/${input.months})`,
							notes: originalTransaction.notes,
							reviewed: false, // Split transactions need to be reviewed again
							splitGroupId,
							splitIndex: i + 1,
							splitTotal: input.months,
							originalAmount: originalTransaction.amount,
						};

						splitTransactions.push(splitTransaction);
					}

					// Insert all split transactions
					const createdTransactions = await db
						.insert(transaction)
						.values(splitTransactions)
						.returning();

					// Delete the original transaction
					await db.delete(transaction).where(eq(transaction.id, input.id));

					// Return the created split transactions with relations
					const splitTransactionsWithRelations = await Promise.all(
						createdTransactions.map(
							async (t) => await getTransactionWithRelations(t.id),
						),
					);

					return {
						splitTransactions: splitTransactionsWithRelations,
						splitGroupId,
					};
				},
				"Error splitting transaction",
				context.session?.user?.id,
			);
		}),
};
