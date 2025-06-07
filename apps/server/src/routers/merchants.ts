import { merchant, merchantKeyword } from "@/db/schema";
import { asc, eq } from "drizzle-orm";
import { z } from "zod";
import { db } from "../db";
import { logger } from "../lib/logger";
import { protectedProcedure } from "../lib/orpc";

export const merchantsRouter = {
	getUserMerchants: protectedProcedure.handler(async ({ context }) => {
		try {
			const userMerchants = await db.query.merchant.findMany({
				where: eq(merchant.userId, context.session?.user?.id),
				with: {
					recommendedCategory: true,
					keywords: {
						columns: {
							id: true,
							keyword: true,
						},
					},
				},
				orderBy: [asc(merchant.name)],
			});

			return userMerchants;
		} catch (error) {
			logger.error(
				`Error fetching merchants for user ${context.session?.user?.id}:`,
				{ error },
			);
			throw error;
		}
	}),
	createMerchant: protectedProcedure
		.input(
			z.object({
				name: z.string(),
				recommendedCategoryId: z.string().optional(),
				keywords: z.array(z.string()).optional(),
			}),
		)
		.handler(async ({ context, input }) => {
			try {
				const newMerchant = await db
					.insert(merchant)
					.values({
						name: input.name,
						userId: context.session?.user?.id,
						recommendedCategoryId: input.recommendedCategoryId,
					})
					.returning();

				if (!newMerchant || newMerchant.length === 0) {
					logger.error(
						`Failed to create merchant "${input.name}" for user ${context.session?.user?.id}`,
					);
					throw new Error("Failed to create merchant. Please try again.");
				}

				if (input.keywords && input.keywords.length > 0) {
					await db.insert(merchantKeyword).values(
						input.keywords.map((keyword) => ({
							merchantId: newMerchant[0].id,
							userId: context.session?.user?.id,
							keyword: keyword.trim(),
						})),
					);
				}

				return {
					merchant: newMerchant[0],
				};
			} catch (error) {
				logger.error(`Error creating merchant "${input.name}":`, { error });
				if (error instanceof Error) {
					throw new Error(`Failed to create merchant: ${error.message}`);
				}
				throw new Error("An unexpected error occurred while creating merchant");
			}
		}),
	updateMerchant: protectedProcedure
		.input(
			z.object({
				id: z.string(),
				name: z.string().optional(),
				recommendedCategoryId: z.string().optional(),
				keywords: z.array(z.string()).optional(),
			}),
		)
		.handler(async ({ context, input }) => {
			try {
				const { id, keywords, ...updateData } = input;
				const updatedMerchant = await db
					.update(merchant)
					.set({
						...updateData,
						updatedAt: new Date(),
					})
					.where(eq(merchant.id, id))
					.returning();

				if (!updatedMerchant || updatedMerchant.length === 0) {
					logger.error(
						`Merchant ${input.id} not found or update failed for user ${context.session?.user?.id}`,
					);
					throw new Error("Merchant not found or update failed");
				}

				if (keywords !== undefined) {
					// Delete existing keywords
					await db
						.delete(merchantKeyword)
						.where(eq(merchantKeyword.merchantId, id));

					// Insert new keywords if any
					if (keywords.length > 0) {
						await db.insert(merchantKeyword).values(
							keywords.map((keyword) => ({
								merchantId: id,
								userId: context.session?.user?.id,
								keyword: keyword.trim(),
							})),
						);
					}
				}

				return {
					merchant: updatedMerchant[0],
				};
			} catch (error) {
				logger.error(`Error updating merchant ${input.id}:`, { error });
				if (error instanceof Error) {
					throw new Error(`Failed to update merchant: ${error.message}`);
				}
				throw new Error("An unexpected error occurred while updating merchant");
			}
		}),
	deleteMerchant: protectedProcedure
		.input(
			z.object({
				id: z.string(),
			}),
		)
		.handler(async ({ input, context }) => {
			logger.info(
				`Deleting merchant ${input.id} for user ${context.session?.user?.id}`,
			);
			try {
				const deletedMerchant = await db
					.delete(merchant)
					.where(eq(merchant.id, input.id))
					.returning();

				if (!deletedMerchant || deletedMerchant.length === 0) {
					logger.error(
						`Merchant ${input.id} not found or already deleted for user ${context.session?.user?.id}`,
					);
					throw new Error("Merchant not found or already deleted");
				}

				logger.info(
					`Successfully deleted merchant ${input.id} for user ${context.session?.user?.id}`,
				);
				return {
					merchant: deletedMerchant[0],
				};
			} catch (error) {
				logger.error(`Error deleting merchant ${input.id}:`, { error });
				if (error instanceof Error) {
					throw new Error(`Failed to delete merchant: ${error.message}`);
				}
				throw new Error("An unexpected error occurred while deleting merchant");
			}
		}),
};
