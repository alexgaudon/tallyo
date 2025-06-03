import { category } from "@/db/schema";
import { eq } from "drizzle-orm";
import { z } from "zod";
import { db } from "../db";
import { protectedProcedure } from "../lib/orpc";

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
