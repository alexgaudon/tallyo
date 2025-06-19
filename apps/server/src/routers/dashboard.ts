import { db } from "@/db";
import { category, merchant, merchantKeyword, transaction } from "@/db/schema";
import { count, eq } from "drizzle-orm";
import { protectedProcedure } from "../lib/orpc";

export const dashboardRouter = {
	getStatsCounts: protectedProcedure.handler(async ({ context }) => {
		const [
			transactionCount,
			categoryCount,
			merchantCount,
			merchantKeywordCount,
		] = await Promise.allSettled([
			db
				.select({
					count: count(),
				})
				.from(transaction)
				.where(eq(transaction.userId, context.session.user.id)),
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
			},
		};
	}),
};
