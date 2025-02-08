import { keys } from "@/repositories/keys";
import { db } from "@/server/db";
import { userSettings } from "@/server/db/schema";
import { userMiddleware } from "@/server/middlewares";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { createServerFn } from "@tanstack/start";
import { eq } from "drizzle-orm";

import { z } from "zod";

const updateUserMetaSchema = z.object({
  privacyMode: z.boolean(),
});

const $updateUserMeta = createServerFn({
  method: "POST",
})
  .validator(updateUserMetaSchema)
  .middleware([userMiddleware])
  .handler(async ({ context, data }) => {
    try {
      await db
        .update(userSettings)
        .set({
          privacyMode: data.privacyMode,
        })
        .where(eq(userSettings.userId, context.auth.user.id))
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

export const updateUserMetaMutation = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationKey: keys.transactions.mutations.update,
    mutationFn: (data: z.infer<typeof updateUserMetaSchema>) =>
      $updateUserMeta({
        data: {
          ...data,
        },
      }),
    onMutate: async (variables) => {
      await queryClient.cancelQueries({
        queryKey: keys.meta.queries.all,
      });

      const updatedSettings = variables.privacyMode;

      const previousData = queryClient.getQueryData(keys.meta.queries.all);

      queryClient.setQueryData(
        keys.meta.queries.all,
        (old: {
          settings: {
            privacyMode: boolean;
          };
        }) => {
          if (!old) return;

          return {
            ...old,
            settings: {
              ...old.settings,
              privacyMode: updatedSettings,
            },
          };
        }
      );

      return { previousData };
    },
    onSettled: async () => {
      await queryClient.cancelQueries({
        queryKey: keys.meta.queries.all,
      });
      await queryClient.invalidateQueries({
        queryKey: keys.meta.queries.all,
      });
    },
  });
};
