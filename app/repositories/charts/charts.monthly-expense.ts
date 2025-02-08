import { db } from "@/server/db";
import { category, transaction } from "@/server/db/schema";
import { userMiddleware } from "@/server/middlewares";
import { queryOptions } from "@tanstack/react-query";
import { createServerFn } from "@tanstack/start";
import { and, eq, sql } from "drizzle-orm";
import { keys } from "../keys";

export const $getMonthlyExpenseData = createServerFn({
  method: "GET",
})
  .middleware([userMiddleware])
  .handler(async ({ context }) => {
    const conditions = [];

    conditions.push(eq(transaction.userId, context.auth.user.id));
    conditions.push(eq(category.hideFromInsights, false));

    const results = await db
      .select({
        category: category.name,
        period: sql<string>`strftime('%Y-%m', ${transaction.date})`,
        amount: sql<number>`SUM(${transaction.amount})`,
        isIncome: sql<boolean>`${category.treatAsIncome}`,
      })
      .from(transaction)
      .where(and(...conditions))
      .leftJoin(category, eq(category.id, transaction.categoryId))
      .groupBy(
        category.name,
        sql`strftime('%Y-%m', ${transaction.date})`,
        category.treatAsIncome,
      );

    return results;
  });

export const getMonthlyExpenseDataQuery = () =>
  queryOptions({
    queryKey: [...keys.charts.queries.monthlyExpenses],
    queryFn: () => $getMonthlyExpenseData(),
  });
