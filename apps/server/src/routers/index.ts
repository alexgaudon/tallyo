import { healthCheck } from "../db";
import { protectedProcedure, publicProcedure } from "../lib/orpc";

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
};
export type AppRouter = typeof appRouter;
