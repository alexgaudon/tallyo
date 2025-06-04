import { healthCheck } from "../db";
import { protectedProcedure, publicProcedure } from "../lib/orpc";
import { categoriesRouter } from "./categories";
import { merchantsRouter } from "./merchants";
import { settingsRouter } from "./settings";
import { transactionsRouter } from "./transactions";

import type { InferRouterOutputs } from "@orpc/server";

export type Category = InferRouterOutputs<
	typeof categoriesRouter
>["getUserCategories"]["categories"][number];

export type MerchantWithKeywordsAndCategory = InferRouterOutputs<
	typeof merchantsRouter
>["getUserMerchants"][number];

export type Transaction = InferRouterOutputs<
	typeof transactionsRouter
>["getUserTransactions"]["transactions"][number];

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
	settings: settingsRouter,
};

export type AppRouter = typeof appRouter;
