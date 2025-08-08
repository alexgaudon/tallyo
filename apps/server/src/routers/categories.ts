import { asc, eq } from "drizzle-orm";
import { z } from "zod";
import { category } from "@/db/schema";
import { db } from "../db";
import { logger } from "../lib/logger";
import { protectedProcedure } from "../lib/orpc";

export const categoriesRouter = {
	getUserCategories: protectedProcedure.handler(async ({ context }) => {
		try {
			const userCategories = await db.query.category.findMany({
				with: {
					parentCategory: true,
				},
				where: eq(category.userId, context.session?.user?.id),
				orderBy: [asc(category.name)],
			});

			return {
				categories: userCategories,
			};
		} catch (error) {
			logger.error(
				`Error fetching categories for user ${context.session?.user?.id}:`,
				{
					error,
					metadata: { userId: context.session?.user?.id },
				},
			);
			throw error;
		}
	}),
	deleteCategory: protectedProcedure
		.input(
			z.object({
				id: z.string(),
			}),
		)
		.handler(async ({ input, context }) => {
			try {
				const deletedCategory = await db
					.delete(category)
					.where(eq(category.id, input.id))
					.returning();

				if (!deletedCategory || deletedCategory.length === 0) {
					logger.error(`Category ${input.id} not found or already deleted`, {
						metadata: {
							userId: context.session?.user?.id,
							categoryId: input.id,
						},
					});
					throw new Error("Category not found or already deleted");
				}

				return {
					category: deletedCategory[0],
				};
			} catch (error) {
				logger.error(`Error deleting category ${input.id}:`, {
					error,
					metadata: {
						userId: context.session?.user?.id,
						categoryId: input.id,
					},
				});
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
				// Check if category with same name exists (edge case)
				const existingCategory = await db.query.category.findFirst({
					where: (category) =>
						eq(category.userId, context.session.user.id) &&
						eq(category.name, input.name),
				});

				if (existingCategory) {
					throw new Error("Category with this name already exists");
				}

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
					logger.error(`Failed to create category "${input.name}"`, {
						metadata: {
							userId: context.session?.user?.id,
							categoryName: input.name,
						},
					});
					throw new Error("Failed to create category. Please try again.");
				}

				return {
					category: newCategory[0],
				};
			} catch (error) {
				logger.error(`Error creating category "${input.name}":`, {
					error,
					metadata: {
						userId: context.session?.user?.id,
						categoryName: input.name,
					},
				});
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
				// Check for circular reference in parent category (edge case)
				if (input.parentCategoryId === input.id) {
					logger.error("Circular reference detected in category update", {
						metadata: {
							userId: context.session?.user?.id,
							categoryId: input.id,
							parentCategoryId: input.parentCategoryId,
						},
					});
					throw new Error("Category cannot be its own parent");
				}

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
					logger.error(`Category ${input.id} not found or update failed`, {
						metadata: {
							userId: context.session?.user?.id,
							categoryId: input.id,
						},
					});
					throw new Error("Category not found or update failed");
				}

				return {
					category: updatedCategory[0],
				};
			} catch (error) {
				logger.error(`Error updating category ${input.id}:`, {
					error,
					metadata: {
						userId: context.session?.user?.id,
						categoryId: input.id,
					},
				});
				if (error instanceof Error) {
					throw new Error(`Failed to update category: ${error.message}`);
				}
				throw new Error("An unexpected error occurred while updating category");
			}
		}),
};
