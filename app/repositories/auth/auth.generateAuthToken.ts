import { keys } from "@/repositories/keys";
import { db } from "@/server/db";
import { authToken } from "@/server/db/schema";
import { userMiddleware } from "@/server/middlewares";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { createServerFn } from "@tanstack/start";
import { eq } from "drizzle-orm";
import { uuidv7 } from "uuidv7";
import { randomBytes } from "crypto";

const $generateUserAuthToken = createServerFn({
  method: "POST",
})
  .middleware([userMiddleware])
  .handler(async ({ context, data }) => {
    function generateAuthToken() {
      return randomBytes(128).toString("hex").slice(0, 64);
    }

    const hasAuthToken =
      (
        await db
          .select()
          .from(authToken)
          .where(eq(authToken.userId, context.auth.user.id))
      ).length > 0;

    if (hasAuthToken) {
      await db
        .delete(authToken)
        .where(eq(authToken.userId, context.auth.user.id));
    }

    const newToken = generateAuthToken();

    await db
      .insert(authToken)
      .values({
        id: uuidv7(),
        userId: context.auth.user.id,
        token: newToken,
      })
      .execute();

    return {
      message: hasAuthToken
        ? "Auth token regenerated."
        : "Auth token generated.",
      token: newToken,
    };
  });

export const generateUserAuthTokenMutation = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationKey: keys.auth.mutations.generateAuthToken,
    mutationFn: $generateUserAuthToken,
    onSuccess: async () => {
      await queryClient.cancelQueries({
        queryKey: keys.auth.queries.all,
      });
      await queryClient.invalidateQueries({
        queryKey: keys.auth.queries.all,
      });
    },
  });
};
