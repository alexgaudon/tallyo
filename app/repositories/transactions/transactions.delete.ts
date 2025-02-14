import { keys } from "@/repositories/keys";
import { db } from "@/server/db";
import { transaction } from "@/server/db/schema";
import { userMiddleware } from "@/server/middlewares";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { createServerFn } from "@tanstack/start";
import { and, eq } from "drizzle-orm";

import { z } from "zod";

const deleteUserTransactionSchema = z.object({
  id: z.string(),
});

const $deleteUserTransaction = createServerFn({
  method: "POST",
})
  .validator(deleteUserTransactionSchema)
  .middleware([userMiddleware])
  .handler(async ({ context, data }) => {
    const res = await db
      .delete(transaction)
      .where(
        and(
          eq(transaction.userId, context.auth.user.id),
          eq(transaction.id, data.id),
        ),
      );

    return res.rowsAffected > 0;
  });

export const useDeleteUserTransactionMutation = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationKey: keys.transactions.mutations.update,
    mutationFn: (data: z.infer<typeof deleteUserTransactionSchema>) =>
      $deleteUserTransaction({
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
