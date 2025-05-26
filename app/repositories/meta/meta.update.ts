import { keys } from "@/repositories/keys";
import { db } from "@/server/db";
import { userSettings } from "@/server/db/schema";
import { userMiddleware } from "@/server/middlewares";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { createServerFn } from "@tanstack/react-start";
import { eq } from "drizzle-orm";

import { z } from "zod";

const updateUserMetaSchema = z.object({
  privacyMode: z.boolean(),
  developerMode: z.boolean(),
});

const $updateUserMeta = createServerFn({
  method: "POST",
})
  .validator(updateUserMetaSchema)
  .middleware([userMiddleware])
  .handler(async ({ context, data }) => {
    try {
      console.log(data);
      await db
        .update(userSettings)
        .set({
          privacyMode: data.privacyMode,
          developerMode: data.developerMode,
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

export const useUpdateUserMetaMutation = () => {
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
      const updatedDeveloperMode = variables.developerMode;

      const previousData = queryClient.getQueryData(keys.meta.queries.all);

      queryClient.setQueryData(
        keys.meta.queries.all,
        (old: {
          settings: {
            privacyMode: boolean;
            developerMode: boolean;
          };
        }) => {
          if (!old) return;

          return {
            ...old,
            settings: {
              ...old.settings,
              privacyMode: updatedSettings,
              developerMode: updatedDeveloperMode,
            },
          };
        },
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
