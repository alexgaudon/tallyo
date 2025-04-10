import { formatDateISO8601 } from "@/lib/utils";
import { getKeyFromDate, keys } from "@/repositories/keys";
import { db } from "@/server/db";
import { category, transaction } from "@/server/db/schema";
import { userMiddleware } from "@/server/middlewares";
import { queryOptions } from "@tanstack/react-query";
import { createServerFn } from "@tanstack/react-start";
import { and, between, eq, sql } from "drizzle-orm";
import { z } from "zod";

const chartDataSchema = z.object({
  to: z.date().optional(),
  from: z.date().optional(),
});

export const $getCategoryBreakdownData = createServerFn({
  method: "GET",
})
  .validator(chartDataSchema)
  .middleware([userMiddleware])
  .handler(async ({ context, data }) => {
    const conditions = [
      eq(transaction.userId, context.auth.user.id),
      eq(category.treatAsIncome, false),
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
        count: sql<number>`COUNT(*)`,
        amount: sql<number>`SUM(${transaction.amount})`,
        name: category.name,
        color: category.color,
      })
      .from(transaction)
      .where(and(...conditions))
      .groupBy(category.id)
      .leftJoin(category, eq(category.id, transaction.categoryId));

    return results;
  });

export const getCategoryBreakdownQuery = (
  data: z.infer<typeof chartDataSchema>,
) =>
  queryOptions({
    // eslint-disable-next-line @tanstack/query/exhaustive-deps
    queryKey: [
      ...keys.charts.queries.categoryBreakdown,
      getKeyFromDate(data.to),
      getKeyFromDate(data.from),
    ],
    queryFn: () =>
      $getCategoryBreakdownData({
        data,
      }),
  });
