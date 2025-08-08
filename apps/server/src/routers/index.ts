import type { InferRouterOutputs } from "@orpc/server";
import { healthCheck } from "../db";
import { protectedProcedure, publicProcedure } from "../lib/orpc";
import { categoriesRouter } from "./categories";
import { dashboardRouter } from "./dashboard";
import { merchantsRouter } from "./merchants";
import { metaRouter } from "./meta";
import { settingsRouter } from "./settings";
import { transactionsRouter } from "./transactions";

export type Category = InferRouterOutputs<
	typeof categoriesRouter
>["getUserCategories"]["categories"][number];

export type MerchantWithKeywordsAndCategory = InferRouterOutputs<
	typeof merchantsRouter
>["getUserMerchants"][number];

export type Transaction = InferRouterOutputs<
	typeof transactionsRouter
>["getUserTransactions"]["transactions"][number];

export type DashboardStats = InferRouterOutputs<
	typeof dashboardRouter
>["getStatsCounts"];

export type DashboardCategoryData = InferRouterOutputs<
	typeof dashboardRouter
>["getCategoryData"];

export type DashboardMerchantStats = InferRouterOutputs<
	typeof dashboardRouter
>["getMerchantStats"];

export const appRouter = {
	healthCheck: publicProcedure.handler(async () => {
		try {
			await healthCheck();
			return "OK";
		} catch (_error) {
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
	meta: metaRouter,
	dashboard: dashboardRouter,
};

export type AppRouter = typeof appRouter;
