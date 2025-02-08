import { keys } from "@/repositories/keys";
import { db } from "@/server/db";
import { category } from "@/server/db/schema";
import { userMiddleware } from "@/server/middlewares";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { createServerFn } from "@tanstack/start";
import { and, eq } from "drizzle-orm";

import { z } from "zod";
import { Category } from "./categories.getAll";

const deleteCategorySchema = z.object({
  id: z.string(),
});

const $deleteUserCategory = createServerFn({
  method: "POST",
})
  .validator(deleteCategorySchema)
  .middleware([userMiddleware])
  .handler(async ({ context, data }) => {
    try {
      const res = await db
        .delete(category)
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
          message: `${res[0].name} deleted successfully.`,
        };
      }
    } catch (e) {
      console.error(e);
      const message = (e as Error).message;
      return {
        ok: false,
        message: message.includes("duplicate key value")
          ? "A category with this name already exists."
          : message,
      };
    }
  });

export const deleteUserCategoryMutation = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationKey: keys.categories.mutations.delete,
    mutationFn: (data: z.infer<typeof deleteCategorySchema>) =>
      $deleteUserCategory({
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
          return old.filter((x) => x.id !== variables.id);
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
