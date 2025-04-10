import { keys } from "@/repositories/keys";
import { db } from "@/server/db";
import { category } from "@/server/db/schema";
import { userMiddleware } from "@/server/middlewares";
import { queryOptions } from "@tanstack/react-query";
import { createServerFn } from "@tanstack/react-start";
import { asc, eq } from "drizzle-orm";

export type Category = Awaited<ReturnType<typeof $getUserCategories>>[0];

export const $getUserCategories = createServerFn({
  method: "GET",
})
  .middleware([userMiddleware])
  .handler(async ({ context }) => {
    const categories = await db
      .select()
      .from(category)
      .where(eq(category.userId, context.auth.user!.id))
      .orderBy(asc(category.name));

    return categories;
  });

export const getAllUserCategoriesQuery = () =>
  queryOptions({
    queryKey: keys.categories.queries.all,
    queryFn: () => $getUserCategories(),
  });
