import { keys } from "@/repositories/keys";
import { db } from "@/server/db";
import { transaction } from "@/server/db/schema";
import { userMiddleware } from "@/server/middlewares";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { createServerFn } from "@tanstack/react-start";

import { and, eq } from "drizzle-orm";

import { uuidv7 } from "uuidv7";
import { z } from "zod";

const splitTransactionSchema = z.object({
  transactionId: z.string(),
  firstAmount: z.number(),
  secondAmount: z.number(),
});

const $splitUserTransaction = createServerFn({
  method: "POST",
})
  .validator(splitTransactionSchema)
  .middleware([userMiddleware])
  .handler(async ({ context, data }) => {
    const existingTransaction = await db
      .select()
      .from(transaction)
      .where(and(eq(transaction.userId, context.auth.user.id), eq(transaction.id, data.transactionId)));

    if (!existingTransaction || existingTransaction.length === 0) {
      return {
        ok: false,
        message: "Error splitting transaction. Original transaction not found.",
      };
    }

    const newTransaction = {
      id: uuidv7(),
      userId: context.auth.user.id,
      date: existingTransaction[0].date,
      amount: data.firstAmount,
      categoryId: existingTransaction[0].categoryId,
      vendor: existingTransaction[0].vendor,
      externalId: existingTransaction[0].externalId + "SPLIT" + data.firstAmount,
    };

    await db.insert(transaction).values(newTransaction).execute();

    await db
      .update(transaction)
      .set({
        ...existingTransaction[0],
        amount: data.secondAmount,
      })
      .where(eq(transaction.id, existingTransaction[0].id));

    return {
      ok: true,
      message: "Split transaction",
    };
  });

export const useSplitUserTransactionMutation = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationKey: keys.transactions.mutations.update,
    mutationFn: (data: z.infer<typeof splitTransactionSchema>) =>
      $splitUserTransaction({
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
