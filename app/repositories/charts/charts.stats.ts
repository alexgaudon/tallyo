import { formatDateISO8601 } from "@/lib/utils";
import { db } from "@/server/db";
import { category, transaction } from "@/server/db/schema";
import { userMiddleware } from "@/server/middlewares";
import { queryOptions } from "@tanstack/react-query";
import { createServerFn } from "@tanstack/react-start";
import { and, eq, gte, lte, sql } from "drizzle-orm";
import { z } from "zod";
import { getKeyFromDate, keys } from "../keys";

export type StatsData = Awaited<ReturnType<typeof $getUserStatsData>>;

const chartDataSchema = z.object({
  to: z.date(),
  from: z.date(),
});

export const $getUserStatsData = createServerFn({
  method: "GET",
})
  .middleware([userMiddleware])
  .validator(chartDataSchema)
  .handler(async ({ context, data }) => {
    const conditions = [eq(transaction.userId, context.auth.user.id), eq(category.hideFromInsights, false)];

    if (data.to && data.from) {
      conditions.push(gte(transaction.date, formatDateISO8601(data.from)));
      conditions.push(lte(transaction.date, formatDateISO8601(data.to)));
    }

    // Basic stats with added average transaction value
    const basicStats = await db
      .select({
        count: sql<number>`COUNT(*)`,
        income: sql<number>`ABS(SUM(CASE WHEN ${category.treatAsIncome} THEN ${transaction.amount} ELSE 0 END))`,
        expenses: sql<number>`ABS(SUM(CASE WHEN NOT ${category.treatAsIncome} THEN ${transaction.amount} ELSE 0 END))`,
      })
      .from(transaction)
      .where(and(...conditions))
      .leftJoin(category, eq(category.id, transaction.categoryId));

    const stats = basicStats[0];

    // Calculate daily spending rate
    const dateFrom = data.from ? new Date(data.from) : new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
    const dateTo = data.to ? new Date(data.to) : new Date();
    const daysDiff = Math.max(1, Math.ceil((dateTo.getTime() - dateFrom.getTime()) / (1000 * 60 * 60 * 24)));

    const dailySpendingRate = stats.expenses / daysDiff;

    return {
      ...stats,
      dailySpendingRate,
    };
  });

export const getStatsDataQuery = (data: z.infer<typeof chartDataSchema>) =>
  queryOptions({
    // eslint-disable-next-line @tanstack/query/exhaustive-deps
    queryKey: [...keys.charts.queries.stats, getKeyFromDate(data.to), getKeyFromDate(data.from)],
    queryFn: () =>
      $getUserStatsData({
        data,
      }),
  });
