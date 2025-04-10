import { keys } from "@/repositories/keys";
import { db } from "@/server/db";
import { category } from "@/server/db/schema";
import { userMiddleware } from "@/server/middlewares";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { createServerFn } from "@tanstack/react-start";
import { uuidv7 } from "uuidv7";

import { z } from "zod";

const createCategorySchema = z.object({
  categoryName: z.string(),
  color: z.string().startsWith("#"),
  hideFromInsights: z.boolean().optional(),
  treatAsIncome: z.boolean().optional(),
});

const $createUserCategory = createServerFn({
  method: "POST",
})
  .middleware([userMiddleware])
  .validator(createCategorySchema)
  .handler(async ({ context, data }) => {
    try {
      await db
        .insert(category)
        .values({
          id: uuidv7(),
          userId: context.auth.user.id,
          name: data.categoryName,
          ...data,
        })
        .execute();
      return {
        ok: true,
        message: `Created ${data.categoryName} successfully.`,
      };
    } catch (e) {
      console.error(e);
      const message = (e as Error).message;
      return {
        ok: false,
        message: message.includes("SQLITE_CONSTRAINT")
          ? "A category with this name already exists."
          : message,
      };
    }
  });

export const useCreateUserCategoryMutation = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationKey: keys.categories.mutations.create,
    mutationFn: $createUserCategory,
    onSuccess: async () => {
      await queryClient.cancelQueries({
        queryKey: keys.categories.queries.all,
      });
      await queryClient.invalidateQueries({
        queryKey: keys.categories.queries.all,
      });
    },
  });
};
