import { formatDateISO8601 } from "@/lib/utils";
import { db } from "@/server/db";
import { category, transaction } from "@/server/db/schema";
import { userMiddleware } from "@/server/middlewares";
import { queryOptions } from "@tanstack/react-query";
import { createServerFn } from "@tanstack/react-start";
import { and, eq, gte, lte, sql } from "drizzle-orm";
import { z } from "zod";
import { getKeyFromDate, keys } from "../keys";

export type StatsData = Awaited<ReturnType<typeof $getTopVendorData>>;

const chartDataSchema = z.object({
  to: z.date(),
  from: z.date(),
});

export const $getTopVendorData = createServerFn({
  method: "GET",
})
  .middleware([userMiddleware])
  .validator(chartDataSchema)
  .handler(async ({ context, data }) => {
    const conditions = [
      eq(transaction.userId, context.auth.user.id),
      eq(category.hideFromInsights, false),
      eq(category.treatAsIncome, false),
    ];

    if (data.to && data.from) {
      conditions.push(gte(transaction.date, formatDateISO8601(data.from)));
      conditions.push(lte(transaction.date, formatDateISO8601(data.to)));
    }

    // for each vendor get the transaction count and dollar amount
    const results = await db
      .select({
        displayVendor: transaction.displayVendor,
        transactionCount: sql<number>`COUNT(*)`,
        totalAmount: sql<number>`SUM(${transaction.amount})`,
      })
      .from(transaction)
      .innerJoin(category, eq(transaction.categoryId, category.id))
      .where(and(...conditions))
      .groupBy(transaction.displayVendor);

    // Sort results by totalAmount in descending order
    const sortedResults = results.sort((a, b) => {
      return b.transactionCount - a.transactionCount; // Sort by totalAmount descending
    });

    return sortedResults.map((result) => ({
      displayVendor: result.displayVendor,
      transactionCount: Number(result.transactionCount),
      totalAmount: Number(result.totalAmount),
    }));
  });

export const getTopVendorsDataQuery = (data: z.infer<typeof chartDataSchema>) =>
  queryOptions({
    // eslint-disable-next-line @tanstack/query/exhaustive-deps
    queryKey: [...keys.charts.queries.vendors, getKeyFromDate(data.to), getKeyFromDate(data.from)],
    queryFn: () =>
      $getTopVendorData({
        data,
      }),
  });
