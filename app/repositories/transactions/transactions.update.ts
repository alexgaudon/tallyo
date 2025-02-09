import { keys } from "@/repositories/keys";
import { db } from "@/server/db";
import { transaction } from "@/server/db/schema";
import { userMiddleware } from "@/server/middlewares";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { createServerFn } from "@tanstack/start";

import { and, eq } from "drizzle-orm";
import { z } from "zod";
import { $getUserCategories } from "../categories/categories.getAll";
import { Transaction } from "./transactions.getAll";

const updateTransactionSchema = z.object({
  id: z.string(),
  displayVendor: z.string().optional(),
  description: z.string().optional(),
  categoryId: z.string().optional(),
  reviewed: z.boolean().optional(),
});

const $updateUserTransaction = createServerFn({
  method: "POST",
})
  .validator(updateTransactionSchema)
  .middleware([userMiddleware])
  .handler(async ({ context, data }) => {
    const existingTransaction = await db
      .select()
      .from(transaction)
      .where(
        and(
          eq(transaction.id, data.id),
          eq(transaction.userId, context.auth.user.id),
        ),
      );

    if (existingTransaction.length === 0) {
      return { ok: false, message: "Something went wrong. Please try again" };
    }

    const updatedValues = {
      ...existingTransaction[0],
    };

    if (data.displayVendor !== undefined) {
      updatedValues.displayVendor = data.displayVendor;
    }

    if (data.categoryId !== undefined) {
      updatedValues.categoryId = data.categoryId;
    }

    if (data.reviewed !== undefined) {
      updatedValues.reviewed = data.reviewed;
    }

    if (data.description !== undefined) {
      updatedValues.description = data.description;
    }

    try {
      await db
        .update(transaction)
        .set(updatedValues)
        .where(
          and(
            eq(transaction.userId, context.auth.user.id),
            eq(transaction.id, data.id),
          ),
        )
        .execute();

      return {
        ok: true,
        message: "Updated successfully.",
      };
    } catch (e) {
      return {
        ok: false,
        message: (e as Error).message,
      };
    }
  });

export const updateUserTransactionMutation = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationKey: keys.transactions.mutations.update,
    mutationFn: (data: z.infer<typeof updateTransactionSchema>) =>
      $updateUserTransaction({
        data: {
          ...data,
        },
      }),
    onMutate: async (variables) => {
      await queryClient.cancelQueries({
        queryKey: keys.transactions.queries.all,
      });

      const updatedCategory = variables.categoryId
        ? (await $getUserCategories()).find(
            (x) => x.id === variables.categoryId,
          )
        : undefined;

      const allQueryKeys = queryClient.getQueriesData({
        queryKey: keys.transactions.queries.all,
      });

      const previousData = allQueryKeys.map(([key, value]) => ({ key, value }));

      allQueryKeys.forEach(([key, queryData]) => {
        if (!queryData) return;

        queryClient.setQueryData(key, (old: { data: Transaction[] }) => {
          if (!old) return;

          return {
            ...old,
            data: old.data?.map((transaction) => {
              const updated = {
                ...transaction,
                ...variables,
              };
              if (updatedCategory) {
                updated.category = { ...updatedCategory };
              }

              return transaction.id === variables.id ? updated : transaction;
            }),
          };
        });
      });

      return { previousData };
    },
    onError: (err, _, context) => {
      if (context?.previousData) {
        context.previousData.forEach(({ key, value }) => {
          queryClient.setQueryData(key, value);
        });
      }
    },
    onSettled: async () => {
      await queryClient.cancelQueries({
        queryKey: keys.transactions.queries.all,
      });
      await queryClient.invalidateQueries({
        queryKey: keys.transactions.queries.all,
      });
      await queryClient.invalidateQueries({
        queryKey: keys.meta.queries.all,
      });
    },
  });
};
