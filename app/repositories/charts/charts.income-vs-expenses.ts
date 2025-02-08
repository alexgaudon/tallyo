import { formatDateISO8601 } from "@/lib/utils";
import { db } from "@/server/db";
import { category, transaction } from "@/server/db/schema";
import { userMiddleware } from "@/server/middlewares";
import { queryOptions } from "@tanstack/react-query";
import { createServerFn } from "@tanstack/start";
import { and, asc, between, eq, sql } from "drizzle-orm";
import { z } from "zod";
import { getKeyFromDate, keys } from "../keys";

const chartDataSchema = z.object({
  to: z.date().optional(),
  from: z.date().optional(),
});

export const $getIncomeVsExpensesData = createServerFn({
  method: "GET",
})
  .validator(chartDataSchema)
  .middleware([userMiddleware])
  .handler(async ({ context, data }) => {
    const conditions = [
      eq(transaction.userId, context.auth.user.id),
      eq(category.hideFromInsights, false),
    ];

    if (data.to && data.from) {
      conditions.push(
        between(
          transaction.date,
          formatDateISO8601(data.from),
          formatDateISO8601(data.to),
        ),
      );
    }

    const results = await db
      .select({
        period: sql<string>`strftime('%Y-%m', ${transaction.date})`,
        income: sql<number>`SUM(CASE WHEN ${category.treatAsIncome} THEN ${transaction.amount} ELSE 0 END)`,
        expenses: sql<number>`SUM(CASE WHEN NOT ${category.treatAsIncome} THEN ${transaction.amount} ELSE 0 END)`,
      })
      .from(transaction)
      .leftJoin(category, eq(category.id, transaction.categoryId))
      .where(and(...conditions))
      .orderBy(asc(sql`strftime('%Y-%m', ${transaction.date})`))
      .groupBy(sql`strftime('%Y-%m', ${transaction.date})`);

    return results;
  });

export const getIncomeVsExpensesDataQuery = (
  data: z.infer<typeof chartDataSchema>,
) =>
  queryOptions({
    queryKey: [
      ...keys.charts.queries.incomeVsExpenses,
      getKeyFromDate(data.to),
      getKeyFromDate(data.from),
    ],
    queryFn: () =>
      $getIncomeVsExpensesData({
        data,
      }),
  });
