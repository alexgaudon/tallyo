import { addDays, format } from "date-fns";
import { and, asc, count, desc, eq, lte } from "drizzle-orm";
import { db } from "@/db";
import { account, category, merchant, transaction, user } from "@/db/schema";
import { protectedProcedure } from "../lib/orpc";

export const metaRouter = {
	isOauthUserOrEmailUser: protectedProcedure.handler(async ({ context }) => {
		const userAccount = await db.query.account.findFirst({
			where: eq(account.userId, context.session?.user?.id),
		});

		// Check if user has a password (email/password authentication)
		const hasPassword =
			userAccount?.password !== null && userAccount?.password !== undefined;

		return {
			isOauthUser: !hasPassword,
			isEmailUser: hasPassword,
		};
	}),
	getUserMeta: protectedProcedure.handler(async ({ context }) => {
		const topFiveCategories = await db.query.category.findMany({
			where: eq(category.userId, context.session?.user?.id),
			orderBy: [desc(category.name)],
			limit: 5,
		});

		const topFiveMerchants = await db.query.merchant.findMany({
			where: eq(merchant.userId, context.session?.user?.id),
			orderBy: [desc(merchant.name)],
			limit: 5,
		});

		const userCreatedAt = await db.query.user.findFirst({
			where: eq(user.id, context.session?.user?.id),
			columns: {
				createdAt: true,
			},
		});

		const earliestTransactionDate = await db.query.transaction.findFirst({
			where: eq(transaction.userId, context.session?.user?.id),
			orderBy: [asc(transaction.date)],
			columns: {
				date: true,
			},
		});

		const transferCategoryId = await db.query.category.findFirst({
			where: and(
				eq(category.userId, context.session?.user?.id),
				eq(category.hideFromInsights, true),
				eq(category.name, "Transfer"),
			),
		});

		const unreviewedTransactionCount = await db
			.select({ count: count() })
			.from(transaction)
			.where(
				and(
					eq(transaction.userId, context.session?.user?.id),
					eq(transaction.reviewed, false),
					lte(transaction.date, format(addDays(new Date(), 30), "yyyy-MM-dd")),
				),
			);

		return {
			topFiveCategories,
			topFiveMerchants,
			userCreatedAt: userCreatedAt?.createdAt,
			transferCategoryId: transferCategoryId?.id ?? null,
			earliestTransactionDate:
				earliestTransactionDate?.date ?? format(new Date(), "yyyy-MM-dd"),
			unreviewedTransactionCount: unreviewedTransactionCount[0]?.count ?? 0,
		};
	}),
};
