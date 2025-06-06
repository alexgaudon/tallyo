import { db } from "@/db";
import { category, merchant } from "@/db/schema";
import { desc, eq } from "drizzle-orm";
import { protectedProcedure } from "../lib/orpc";

export const metaRouter = {
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

		return { topFiveCategories, topFiveMerchants };
	}),
};
