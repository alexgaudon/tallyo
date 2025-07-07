import { merchant, merchantKeyword, transaction } from "@/db/schema";
import { and, desc, eq, ilike, isNull, or, sql } from "drizzle-orm";
import { z } from "zod";
import { db } from "../db";
import { logger } from "../lib/logger";
import { protectedProcedure } from "../lib/orpc";
import { getMerchantFromVendor } from "./merchants";

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
			try {
				const merchantRecord = await getMerchantFromVendor(
					input.transactionDetails,
					context.session?.user?.id,
				);

				const newTransaction = await db
					.insert(transaction)
					.values({
						userId: context.session?.user?.id,
						amount: input.amount,
						date: input.date.toISOString().split("T")[0], // Convert Date to YYYY-MM-DD string
						transactionDetails: input.transactionDetails,
						merchantId: input.merchantId || merchantRecord?.id,
						categoryId:
							input.categoryId || merchantRecord?.recommendedCategoryId,
						notes: input.notes,
					})
					.returning();

				if (!newTransaction || newTransaction.length === 0) {
					logger.error(
						`Failed to create transaction for user ${context.session?.user?.id}`,
					);
					throw new Error("Failed to create transaction");
				}

				// Fetch the created transaction with relations
				const createdTransaction = await db.query.transaction.findFirst({
					where: eq(transaction.id, newTransaction[0].id),
					with: {
						merchant: true,
						category: {
							with: {
								parentCategory: true,
							},
						},
					},
				});

				return {
					transaction: createdTransaction,
				};
			} catch (error) {
				logger.error(
					`Error creating transaction for user ${context.session?.user?.id}:`,
					{ error },
				);
				if (error instanceof Error) {
					throw new Error(`Failed to create transaction: ${error.message}`);
				}
				throw new Error(
					"An unexpected error occurred while creating transaction",
				);
			}
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
			try {
				const conditions = [];

				if (input.category) {
					conditions.push(eq(transaction.categoryId, input.category));
				}

				if (input.merchant) {
					conditions.push(eq(transaction.merchantId, input.merchant));
				}

				if (input.onlyUnreviewed) {
					conditions.push(eq(transaction.reviewed, false));
				}

				if (input.onlyWithoutMerchant) {
					conditions.push(
						or(isNull(transaction.merchantId), eq(transaction.merchantId, "")),
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
						category: {
							with: {
								parentCategory: true,
							},
						},
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
				console.error(error);
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
				logger.info(
					`Starting merchant update for transaction ${input.id} with merchantId: ${input.merchantId}`,
					{ userId: context.session?.user?.id },
				);

				const updatedTransaction = await db
					.update(transaction)
					.set({
						merchantId: input.merchantId,
						updatedAt: new Date(),
					})
					.where(eq(transaction.id, input.id))
					.returning();

				logger.info(
					`Successfully updated transaction ${input.id} with merchantId: ${input.merchantId}`,
				);

				if (input.merchantId) {
					logger.info(
						`Merchant ID provided (${input.merchantId}), checking for keyword processing`,
					);

					const merchantRecord = await db.query.merchant.findFirst({
						where: eq(merchant.id, input.merchantId),
						with: {
							keywords: true,
						},
					});

					if (merchantRecord) {
						logger.info(
							`Found merchant record for ${merchantRecord.name} with ${merchantRecord.keywords.length} existing keywords`,
							{
								merchantId: merchantRecord.id,
								existingKeywords: merchantRecord.keywords.map((k) => k.keyword),
							},
						);

						const transactionRecord = await db.query.transaction.findFirst({
							where: eq(transaction.id, input.id),
						});

						if (transactionRecord && merchantRecord.keywords.length > 0) {
							const description =
								transactionRecord.transactionDetails.toLowerCase();

							logger.info(
								"Processing transaction description for keyword matching",
								{
									transactionId: transactionRecord.id,
									description: transactionRecord.transactionDetails,
									descriptionLower: description,
								},
							);

							let keywordMatchFound = false;
							for (const keywordRecord of merchantRecord.keywords) {
								const keywordLower = keywordRecord.keyword.toLowerCase();
								logger.debug(
									`Checking if description contains keyword: "${keywordRecord.keyword}"`,
									{
										keyword: keywordRecord.keyword,
										keywordLower,
										descriptionContains: description.includes(keywordLower),
									},
								);

								if (description.includes(keywordLower)) {
									logger.info(
										`Found matching keyword "${keywordRecord.keyword}" in transaction description`,
										{
											keyword: keywordRecord.keyword,
											transactionDescription:
												transactionRecord.transactionDetails,
										},
									);
									keywordMatchFound = true;
									break;
								}
							}

							if (!keywordMatchFound) {
								logger.info(
									"No existing keywords match transaction description, attempting to add new keyword",
									{
										transactionDescription:
											transactionRecord.transactionDetails,
										merchantId: merchantRecord.id,
										merchantName: merchantRecord.name,
									},
								);

								try {
									await db.insert(merchantKeyword).values({
										keyword: transactionRecord.transactionDetails,
										merchantId: merchantRecord.id,
										userId: context.session?.user?.id,
										createdAt: new Date(),
										updatedAt: new Date(),
									});

									logger.info(
										`Successfully added new keyword "${transactionRecord.transactionDetails}" for merchant ${merchantRecord.name}`,
										{
											newKeyword: transactionRecord.transactionDetails,
											merchantId: merchantRecord.id,
											merchantName: merchantRecord.name,
										},
									);
								} catch (error) {
									logger.warn(
										`Failed to add keyword "${transactionRecord.transactionDetails}" for merchant ${merchantRecord.name}`,
										{
											error,
											keyword: transactionRecord.transactionDetails,
											merchantId: merchantRecord.id,
											merchantName: merchantRecord.name,
										},
									);
									// Keyword might already exist, ignore the error
								}
							} else {
								logger.info(
									"Skipping keyword addition - existing keyword already matches transaction description",
								);
							}
						} else {
							if (!transactionRecord) {
								logger.warn(
									`Transaction record not found for ID ${input.id} during keyword processing`,
								);
							}
							if (merchantRecord.keywords.length === 0) {
								logger.info(
									`Merchant ${merchantRecord.name} has no existing keywords, skipping keyword processing`,
									{ merchantId: merchantRecord.id },
								);
							}
						}
					} else {
						logger.warn(
							`Merchant record not found for ID ${input.merchantId} during keyword processing`,
						);
					}
				} else {
					logger.info(
						`No merchant ID provided, skipping keyword processing for transaction ${input.id}`,
					);
				}

				if (!updatedTransaction || updatedTransaction.length === 0) {
					logger.error(
						`Transaction ${input.id} not found or update failed for user ${context.session?.user?.id}`,
					);
					throw new Error("Transaction not found or update failed");
				}

				logger.info(
					`Successfully completed merchant update for transaction ${input.id}`,
					{
						transactionId: input.id,
						merchantId: input.merchantId,
						userId: context.session?.user?.id,
					},
				);

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
	deleteTransaction: protectedProcedure
		.input(z.object({ id: z.string() }))
		.handler(async ({ input }) => {
			try {
				const deletedTransaction = await db
					.delete(transaction)
					.where(eq(transaction.id, input.id))
					.returning();

				if (!deletedTransaction || deletedTransaction.length === 0) {
					logger.error(`Transaction ${input.id} not found`);
					throw new Error("Transaction not found");
				}

				return {
					success: true,
				};
			} catch (error) {
				logger.error(`Error deleting transaction ${input.id}:`, { error });
				if (error instanceof Error) {
					throw new Error(`Failed to delete transaction: ${error.message}`);
				}
				throw new Error(
					"An unexpected error occurred while deleting transaction",
				);
			}
		}),
};
