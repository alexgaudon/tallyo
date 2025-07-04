import { db } from "@/db";
import { category, merchant, merchantKeyword, transaction } from "@/db/schema";
import { and, count, eq, gte, inArray, lte, sum } from "drizzle-orm";
import { z } from "zod";
import { protectedProcedure } from "../lib/orpc";
import { formatCurrency } from "../utils";

const dateRangeSchema = z.object({
	from: z.date().optional(),
	to: z.date().optional(),
});

export const dashboardRouter = {
	getCategoryData: protectedProcedure
		.input(dateRangeSchema.optional())
		.handler(async ({ context, input }) => {
			const dateRange = input || {};

			const categoryData = await db
				.select({
					amount: sum(transaction.amount),
					count: count(),
					category: {
						id: category.id,
						name: category.name,
						userId: category.userId,
						parentCategoryId: category.parentCategoryId,
						icon: category.icon,
						treatAsIncome: category.treatAsIncome,
						hideFromInsights: category.hideFromInsights,
						createdAt: category.createdAt,
						updatedAt: category.updatedAt,
					},
				})
				.from(transaction)
				.innerJoin(category, eq(transaction.categoryId, category.id))
				.where(
					and(
						eq(transaction.userId, context.session.user.id),
						eq(transaction.reviewed, true),
						...(dateRange.from ? [gte(transaction.date, dateRange.from)] : []),
						...(dateRange.to ? [lte(transaction.date, dateRange.to)] : []),
					),
				)
				.groupBy(
					category.id,
					category.name,
					category.userId,
					category.parentCategoryId,
					category.icon,
					category.treatAsIncome,
					category.hideFromInsights,
					category.createdAt,
					category.updatedAt,
				);

			// Fetch parent categories for categories that have them
			const parentCategoryIds = categoryData
				.map((item) => item.category.parentCategoryId)
				.filter(Boolean) as string[];

			const parentCategories =
				parentCategoryIds.length > 0
					? await db
							.select({
								id: category.id,
								name: category.name,
								userId: category.userId,
								parentCategoryId: category.parentCategoryId,
								icon: category.icon,
								treatAsIncome: category.treatAsIncome,
								hideFromInsights: category.hideFromInsights,
								createdAt: category.createdAt,
								updatedAt: category.updatedAt,
							})
							.from(category)
							.where(
								and(
									eq(category.userId, context.session.user.id),
									inArray(category.id, parentCategoryIds),
								),
							)
					: [];

			// Create a map of parent categories for quick lookup
			const parentCategoryMap = new Map(
				parentCategories.map((parent) => [parent.id, parent]),
			);

			// Transform the data to include parent category information
			const transformedData = categoryData.map((item) => ({
				amount: item.amount,
				count: item.count,
				category: {
					...item.category,
					parentCategory: item.category.parentCategoryId
						? parentCategoryMap.get(item.category.parentCategoryId) || null
						: null,
				},
			}));

			return transformedData;
		}),
	getStatsCounts: protectedProcedure
		.input(dateRangeSchema.optional())
		.handler(async ({ context, input }) => {
			const dateRange = input || {};

			const [
				transactionCount,
				categoryCount,
				merchantCount,
				merchantKeywordCount,
				expenseCount,
				incomeCount,
			] = await Promise.allSettled([
				db
					.select({
						count: count(),
					})
					.from(transaction)
					.where(
						and(
							eq(transaction.userId, context.session.user.id),
							...(dateRange.from
								? [gte(transaction.date, dateRange.from)]
								: []),
							...(dateRange.to ? [lte(transaction.date, dateRange.to)] : []),
						),
					),
				db
					.select({
						count: count(),
					})
					.from(category)
					.where(eq(category.userId, context.session.user.id)),
				db
					.select({
						count: count(),
					})
					.from(merchant)
					.where(eq(merchant.userId, context.session.user.id)),
				db
					.select({
						count: count(),
					})
					.from(merchantKeyword)
					.where(eq(merchantKeyword.userId, context.session.user.id)),
				db
					.select({
						amount: sum(transaction.amount),
					})
					.from(transaction)
					.innerJoin(category, eq(transaction.categoryId, category.id))
					.where(
						and(
							eq(transaction.userId, context.session.user.id),
							eq(category.treatAsIncome, false),
							eq(category.hideFromInsights, false),
							eq(transaction.reviewed, true),
							...(dateRange.from
								? [gte(transaction.date, dateRange.from)]
								: []),
							...(dateRange.to ? [lte(transaction.date, dateRange.to)] : []),
						),
					),
				db
					.select({
						amount: sum(transaction.amount),
					})
					.from(transaction)
					.innerJoin(category, eq(transaction.categoryId, category.id))
					.where(
						and(
							eq(transaction.userId, context.session.user.id),
							eq(category.treatAsIncome, true),
							eq(category.hideFromInsights, false),
							eq(transaction.reviewed, true),
							...(dateRange.from
								? [gte(transaction.date, dateRange.from)]
								: []),
							...(dateRange.to ? [lte(transaction.date, dateRange.to)] : []),
						),
					),
			]);

			return {
				stats: {
					totalTransactions:
						transactionCount.status === "fulfilled"
							? transactionCount.value[0].count
							: 0,
					totalCategories:
						categoryCount.status === "fulfilled"
							? categoryCount.value[0].count
							: 0,
					totalMerchants:
						merchantCount.status === "fulfilled"
							? merchantCount.value[0].count
							: 0,
					totalMerchantKeywords:
						merchantKeywordCount.status === "fulfilled"
							? merchantKeywordCount.value[0].count
							: 0,
					totalExpenses:
						expenseCount.status === "fulfilled" && expenseCount.value[0].amount
							? formatCurrency(Number(expenseCount.value[0].amount))
							: formatCurrency(0),
					totalIncome:
						incomeCount.status === "fulfilled" && incomeCount.value[0].amount
							? formatCurrency(Number(incomeCount.value[0].amount))
							: formatCurrency(0),
				},
			};
		}),
};
