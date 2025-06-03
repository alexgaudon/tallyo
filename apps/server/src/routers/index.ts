import { category, merchant, merchantKeyword, transaction } from "@/db/schema";
import { desc, eq } from "drizzle-orm";
import { z } from "zod";
import { db, healthCheck } from "../db";
import { protectedProcedure, publicProcedure } from "../lib/orpc";

import type { InferRouterOutputs } from "@orpc/server";

export type Category = InferRouterOutputs<
	typeof categoriesRouter
>["getUserCategories"]["categories"][number];

export type MerchantWithKeywordsAndCategory = InferRouterOutputs<
	typeof merchantsRouter
>["getUserMerchants"][number];

export type Transaction = InferRouterOutputs<
	typeof transactionsRouter
>["getUserTransactions"][number];

export const transactionsRouter = {
	getUserTransactions: protectedProcedure.handler(async ({ context }) => {
		const userTransactions = await db.query.transaction.findMany({
			where: eq(transaction.userId, context.session?.user?.id),
			with: {
				merchant: true,
				category: true,
			},
			orderBy: [desc(transaction.date), desc(transaction.amount)],
		});

		return userTransactions;
	}),
	updateTransactionCategory: protectedProcedure
		.input(
			z.object({
				id: z.string(),
				categoryId: z.string().nullable(),
			}),
		)
		.handler(async ({ context, input }) => {
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
					throw new Error("Transaction not found or update failed");
				}

				return {
					transaction: updatedTransaction[0],
				};
			} catch (error) {
				if (error instanceof Error) {
					throw new Error(`Failed to update transaction: ${error.message}`);
				}
				throw new Error(
					"An unexpected error occurred while updating transaction",
				);
			}
		}),
};

export const merchantsRouter = {
	getUserMerchants: protectedProcedure.handler(async ({ context }) => {
		const userMerchants = await db.query.merchant.findMany({
			where: eq(merchant.userId, context.session?.user?.id),
			with: {
				recommendedCategory: true,
				keywords: true,
			},
		});

		return userMerchants;
	}),
	createMerchant: protectedProcedure
		.input(
			z.object({
				name: z.string(),
				recommendedCategoryId: z.string().optional(),
				keywords: z.array(z.string()).optional(),
			}),
		)
		.handler(async ({ context, input }) => {
			try {
				const newMerchant = await db
					.insert(merchant)
					.values({
						name: input.name,
						userId: context.session?.user?.id,
						recommendedCategoryId: input.recommendedCategoryId,
					})
					.returning();

				if (!newMerchant || newMerchant.length === 0) {
					throw new Error("Failed to create merchant. Please try again.");
				}

				if (input.keywords && input.keywords.length > 0) {
					await db.insert(merchantKeyword).values({
						merchantId: newMerchant[0].id,
						userId: context.session?.user?.id,
						keywords: input.keywords.join(","),
					});
				}

				return {
					merchant: newMerchant[0],
				};
			} catch (error) {
				if (error instanceof Error) {
					throw new Error(`Failed to create merchant: ${error.message}`);
				}
				throw new Error("An unexpected error occurred while creating merchant");
			}
		}),
	updateMerchant: protectedProcedure
		.input(
			z.object({
				id: z.string(),
				name: z.string().optional(),
				recommendedCategoryId: z.string().optional(),
				keywords: z.array(z.string()).optional(),
			}),
		)
		.handler(async ({ context, input }) => {
			try {
				const { id, keywords, ...updateData } = input;
				const updatedMerchant = await db
					.update(merchant)
					.set({
						...updateData,
						updatedAt: new Date(),
					})
					.where(eq(merchant.id, id))
					.returning();

				if (!updatedMerchant || updatedMerchant.length === 0) {
					throw new Error("Merchant not found or update failed");
				}

				if (keywords !== undefined) {
					// Delete existing keywords
					await db
						.delete(merchantKeyword)
						.where(eq(merchantKeyword.merchantId, id));

					// Insert new keywords if any
					if (keywords.length > 0) {
						await db.insert(merchantKeyword).values({
							merchantId: id,
							userId: context.session?.user?.id,
							keywords: keywords.join(","),
						});
					}
				}

				return {
					merchant: updatedMerchant[0],
				};
			} catch (error) {
				if (error instanceof Error) {
					throw new Error(`Failed to update merchant: ${error.message}`);
				}
				throw new Error("An unexpected error occurred while updating merchant");
			}
		}),
	deleteMerchant: protectedProcedure
		.input(
			z.object({
				id: z.string(),
			}),
		)
		.handler(async ({ input }) => {
			try {
				const deletedMerchant = await db
					.delete(merchant)
					.where(eq(merchant.id, input.id))
					.returning();

				if (!deletedMerchant || deletedMerchant.length === 0) {
					throw new Error("Merchant not found or already deleted");
				}

				return {
					merchant: deletedMerchant[0],
				};
			} catch (error) {
				if (error instanceof Error) {
					throw new Error(`Failed to delete merchant: ${error.message}`);
				}
				throw new Error("An unexpected error occurred while deleting merchant");
			}
		}),
};

export const categoriesRouter = {
	getUserCategories: protectedProcedure.handler(async ({ context }) => {
		const userCategories = await db.query.category.findMany({
			where: eq(category.userId, context.session?.user?.id),
			with: {
				parentCategory: true,
			},
		});

		return {
			categories: userCategories,
		};
	}),
	deleteCategory: protectedProcedure
		.input(
			z.object({
				id: z.string(),
			}),
		)
		.handler(async ({ input }) => {
			try {
				const deletedCategory = await db
					.delete(category)
					.where(eq(category.id, input.id))
					.returning();

				if (!deletedCategory || deletedCategory.length === 0) {
					throw new Error("Category not found or already deleted");
				}

				return {
					category: deletedCategory[0],
				};
			} catch (error) {
				if (error instanceof Error) {
					throw new Error(`Failed to delete category: ${error.message}`);
				}
				throw new Error("An unexpected error occurred while deleting category");
			}
		}),
	createCategory: protectedProcedure
		.input(
			z.object({
				name: z.string(),
				parentCategoryId: z.string().nullable().optional(),
				icon: z.string().optional(),
				treatAsIncome: z.boolean().optional(),
				hideFromInsights: z.boolean().optional(),
			}),
		)
		.handler(async ({ context, input }) => {
			try {
				const newCategory = await db
					.insert(category)
					.values({
						name: input.name,
						userId: context.session.user.id,
						parentCategoryId: input.parentCategoryId,
						icon: input.icon,
						treatAsIncome: input.treatAsIncome,
						hideFromInsights: input.hideFromInsights,
					})
					.returning();

				if (!newCategory || newCategory.length === 0) {
					throw new Error("Failed to create category. Please try again.");
				}

				return {
					category: newCategory[0],
				};
			} catch (error) {
				if (error instanceof Error) {
					throw new Error(`Failed to create category: ${error.message}`);
				}
				throw new Error("An unexpected error occurred while creating category");
			}
		}),
	updateCategory: protectedProcedure
		.input(
			z.object({
				id: z.string(),
				name: z.string().optional(),
				parentCategoryId: z.string().nullable().optional(),
				icon: z.string().optional(),
				treatAsIncome: z.boolean().optional(),
				hideFromInsights: z.boolean().optional(),
			}),
		)
		.handler(async ({ context, input }) => {
			try {
				const { id, ...updateData } = input;
				const updatedCategory = await db
					.update(category)
					.set({
						...updateData,
						updatedAt: new Date(),
					})
					.where(eq(category.id, id))
					.returning();

				if (!updatedCategory || updatedCategory.length === 0) {
					throw new Error("Category not found or update failed");
				}

				return {
					category: updatedCategory[0],
				};
			} catch (error) {
				if (error instanceof Error) {
					throw new Error(`Failed to update category: ${error.message}`);
				}
				throw new Error("An unexpected error occurred while updating category");
			}
		}),
};

export const appRouter = {
	healthCheck: publicProcedure.handler(async () => {
		try {
			await healthCheck();
			return "OK";
		} catch (error) {
			throw new Error("DB Not OK");
		}
	}),
	privateData: protectedProcedure.handler(({ context }) => {
		return {
			message: "This is private",
			user: context.session?.user,
		};
	}),
	categories: categoriesRouter,
	merchants: merchantsRouter,
	transactions: transactionsRouter,
};

export type AppRouter = typeof appRouter;
