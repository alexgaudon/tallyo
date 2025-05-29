import { category } from "@/db/schema";
import { eq } from "drizzle-orm";
import { z } from "zod";
import { db, healthCheck } from "../db";
import { protectedProcedure, publicProcedure } from "../lib/orpc";

import type { InferRouterOutputs } from "@orpc/server";

export type Category = InferRouterOutputs<
	typeof categoriesRouter
>["getUserCategories"]["categories"][number];

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
};

export type AppRouter = typeof appRouter;
