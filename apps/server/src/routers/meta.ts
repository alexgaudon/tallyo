import { db } from "@/db";
import { account, category, merchant, transaction, user } from "@/db/schema";
import { and, asc, count, desc, eq } from "drizzle-orm";
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

		const unreviewedTransactionCount = await db
			.select({ count: count() })
			.from(transaction)
			.where(
				and(
					eq(transaction.userId, context.session?.user?.id),
					eq(transaction.reviewed, false),
				),
			);

		return {
			topFiveCategories,
			topFiveMerchants,
			userCreatedAt: userCreatedAt?.createdAt,
			earliestTransactionDate:
				earliestTransactionDate?.date ?? userCreatedAt?.createdAt,
			unreviewedTransactionCount: unreviewedTransactionCount[0]?.count ?? 0,
		};
	}),
};
