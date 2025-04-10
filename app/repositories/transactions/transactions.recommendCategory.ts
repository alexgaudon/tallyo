import { keys } from "@/repositories/keys";
import { db } from "@/server/db";
import { userMiddleware } from "@/server/middlewares";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { createServerFn } from "@tanstack/react-start";

import { transaction } from "@/server/db/schema";
import { and, eq } from "drizzle-orm";
import Fuse from "fuse.js";
import { z } from "zod";

const recommendCategorySchema = z.object({
  vendor: z.string(),
});

const $recommendTransactionCategory = createServerFn({
  method: "POST",
})
  .validator(recommendCategorySchema)
  .middleware([userMiddleware])
  .handler(async ({ context, data }) => {
    const reviewedTransactions = await db
      .select()
      .from(transaction)
      .where(
        and(
          eq(transaction.userId, context.auth.user.id),
          eq(transaction.vendor, data.vendor),
          eq(transaction.reviewed, true),
        ),
      );

    let categoryId;

    if (reviewedTransactions.length > 0) {
      categoryId = reviewedTransactions.at(0)?.categoryId ?? null;
    } else {
      const allReviewedTransactions = await db
        .select({
          vendor: transaction.vendor,
          categoryId: transaction.categoryId,
        })
        .from(transaction)
        .where(
          and(
            eq(transaction.userId, context.auth.user.id),
            eq(transaction.reviewed, true),
          ),
        );

      const fuse = new Fuse(allReviewedTransactions, {
        keys: ["vendor"],
        threshold: 0.3,
      });

      const fuzzyResults = fuse.search(data.vendor);

      if (fuzzyResults.length > 0) {
        categoryId = fuzzyResults[0].item.categoryId;
      } else {
        categoryId = null;
      }
    }

    if (categoryId === null) {
      return null;
    }

    return categoryId;
  });

export const useSetRecommendedTransactionCategoryMutation = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationKey: keys.transactions.mutations.update,
    mutationFn: (data: z.infer<typeof recommendCategorySchema>) =>
      $recommendTransactionCategory({
        data: {
          ...data,
        },
      }),
    onSettled: async () => {
      await queryClient.cancelQueries({
        queryKey: keys.transactions.queries.all,
      });
      await queryClient.invalidateQueries({
        queryKey: keys.transactions.queries.all,
      });
    },
  });
};
