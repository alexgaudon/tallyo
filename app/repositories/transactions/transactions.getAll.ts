import { keys } from "@/repositories/keys";
import { db } from "@/server/db";
import { category, transaction } from "@/server/db/schema";
import { userMiddleware } from "@/server/middlewares";
import { queryOptions } from "@tanstack/react-query";
import { createServerFn } from "@tanstack/start";
import { and, count, desc, eq, like } from "drizzle-orm";
import { z } from "zod";

const transactionSelectFields = {
  id: transaction.id,
  amount: transaction.amount,
  vendor: transaction.vendor,
  displayVendor: transaction.displayVendor,
  date: transaction.date,
  description: transaction.description,
  category: {
    id: category.id,
    name: category.name,
    color: category.color,
    hideFromInsights: category.hideFromInsights,
    treatAsIncome: category.treatAsIncome,
  },
  reviewed: transaction.reviewed,
  externalId: transaction.externalId,
  createdAt: transaction.createdAt,
};

export type Transaction = Awaited<
  ReturnType<typeof $getUserTransactions>
>["data"][0];

const getUserTransactionsSchema = z.object({
  page: z.number(),
  categoryName: z.string().optional(),
  pageSize: z.number(),
  filter: z.string().optional(),
  unreviewed: z.boolean().optional(),
});

const $getUserTransactions = createServerFn({ method: "GET" })
  .middleware([userMiddleware])
  .validator(getUserTransactionsSchema)
  .handler(async ({ context, data }) => {
    data.page--;

    const conditions = [eq(transaction.userId, context.auth.user.id)];

    if (data.categoryName) {
      conditions.push(like(category.name, data.categoryName));
    }

    if (data.filter) {
      conditions.push(like(transaction.displayVendor, `%${data.filter}%`));
    }

    if (data.unreviewed) {
      conditions.push(eq(transaction.reviewed, false));
    }

    const orderByClause = [desc(transaction.date), desc(transaction.id)];

    const query = db
      .select(transactionSelectFields)
      .from(transaction)
      .where(and(...conditions))
      .orderBy(...orderByClause)
      .leftJoin(category, eq(category.id, transaction.categoryId));

    if (data.pageSize) query.limit(data.pageSize + 1);
    if (data.page && data.pageSize) query.offset(data.page * data.pageSize);

    const transactions = await query.execute();

    const hasMore = transactions.length > data.pageSize;

    const totalPages = await db
      .select({
        count: count(),
      })
      .from(transaction)
      .where(and(...conditions))
      .leftJoin(category, eq(category.id, transaction.categoryId))
      .execute();

    const returnValue = {
      hasMore,
      totalPages: Math.ceil((totalPages.at(-1)?.count ?? 0) / data.pageSize),
      data: hasMore ? transactions.slice(0, data.pageSize) : transactions,
    };

    return returnValue;
  });

export const getAllUserTransactionsQuery = (
  data: z.infer<typeof getUserTransactionsSchema>,
) =>
  queryOptions({
    queryKey: [
      ...keys.transactions.queries.all,
      data.filter ?? "",
      data.page,
      data.categoryName,
      data.pageSize,
      `unreviewed-${data.unreviewed ?? false}`,
    ],
    queryFn: () =>
      $getUserTransactions({
        data: {
          ...data,
        },
      }),
  });
