import { keys } from "@/repositories/keys";
import { db } from "@/server/db";
import { category } from "@/server/db/schema";
import { userMiddleware } from "@/server/middlewares";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { createServerFn } from "@tanstack/react-start";

import { and, eq } from "drizzle-orm";
import { z } from "zod";
import { Category } from "./categories.getAll";

const updateCategorySchema = z.object({
  id: z.string(),
  treatAsIncome: z.boolean(),
  hideFromInsights: z.boolean(),
});

const $updateUserCategory = createServerFn({
  method: "POST",
})
  .validator(updateCategorySchema)
  .middleware([userMiddleware])
  .handler(async ({ context, data }) => {
    try {
      const res = await db
        .update(category)
        .set({
          ...data,
        })
        .where(
          and(
            eq(category.userId, context.auth.user.id),
            eq(category.id, data.id),
          ),
        )
        .returning({
          name: category.name,
        });

      if (res.length > 0) {
        return {
          ok: true,
          message: `Updated ${res[0].name}!`,
        };
      }
    } catch (e) {
      return {
        ok: false,
        message: (e as Error).message,
      };
    }
  });

export const useUpdateUserCategoryMutation = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationKey: keys.categories.mutations.update,
    mutationFn: (data: z.infer<typeof updateCategorySchema>) =>
      $updateUserCategory({
        data: {
          ...data,
        },
      }),
    onMutate: async (variables) => {
      await queryClient.cancelQueries({
        queryKey: keys.categories.queries.all,
      });

      const previous = queryClient.getQueryData(keys.categories.queries.all);

      queryClient.setQueryData(
        keys.categories.queries.all,
        (old: Category[]) => {
          return old.map((category) =>
            category.id === variables.id
              ? {
                  ...category,
                  ...variables,
                }
              : category,
          );
        },
      );

      return { previous };
    },
    onError: (err, _, context) => {
      queryClient.setQueryData(keys.categories.queries.all, context?.previous);
    },
    onSettled: async () => {
      await queryClient.cancelQueries({
        queryKey: keys.categories.queries.all,
      });
      await queryClient.invalidateQueries({
        queryKey: keys.categories.queries.all,
      });
    },
  });
};
