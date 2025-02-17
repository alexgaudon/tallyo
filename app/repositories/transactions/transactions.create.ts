import { keys } from "@/repositories/keys";
import { db } from "@/server/db";
import { transaction } from "@/server/db/schema";
import { userMiddleware } from "@/server/middlewares";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { createServerFn } from "@tanstack/start";

import { uuidv7 } from "uuidv7";
import { z } from "zod";

const createTransactionSchema = z.object({
  vendor: z.string(),
  amount: z.coerce.number(),
  date: z.coerce.string(),
  externalId: z.string().optional(),
  categoryId: z.string().optional(),
});

const $createUserTransaction = createServerFn({
  method: "POST",
})
  .validator(createTransactionSchema)
  .middleware([userMiddleware])
  .handler(async ({ context, data }) => {
    const { matchDisplayVendor } = await import("./matchDisplayVendor");

    const displayVendor = await matchDisplayVendor(
      context.auth.user.id,
      data.vendor,
    );

    const res = await db.insert(transaction).values({
      id: uuidv7(),
      amount: data.amount,
      userId: context.auth.user.id,
      vendor: data.vendor,
      displayVendor: displayVendor,
      date: data.date,
      externalId: data.externalId,
      categoryId: data.categoryId,
    });

    return res.rowsAffected > 0;
  });

export const useCreateUserTransactionMutation = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationKey: keys.transactions.mutations.update,
    mutationFn: (data: z.infer<typeof createTransactionSchema>) =>
      $createUserTransaction({
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
