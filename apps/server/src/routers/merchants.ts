import { and, asc, eq, or } from "drizzle-orm";
import { z } from "zod";
import { merchant, merchantKeyword, transaction } from "@/db/schema";
import { db } from "../db";
import { logger } from "../lib/logger";
import { protectedProcedure } from "../lib/orpc";

export async function getMerchantFromVendor(vendor: string, userId: string) {
  try {
    const keyword = await db.query.merchantKeyword.findFirst({
      where: and(
        eq(merchantKeyword.userId, userId),
        eq(merchantKeyword.keyword, vendor),
      ),
      with: {
        merchant: {
          columns: {
            id: true,
            name: true,
            recommendedCategoryId: true,
          },
        },
      },
    });

    return keyword?.merchant || null;
  } catch (error) {
    logger.error(
      `Error fetching merchant for vendor "${vendor}" for user ${userId}:`,
      { error },
    );
    throw error;
  }
}

export const merchantsRouter = {
  getMerchantFromVendor: protectedProcedure
    .input(
      z.object({
        vendor: z.string(),
      }),
    )
    .handler(async ({ input, context }) => {
      try {
        return await getMerchantFromVendor(
          input.vendor,
          context.session?.user?.id,
        );
      } catch (error) {
        logger.error(
          `Error fetching merchant for vendor "${input.vendor}" for user ${context.session?.user?.id}:`,
          { error },
        );
        throw error;
      }
    }),
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
          message: "Successfully created merchant",
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

        let updatedCount = 0;

        // Update unreviewed transactions that match the keywords with the merchant and recommended category
        if (keywords && keywords.length > 0) {
          const keywordConditions = keywords.map((keyword) =>
            eq(transaction.transactionDetails, keyword),
          );

          const updateData: {
            merchantId: string;
            updatedAt: Date;
            categoryId?: string;
          } = {
            merchantId: id,
            updatedAt: new Date(),
          };

          // Only update category if recommendedCategoryId is provided
          if (input.recommendedCategoryId) {
            updateData.categoryId = input.recommendedCategoryId;
          }

          const updatedResult = await db
            .update(transaction)
            .set(updateData)
            .where(
              and(
                eq(transaction.userId, context.session?.user?.id),
                eq(transaction.reviewed, false),
                or(...keywordConditions),
              ),
            );

          updatedCount = updatedResult.rowCount ?? 0;
        }

        return {
          merchant: updatedMerchant[0],
          message:
            updatedCount > 0
              ? `Updated ${updatedCount} unreviewed transaction${updatedCount === 1 ? "" : "s"} with this merchant`
              : "Merchant updated successfully",
        };
      } catch (error) {
        logger.error(`Error updating merchant ${input.id}:`, { error });
        if (error instanceof Error) {
          throw new Error(`Failed to update merchant: ${error.message}`);
        }
        throw new Error("An unexpected error occurred while updating merchant");
      }
    }),
  applyMerchant: protectedProcedure
    .input(
      z.object({
        id: z.string(),
      }),
    )
    .handler(async ({ context, input }) => {
      try {
        // Get the merchant with its keywords
        const merchantData = await db.query.merchant.findFirst({
          where: and(
            eq(merchant.id, input.id),
            eq(merchant.userId, context.session?.user?.id),
          ),
          with: {
            keywords: {
              columns: {
                keyword: true,
              },
            },
          },
        });

        if (!merchantData) {
          logger.error(
            `Merchant ${input.id} not found for user ${context.session?.user?.id}`,
          );
          throw new Error("Merchant not found");
        }

        if (!merchantData.keywords || merchantData.keywords.length === 0) {
          return {
            message:
              "No keywords found for this merchant. Add keywords to apply this merchant to transactions.",
            updatedCount: 0,
          };
        }

        const keywords = merchantData.keywords.map((k) => k.keyword);
        const keywordConditions = keywords.map((keyword) =>
          eq(transaction.transactionDetails, keyword),
        );

        const updateData: {
          merchantId: string;
          updatedAt: Date;
          categoryId?: string;
        } = {
          merchantId: input.id,
          updatedAt: new Date(),
        };

        // Only update category if recommendedCategoryId is provided
        if (merchantData.recommendedCategoryId) {
          updateData.categoryId = merchantData.recommendedCategoryId;
        }

        const updatedResult = await db
          .update(transaction)
          .set(updateData)
          .where(
            and(
              eq(transaction.userId, context.session?.user?.id),
              eq(transaction.reviewed, false),
              or(...keywordConditions),
            ),
          );

        const updatedCount = updatedResult.rowCount ?? 0;

        logger.info(
          `Applied merchant ${input.id} to ${updatedCount} transactions for user ${context.session?.user?.id}`,
        );

        return {
          message:
            updatedCount > 0
              ? `Applied merchant to ${updatedCount} unreviewed transaction${updatedCount === 1 ? "" : "s"}`
              : "No matching unreviewed transactions found",
          updatedCount,
        };
      } catch (error) {
        logger.error(`Error applying merchant ${input.id}:`, { error });
        if (error instanceof Error) {
          throw new Error(`Failed to apply merchant: ${error.message}`);
        }
        throw new Error("An unexpected error occurred while applying merchant");
      }
    }),
  applyAllMerchants: protectedProcedure
    .input(z.object({}))
    .handler(async ({ context }) => {
      try {
        // Get all merchants with their keywords for the user
        const userMerchants = await db.query.merchant.findMany({
          where: eq(merchant.userId, context.session?.user?.id),
          with: {
            keywords: {
              columns: {
                keyword: true,
              },
            },
          },
        });

        if (!userMerchants || userMerchants.length === 0) {
          return {
            message: "No merchants found",
            totalUpdated: 0,
            merchantsProcessed: 0,
          };
        }

        let totalUpdated = 0;
        let merchantsProcessed = 0;
        const results: Array<{
          merchantId: string;
          merchantName: string;
          updatedCount: number;
        }> = [];

        // Apply each merchant to matching transactions
        for (const merchantData of userMerchants) {
          if (!merchantData.keywords || merchantData.keywords.length === 0) {
            continue; // Skip merchants without keywords
          }

          const keywords = merchantData.keywords.map((k) => k.keyword);
          const keywordConditions = keywords.map((keyword) =>
            eq(transaction.transactionDetails, keyword),
          );

          const updateData: {
            merchantId: string;
            updatedAt: Date;
            categoryId?: string;
          } = {
            merchantId: merchantData.id,
            updatedAt: new Date(),
          };

          // Only update category if recommendedCategoryId is provided
          if (merchantData.recommendedCategoryId) {
            updateData.categoryId = merchantData.recommendedCategoryId;
          }

          const updatedResult = await db
            .update(transaction)
            .set(updateData)
            .where(
              and(
                eq(transaction.userId, context.session?.user?.id),
                eq(transaction.reviewed, false),
                or(...keywordConditions),
              ),
            );

          const updatedCount = updatedResult.rowCount ?? 0;
          totalUpdated += updatedCount;
          merchantsProcessed++;

          if (updatedCount > 0) {
            results.push({
              merchantId: merchantData.id,
              merchantName: merchantData.name,
              updatedCount,
            });
          }
        }

        logger.info(
          `Applied all merchants to ${totalUpdated} transactions for user ${context.session?.user?.id}. Processed ${merchantsProcessed} merchants.`,
        );

        return {
          message:
            totalUpdated > 0
              ? `Applied ${merchantsProcessed} merchant${merchantsProcessed === 1 ? "" : "s"} to ${totalUpdated} unreviewed transaction${totalUpdated === 1 ? "" : "s"}`
              : `Processed ${merchantsProcessed} merchant${merchantsProcessed === 1 ? "" : "s"}, but no matching unreviewed transactions were found`,
          totalUpdated,
          merchantsProcessed,
          results,
        };
      } catch (error) {
        logger.error(`Error applying all merchants:`, { error });
        if (error instanceof Error) {
          throw new Error(`Failed to apply all merchants: ${error.message}`);
        }
        throw new Error(
          "An unexpected error occurred while applying all merchants",
        );
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
          message: "Successfully deleted merchant",
        };
      } catch (error) {
        logger.error(`Error deleting merchant ${input.id}:`, { error });
        if (error instanceof Error) {
          throw new Error(`Failed to delete merchant: ${error.message}`);
        }
        throw new Error("An unexpected error occurred while deleting merchant");
      }
    }),
  mergeMerchants: protectedProcedure
    .input(
      z.object({
        sourceMerchantId: z.string(),
        targetMerchantId: z.string(),
      }),
    )
    .handler(async ({ input, context }) => {
      logger.info(
        `Merging merchant ${input.sourceMerchantId} into ${input.targetMerchantId} for user ${context.session?.user?.id}`,
      );
      try {
        // Verify both merchants exist and belong to the user
        const [sourceMerchant, targetMerchant] = await Promise.all([
          db.query.merchant.findFirst({
            where: and(
              eq(merchant.id, input.sourceMerchantId),
              eq(merchant.userId, context.session?.user?.id),
            ),
            with: {
              keywords: {
                columns: {
                  id: true,
                  keyword: true,
                },
              },
            },
          }),
          db.query.merchant.findFirst({
            where: and(
              eq(merchant.id, input.targetMerchantId),
              eq(merchant.userId, context.session?.user?.id),
            ),
            with: {
              keywords: {
                columns: {
                  id: true,
                  keyword: true,
                },
              },
            },
          }),
        ]);

        if (!sourceMerchant) {
          throw new Error("Source merchant not found");
        }

        if (!targetMerchant) {
          throw new Error("Target merchant not found");
        }

        if (sourceMerchant.id === targetMerchant.id) {
          throw new Error("Cannot merge a merchant into itself");
        }

        // Get existing keywords from both merchants
        const _sourceKeywords = sourceMerchant.keywords.map((k) =>
          k.keyword.toLowerCase(),
        );
        const targetKeywords = targetMerchant.keywords.map((k) =>
          k.keyword.toLowerCase(),
        );

        // Find keywords that need to be added to target merchant
        const keywordsToAdd = sourceMerchant.keywords.filter(
          (keyword) => !targetKeywords.includes(keyword.keyword.toLowerCase()),
        );

        // Add missing keywords to target merchant
        if (keywordsToAdd.length > 0) {
          await db.insert(merchantKeyword).values(
            keywordsToAdd.map((keyword) => ({
              merchantId: targetMerchant.id,
              userId: context.session?.user?.id,
              keyword: keyword.keyword,
            })),
          );
        }

        // Reassign all transactions from source merchant to target merchant
        const reassignedTransactions = await db
          .update(transaction)
          .set({
            merchantId: targetMerchant.id,
            updatedAt: new Date(),
          })
          .where(
            and(
              eq(transaction.merchantId, sourceMerchant.id),
              eq(transaction.userId, context.session?.user?.id),
            ),
          )
          .returning();

        // Delete the source merchant (this will cascade delete its keywords)
        const deletedMerchant = await db
          .delete(merchant)
          .where(eq(merchant.id, sourceMerchant.id))
          .returning();

        if (!deletedMerchant || deletedMerchant.length === 0) {
          throw new Error("Failed to delete source merchant");
        }

        const message = `Successfully merged "${sourceMerchant.name}" into "${targetMerchant.name}". ${keywordsToAdd.length} keywords added, ${reassignedTransactions.length} transactions reassigned.`;

        logger.info(
          `Successfully merged merchant ${input.sourceMerchantId} into ${input.targetMerchantId} for user ${context.session?.user?.id}`,
        );

        return {
          message,
          sourceMerchant: deletedMerchant[0],
          targetMerchant,
          keywordsAdded: keywordsToAdd.length,
          transactionsReassigned: reassignedTransactions.length,
        };
      } catch (error) {
        logger.error(
          `Error merging merchant ${input.sourceMerchantId} into ${input.targetMerchantId}:`,
          { error },
        );
        if (error instanceof Error) {
          throw new Error(`Failed to merge merchants: ${error.message}`);
        }
        throw new Error("An unexpected error occurred while merging merchants");
      }
    }),
};
