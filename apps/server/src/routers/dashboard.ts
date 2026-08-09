import { format } from "date-fns";
import {
  and,
  asc,
  count,
  desc,
  eq,
  gte,
  inArray,
  isNull,
  lte,
  not,
  or,
  sql,
  sum,
} from "drizzle-orm";
import { z } from "zod";
import { db } from "@/db";
import { category, merchant, transaction } from "@/db/schema";
import { protectedProcedure } from "../lib/orpc";

const dateRangeSchema = z.object({
  from: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, "Date must be in YYYY-MM-DD format")
    .optional(),
  to: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, "Date must be in YYYY-MM-DD format")
    .optional(),
});

type StatsDateRange = { from?: string; to?: string };

/** Returns same-month day range (1–31) or null if range spans months or is invalid. */
function getSameMonthDayWindow(
  from: string,
  to: string,
): { fromDay: number; toDay: number } | null {
  const [fromY, fromM, fromD] = from.split("-").map(Number);
  const [toY, toM, toD] = to.split("-").map(Number);
  if (fromY !== toY || fromM !== toM || fromD > toD) return null;
  return { fromDay: fromD, toDay: toD };
}

/** Average income/expense/transaction count for day-fromDay-to-day-toDay across all months. */
async function getWindowAverages(
  userId: string,
  fromDay: number,
  toDay: number,
): Promise<{
  avgIncome: number;
  avgExpense: number;
  avgTxCount: number;
} | null> {
  const dayGte = sql`EXTRACT(DAY FROM ${transaction.date}) >= ${fromDay}`;
  const dayLte = sql`EXTRACT(DAY FROM ${transaction.date}) <= ${toDay}`;
  const baseWhere = and(
    eq(transaction.userId, userId),
    eq(transaction.reviewed, true),
    dayGte,
    dayLte,
  );

  const [incomeRows, expenseRows, txRows] = await Promise.all([
    db
      .select({
        y: sql<number>`EXTRACT(YEAR FROM ${transaction.date})`,
        m: sql<number>`EXTRACT(MONTH FROM ${transaction.date})`,
        total: sum(transaction.amount),
      })
      .from(transaction)
      .innerJoin(category, eq(transaction.categoryId, category.id))
      .where(
        and(
          baseWhere,
          eq(category.treatAsIncome, true),
          eq(category.hideFromInsights, false),
        ),
      )
      .groupBy(
        sql`EXTRACT(YEAR FROM ${transaction.date})`,
        sql`EXTRACT(MONTH FROM ${transaction.date})`,
      ),
    db
      .select({
        y: sql<number>`EXTRACT(YEAR FROM ${transaction.date})`,
        m: sql<number>`EXTRACT(MONTH FROM ${transaction.date})`,
        total: sum(transaction.amount),
      })
      .from(transaction)
      .innerJoin(category, eq(transaction.categoryId, category.id))
      .where(
        and(
          baseWhere,
          eq(category.treatAsIncome, false),
          eq(category.hideFromInsights, false),
        ),
      )
      .groupBy(
        sql`EXTRACT(YEAR FROM ${transaction.date})`,
        sql`EXTRACT(MONTH FROM ${transaction.date})`,
      ),
    db
      .select({
        y: sql<number>`EXTRACT(YEAR FROM ${transaction.date})`,
        m: sql<number>`EXTRACT(MONTH FROM ${transaction.date})`,
        cnt: count(),
      })
      .from(transaction)
      .where(baseWhere)
      .groupBy(
        sql`EXTRACT(YEAR FROM ${transaction.date})`,
        sql`EXTRACT(MONTH FROM ${transaction.date})`,
      ),
  ]);

  if (
    incomeRows.length === 0 &&
    expenseRows.length === 0 &&
    txRows.length === 0
  ) {
    return null;
  }

  const sumIncome = incomeRows.reduce(
    (a, r) => a + Math.abs(Number(r.total ?? 0)),
    0,
  );
  const sumExpense = expenseRows.reduce(
    (a, r) => a + Math.abs(Number(r.total ?? 0)),
    0,
  );
  const sumTx = txRows.reduce((a, r) => a + (r.cnt ?? 0), 0);

  return {
    avgIncome: incomeRows.length > 0 ? sumIncome / incomeRows.length : 0,
    avgExpense: expenseRows.length > 0 ? sumExpense / expenseRows.length : 0,
    avgTxCount: txRows.length > 0 ? Math.round(sumTx / txRows.length) : 0,
  };
}

async function getStatsForDateRange(
  userId: string,
  dateRange: StatsDateRange,
): Promise<{
  stats: {
    totalTransactions: number;
    totalExpenses: number;
    totalIncome: number;
    avgIncomeTransactionsPerMonth: number;
    avgExpenseTransactionsPerMonth: number;
    avgIncomeAmountPerMonth: number;
    avgExpenseAmountPerMonth: number;
    periodLengthInDays: number;
    avgDailyExpense: number;
    avgExpensePerTransaction: number;
    avgIncomeForWindow: number | null;
    avgExpenseForWindow: number | null;
    avgTransactionCountForWindow: number | null;
  };
}> {
  const [
    transactionCount,
    expenseCount,
    incomeCount,
    expenseTransactionCount,
    incomeTransactionCount,
    avgIncomeAmountsPerMonth,
    avgExpenseAmountsPerMonth,
    avgIncomeTransactionsPerMonth,
    avgExpenseTransactionsPerMonth,
  ] = await Promise.allSettled([
    db
      .select({ count: count() })
      .from(transaction)
      .where(
        and(
          eq(transaction.userId, userId),
          ...(dateRange.from ? [gte(transaction.date, dateRange.from)] : []),
          ...(dateRange.to ? [lte(transaction.date, dateRange.to)] : []),
        ),
      ),
    db
      .select({ amount: sum(transaction.amount) })
      .from(transaction)
      .innerJoin(category, eq(transaction.categoryId, category.id))
      .where(
        and(
          eq(transaction.userId, userId),
          eq(category.treatAsIncome, false),
          eq(category.hideFromInsights, false),
          eq(transaction.reviewed, true),
          ...(dateRange.from ? [gte(transaction.date, dateRange.from)] : []),
          ...(dateRange.to ? [lte(transaction.date, dateRange.to)] : []),
        ),
      ),
    db
      .select({ amount: sum(transaction.amount) })
      .from(transaction)
      .innerJoin(category, eq(transaction.categoryId, category.id))
      .where(
        and(
          eq(transaction.userId, userId),
          eq(category.treatAsIncome, true),
          eq(category.hideFromInsights, false),
          eq(transaction.reviewed, true),
          ...(dateRange.from ? [gte(transaction.date, dateRange.from)] : []),
          ...(dateRange.to ? [lte(transaction.date, dateRange.to)] : []),
        ),
      ),
    db
      .select({ count: count() })
      .from(transaction)
      .innerJoin(category, eq(transaction.categoryId, category.id))
      .where(
        and(
          eq(transaction.userId, userId),
          eq(category.treatAsIncome, false),
          eq(category.hideFromInsights, false),
          eq(transaction.reviewed, true),
          ...(dateRange.from ? [gte(transaction.date, dateRange.from)] : []),
          ...(dateRange.to ? [lte(transaction.date, dateRange.to)] : []),
        ),
      ),
    db
      .select({ count: count() })
      .from(transaction)
      .innerJoin(category, eq(transaction.categoryId, category.id))
      .where(
        and(
          eq(transaction.userId, userId),
          eq(category.treatAsIncome, true),
          eq(category.hideFromInsights, false),
          eq(transaction.reviewed, true),
          ...(dateRange.from ? [gte(transaction.date, dateRange.from)] : []),
          ...(dateRange.to ? [lte(transaction.date, dateRange.to)] : []),
        ),
      ),
    db
      .select({
        year: sql<number>`EXTRACT(YEAR FROM ${transaction.date})`,
        month: sql<number>`EXTRACT(MONTH FROM ${transaction.date})`,
        totalAmount: sum(transaction.amount),
      })
      .from(transaction)
      .innerJoin(category, eq(transaction.categoryId, category.id))
      .where(
        and(
          eq(transaction.userId, userId),
          eq(transaction.reviewed, true),
          eq(category.treatAsIncome, true),
          eq(category.hideFromInsights, false),
        ),
      )
      .groupBy(
        sql`EXTRACT(YEAR FROM ${transaction.date})`,
        sql`EXTRACT(MONTH FROM ${transaction.date})`,
      ),
    db
      .select({
        year: sql<number>`EXTRACT(YEAR FROM ${transaction.date})`,
        month: sql<number>`EXTRACT(MONTH FROM ${transaction.date})`,
        totalAmount: sum(transaction.amount),
      })
      .from(transaction)
      .innerJoin(category, eq(transaction.categoryId, category.id))
      .where(
        and(
          eq(transaction.userId, userId),
          eq(transaction.reviewed, true),
          eq(category.treatAsIncome, false),
          eq(category.hideFromInsights, false),
        ),
      )
      .groupBy(
        sql`EXTRACT(YEAR FROM ${transaction.date})`,
        sql`EXTRACT(MONTH FROM ${transaction.date})`,
      ),
    db
      .select({
        year: sql<number>`EXTRACT(YEAR FROM ${transaction.date})`,
        month: sql<number>`EXTRACT(MONTH FROM ${transaction.date})`,
        count: count(),
      })
      .from(transaction)
      .innerJoin(category, eq(transaction.categoryId, category.id))
      .where(
        and(
          eq(transaction.userId, userId),
          eq(category.treatAsIncome, true),
          eq(category.hideFromInsights, false),
          eq(transaction.reviewed, true),
        ),
      )
      .groupBy(
        sql`EXTRACT(YEAR FROM ${transaction.date})`,
        sql`EXTRACT(MONTH FROM ${transaction.date})`,
      ),
    db
      .select({
        year: sql<number>`EXTRACT(YEAR FROM ${transaction.date})`,
        month: sql<number>`EXTRACT(MONTH FROM ${transaction.date})`,
        count: count(),
      })
      .from(transaction)
      .innerJoin(category, eq(transaction.categoryId, category.id))
      .where(
        and(
          eq(transaction.userId, userId),
          eq(category.treatAsIncome, false),
          eq(category.hideFromInsights, false),
          eq(transaction.reviewed, true),
        ),
      )
      .groupBy(
        sql`EXTRACT(YEAR FROM ${transaction.date})`,
        sql`EXTRACT(MONTH FROM ${transaction.date})`,
      ),
  ]);

  let avgIncomeAmountPerMonth = 0;
  let avgExpenseAmountPerMonth = 0;
  let avgIncomeTransactions = 0;
  let avgExpenseTransactions = 0;

  if (
    avgIncomeAmountsPerMonth.status === "fulfilled" &&
    avgIncomeAmountsPerMonth.value.length > 0
  ) {
    const totalIncomeAmount = avgIncomeAmountsPerMonth.value.reduce(
      (sum, month) => sum + Math.abs(Number(month.totalAmount || 0)),
      0,
    );
    avgIncomeAmountPerMonth =
      totalIncomeAmount / avgIncomeAmountsPerMonth.value.length;
  } else {
    const totalIncomeAmount =
      incomeCount.status === "fulfilled" && incomeCount.value[0].amount
        ? Math.abs(Number(incomeCount.value[0].amount))
        : 0;
    if (totalIncomeAmount > 0) avgIncomeAmountPerMonth = totalIncomeAmount / 6;
  }

  if (
    avgExpenseAmountsPerMonth.status === "fulfilled" &&
    avgExpenseAmountsPerMonth.value.length > 0
  ) {
    const totalExpenseAmount = avgExpenseAmountsPerMonth.value.reduce(
      (sum, month) => sum + Math.abs(Number(month.totalAmount || 0)),
      0,
    );
    avgExpenseAmountPerMonth =
      totalExpenseAmount / avgExpenseAmountsPerMonth.value.length;
  } else {
    const totalExpenseAmount =
      expenseCount.status === "fulfilled" && expenseCount.value[0].amount
        ? Math.abs(Number(expenseCount.value[0].amount))
        : 0;
    if (totalExpenseAmount > 0)
      avgExpenseAmountPerMonth = totalExpenseAmount / 6;
  }

  if (
    avgIncomeTransactionsPerMonth.status === "fulfilled" &&
    avgIncomeTransactionsPerMonth.value.length > 0
  ) {
    const totalIncomeTransactions = avgIncomeTransactionsPerMonth.value.reduce(
      (sum, month) => sum + (month.count || 0),
      0,
    );
    avgIncomeTransactions = Math.round(
      totalIncomeTransactions / avgIncomeTransactionsPerMonth.value.length,
    );
  } else {
    const totalIncomeCount =
      incomeTransactionCount.status === "fulfilled"
        ? incomeTransactionCount.value[0].count
        : 0;
    if (totalIncomeCount > 0)
      avgIncomeTransactions = Math.round(totalIncomeCount / 6);
  }

  if (
    avgExpenseTransactionsPerMonth.status === "fulfilled" &&
    avgExpenseTransactionsPerMonth.value.length > 0
  ) {
    const totalExpenseTransactions =
      avgExpenseTransactionsPerMonth.value.reduce(
        (sum, month) => sum + (month.count || 0),
        0,
      );
    avgExpenseTransactions = Math.round(
      totalExpenseTransactions / avgExpenseTransactionsPerMonth.value.length,
    );
  } else {
    const totalExpenseCount =
      expenseTransactionCount.status === "fulfilled"
        ? expenseTransactionCount.value[0].count
        : 0;
    if (totalExpenseCount > 0)
      avgExpenseTransactions = Math.round(totalExpenseCount / 6);
  }

  let periodLengthInDays = 30;
  if (dateRange.from && dateRange.to) {
    const fromDate = new Date(dateRange.from);
    const toDate = new Date(dateRange.to);
    periodLengthInDays =
      Math.ceil(
        Math.abs(toDate.getTime() - fromDate.getTime()) / (1000 * 60 * 60 * 24),
      ) + 1;
  }

  let avgIncomeForWindow: number | null = null;
  let avgExpenseForWindow: number | null = null;
  let avgTransactionCountForWindow: number | null = null;
  if (dateRange.from && dateRange.to) {
    const window = getSameMonthDayWindow(dateRange.from, dateRange.to);
    if (window) {
      const windowAvgs = await getWindowAverages(
        userId,
        window.fromDay,
        window.toDay,
      );
      if (windowAvgs) {
        avgIncomeForWindow = Math.round(windowAvgs.avgIncome);
        avgExpenseForWindow = Math.round(windowAvgs.avgExpense);
        avgTransactionCountForWindow = windowAvgs.avgTxCount;
      }
    }
  }

  const expenseSum = (() => {
    if (expenseCount.status !== "fulfilled" || !expenseCount.value[0].amount) {
      return 0;
    }
    return Math.abs(Number(expenseCount.value[0].amount));
  })();
  const expenseTxCount =
    expenseTransactionCount.status === "fulfilled"
      ? expenseTransactionCount.value[0].count
      : 0;

  const avgDailyExpense =
    periodLengthInDays > 0 ? Math.round(expenseSum / periodLengthInDays) : 0;
  const avgExpensePerTransaction =
    expenseTxCount > 0 ? Math.round(expenseSum / expenseTxCount) : 0;

  return {
    stats: {
      totalTransactions:
        transactionCount.status === "fulfilled"
          ? transactionCount.value[0].count
          : 0,
      totalExpenses:
        expenseCount.status === "fulfilled" && expenseCount.value[0].amount
          ? Number(expenseCount.value[0].amount)
          : 0,
      totalIncome:
        incomeCount.status === "fulfilled" && incomeCount.value[0].amount
          ? Number(incomeCount.value[0].amount)
          : 0,
      avgIncomeTransactionsPerMonth: avgIncomeTransactions,
      avgExpenseTransactionsPerMonth: avgExpenseTransactions,
      avgIncomeAmountPerMonth: avgIncomeAmountPerMonth,
      avgExpenseAmountPerMonth: avgExpenseAmountPerMonth,
      periodLengthInDays,
      avgDailyExpense,
      avgExpensePerTransaction,
      avgIncomeForWindow,
      avgExpenseForWindow,
      avgTransactionCountForWindow,
    },
  };
}

export const dashboardRouter = {
  getMerchantStats: protectedProcedure
    .input(dateRangeSchema.optional())
    .handler(async ({ context, input }) => {
      const dateRange = input || {};
      try {
        const merchantStats = await db
          .select({
            merchantId: merchant.id,
            merchantName: merchant.name,
            totalAmount: sum(transaction.amount),
            count: count(),
          })
          .from(transaction)
          .innerJoin(merchant, eq(transaction.merchantId, merchant.id))
          .innerJoin(category, eq(transaction.categoryId, category.id))
          .where(
            and(
              eq(transaction.reviewed, true),
              eq(category.hideFromInsights, false),
              eq(transaction.userId, context.session.user.id),
              not(eq(category.treatAsIncome, true)),
              ...(dateRange.from
                ? [gte(transaction.date, dateRange.from)]
                : []),
              ...(dateRange.to ? [lte(transaction.date, dateRange.to)] : []),
            ),
          )
          .groupBy(merchant.id, merchant.name)
          .orderBy(asc(sum(transaction.amount)))
          .limit(5);
        return merchantStats;
      } catch (error) {
        console.error("Error fetching merchant stats:", error);
        throw error;
      }
    }),
  getTransactionStats: protectedProcedure
    .input(dateRangeSchema.optional())
    .handler(async ({ context, input }) => {
      const dateRange = input || {};
      try {
        const transactionStats = await db
          .select({
            id: transaction.id,
            amount: transaction.amount,
            date: transaction.date,
            transactionDetails: transaction.transactionDetails,
            notes: transaction.notes,
            merchantName: merchant.name,
            categoryName: category.name,
          })
          .from(transaction)
          .leftJoin(merchant, eq(transaction.merchantId, merchant.id))
          .leftJoin(category, eq(transaction.categoryId, category.id))
          .where(
            and(
              eq(transaction.reviewed, true),
              eq(transaction.userId, context.session.user.id),
              or(
                isNull(category.id),
                and(
                  not(eq(category.treatAsIncome, true)),
                  eq(category.hideFromInsights, false),
                ),
              ),
              ...(dateRange.from
                ? [gte(transaction.date, dateRange.from)]
                : []),
              ...(dateRange.to ? [lte(transaction.date, dateRange.to)] : []),
            ),
          )
          .orderBy(sql`${transaction.amount} ASC`)
          .limit(5);
        return transactionStats;
      } catch (error) {
        console.error("Error fetching transaction stats:", error);
        throw error;
      }
    }),
  getCategoryData: protectedProcedure
    .input(dateRangeSchema.optional())
    .handler(async ({ context, input }) => {
      const dateRange = input || {};
      const userId = context.session.user.id;

      const result = await db
        .select({
          amount: sum(transaction.amount),
          transactionCount: count(),
          category: {
            id: category.id,
            name: category.name,
            icon: category.icon,
            parentCategoryId: category.parentCategoryId,
          },
        })
        .from(transaction)
        .innerJoin(category, eq(transaction.categoryId, category.id))
        .where(
          and(
            eq(transaction.userId, userId),
            eq(transaction.reviewed, true),
            eq(category.hideFromInsights, false),
            eq(category.treatAsIncome, false),
            ...(dateRange.from ? [gte(transaction.date, dateRange.from)] : []),
            ...(dateRange.to ? [lte(transaction.date, dateRange.to)] : []),
          ),
        )
        .groupBy(
          category.id,
          category.name,
          category.icon,
          category.parentCategoryId,
        )
        .orderBy(desc(sum(transaction.amount)));

      const parentCategoryIds = result
        .map((item) => item.category.parentCategoryId)
        .filter(Boolean) as string[];

      const parentCategories =
        parentCategoryIds.length > 0
          ? await db
              .select({
                id: category.id,
                name: category.name,
                icon: category.icon,
                userId: category.userId,
                parentCategoryId: category.parentCategoryId,
                treatAsIncome: category.treatAsIncome,
                hideFromInsights: category.hideFromInsights,
                createdAt: category.createdAt,
                updatedAt: category.updatedAt,
              })
              .from(category)
              .where(
                and(
                  eq(category.userId, userId),
                  inArray(category.id, parentCategoryIds),
                ),
              )
          : [];

      const parentCategoryMap = new Map(
        parentCategories.map((parent) => [parent.id, parent]),
      );

      return result.map((item) => ({
        amount: Math.abs(Number(item.amount ?? 0)),
        count: Number(item.transactionCount ?? 0),
        category: {
          id: item.category.id,
          name: item.category.name,
          icon: item.category.icon,
          userId,
          parentCategoryId: item.category.parentCategoryId,
          treatAsIncome: false,
          hideFromInsights: false,
          createdAt: new Date(),
          updatedAt: new Date(),
          parentCategory: item.category.parentCategoryId
            ? (parentCategoryMap.get(item.category.parentCategoryId) ?? null)
            : null,
        },
      }));
    }),
  getSankeyData: protectedProcedure
    .input(dateRangeSchema.optional())
    .handler(async ({ context, input }) => {
      const dateRange = input || {};
      const userId = context.session.user.id;

      // Get total income
      const incomeResult = await db
        .select({ amount: sum(transaction.amount) })
        .from(transaction)
        .innerJoin(category, eq(transaction.categoryId, category.id))
        .where(
          and(
            eq(transaction.userId, userId),
            eq(transaction.reviewed, true),
            eq(category.treatAsIncome, true),
            eq(category.hideFromInsights, false),
            ...(dateRange.from ? [gte(transaction.date, dateRange.from)] : []),
            ...(dateRange.to ? [lte(transaction.date, dateRange.to)] : []),
          ),
        );

      const totalIncome = Math.abs(Number(incomeResult[0]?.amount ?? 0));

      // Get expenses by category
      const expenseResult = await db
        .select({
          amount: sum(transaction.amount),
          category: {
            id: category.id,
            name: category.name,
            icon: category.icon,
            parentCategoryId: category.parentCategoryId,
          },
        })
        .from(transaction)
        .innerJoin(category, eq(transaction.categoryId, category.id))
        .where(
          and(
            eq(transaction.userId, userId),
            eq(transaction.reviewed, true),
            eq(category.treatAsIncome, false),
            eq(category.hideFromInsights, false),
            ...(dateRange.from ? [gte(transaction.date, dateRange.from)] : []),
            ...(dateRange.to ? [lte(transaction.date, dateRange.to)] : []),
          ),
        )
        .groupBy(
          category.id,
          category.name,
          category.icon,
          category.parentCategoryId,
        );

      // Fetch parent categories for categories that have them
      const parentCategoryIds = expenseResult
        .map((item) => item.category.parentCategoryId)
        .filter(Boolean) as string[];

      const parentCategories =
        parentCategoryIds.length > 0
          ? await db
              .select({
                id: category.id,
                name: category.name,
                icon: category.icon,
                userId: category.userId,
                parentCategoryId: category.parentCategoryId,
                treatAsIncome: category.treatAsIncome,
                hideFromInsights: category.hideFromInsights,
                createdAt: category.createdAt,
                updatedAt: category.updatedAt,
              })
              .from(category)
              .where(
                and(
                  eq(category.userId, userId),
                  inArray(category.id, parentCategoryIds),
                ),
              )
          : [];

      const parentCategoryMap = new Map(
        parentCategories.map((parent) => [parent.id, parent]),
      );

      // Transform expense data with parent category info
      const expensesByCategory = expenseResult.map((item) => ({
        amount: Math.abs(Number(item.amount ?? 0)),
        category: {
          ...item.category,
          userId: context.session.user.id,
          treatAsIncome: false,
          hideFromInsights: false,
          createdAt: new Date(),
          updatedAt: new Date(),
          parentCategory: item.category.parentCategoryId
            ? (parentCategoryMap.get(item.category.parentCategoryId) ?? null)
            : null,
        },
      }));

      // Calculate total expenses
      const totalExpenses = expensesByCategory.reduce(
        (sum, item) => sum + item.amount,
        0,
      );

      // Calculate saved amount (income - expenses)
      const savedAmount = Math.max(0, totalIncome - totalExpenses);

      return {
        totalIncome,
        totalExpenses,
        savedAmount,
        expensesByCategory,
      };
    }),
  getStatsCounts: protectedProcedure
    .input(dateRangeSchema.optional())
    .handler(async ({ context, input }) => {
      return getStatsForDateRange(context.session.user.id, input || {});
    }),
  getPeriodComparison: protectedProcedure
    .input(dateRangeSchema.optional())
    .handler(async ({ context, input }) => {
      const dateRange = input || {};
      const userId = context.session.user.id;

      if (!dateRange.from || !dateRange.to) {
        return {
          hasPrevious: false,
          totals: null,
          categories: [],
          merchants: [],
        };
      }

      const fromDate = new Date(dateRange.from);
      const toDate = new Date(dateRange.to);
      const periodLength =
        Math.ceil(
          Math.abs(toDate.getTime() - fromDate.getTime()) /
            (1000 * 60 * 60 * 24),
        ) + 1;

      const prevFromDate = new Date(fromDate);
      prevFromDate.setDate(prevFromDate.getDate() - periodLength);
      const prevToDate = new Date(fromDate);
      prevToDate.setDate(prevToDate.getDate() - 1);

      const prevFrom = format(prevFromDate, "yyyy-MM-dd");
      const prevTo = format(prevToDate, "yyyy-MM-dd");

      const [income, expenses, txCount, categories, merchants] =
        await Promise.all([
          db
            .select({ amount: sum(transaction.amount) })
            .from(transaction)
            .innerJoin(category, eq(transaction.categoryId, category.id))
            .where(
              and(
                eq(transaction.userId, userId),
                eq(transaction.reviewed, true),
                eq(category.treatAsIncome, true),
                eq(category.hideFromInsights, false),
                gte(transaction.date, prevFrom),
                lte(transaction.date, prevTo),
              ),
            ),
          db
            .select({ amount: sum(transaction.amount) })
            .from(transaction)
            .innerJoin(category, eq(transaction.categoryId, category.id))
            .where(
              and(
                eq(transaction.userId, userId),
                eq(transaction.reviewed, true),
                eq(category.treatAsIncome, false),
                eq(category.hideFromInsights, false),
                gte(transaction.date, prevFrom),
                lte(transaction.date, prevTo),
              ),
            ),
          db
            .select({ count: count() })
            .from(transaction)
            .where(
              and(
                eq(transaction.userId, userId),
                gte(transaction.date, prevFrom),
                lte(transaction.date, prevTo),
              ),
            ),
          db
            .select({
              categoryId: category.id,
              amount: sum(transaction.amount),
            })
            .from(transaction)
            .innerJoin(category, eq(transaction.categoryId, category.id))
            .where(
              and(
                eq(transaction.userId, userId),
                eq(transaction.reviewed, true),
                eq(category.treatAsIncome, false),
                eq(category.hideFromInsights, false),
                gte(transaction.date, prevFrom),
                lte(transaction.date, prevTo),
              ),
            )
            .groupBy(category.id),
          db
            .select({
              merchantId: merchant.id,
              totalAmount: sum(transaction.amount),
            })
            .from(transaction)
            .innerJoin(merchant, eq(transaction.merchantId, merchant.id))
            .innerJoin(category, eq(transaction.categoryId, category.id))
            .where(
              and(
                eq(transaction.userId, userId),
                eq(transaction.reviewed, true),
                eq(category.hideFromInsights, false),
                not(eq(category.treatAsIncome, true)),
                gte(transaction.date, prevFrom),
                lte(transaction.date, prevTo),
              ),
            )
            .groupBy(merchant.id),
        ]);

      return {
        hasPrevious: true,
        totals: {
          totalIncome: Math.abs(Number(income[0]?.amount ?? 0)),
          totalExpenses: Math.abs(Number(expenses[0]?.amount ?? 0)),
          totalTransactions: txCount[0]?.count ?? 0,
        },
        categories: categories.map((row) => ({
          categoryId: row.categoryId,
          amount: Math.abs(Number(row.amount ?? 0)),
        })),
        merchants: merchants.map((row) => ({
          merchantId: row.merchantId,
          totalAmount: Math.abs(Number(row.totalAmount ?? 0)),
        })),
      };
    }),
  getDataQuality: protectedProcedure
    .input(dateRangeSchema.optional())
    .handler(async ({ context, input }) => {
      const dateRange = input || {};
      const userId = context.session.user.id;

      const [total, reviewed, uncategorized] = await Promise.all([
        db
          .select({ count: count() })
          .from(transaction)
          .where(
            and(
              eq(transaction.userId, userId),
              ...(dateRange.from
                ? [gte(transaction.date, dateRange.from)]
                : []),
              ...(dateRange.to ? [lte(transaction.date, dateRange.to)] : []),
            ),
          ),
        db
          .select({ count: count() })
          .from(transaction)
          .where(
            and(
              eq(transaction.userId, userId),
              eq(transaction.reviewed, true),
              ...(dateRange.from
                ? [gte(transaction.date, dateRange.from)]
                : []),
              ...(dateRange.to ? [lte(transaction.date, dateRange.to)] : []),
            ),
          ),
        db
          .select({ count: count() })
          .from(transaction)
          .where(
            and(
              eq(transaction.userId, userId),
              isNull(transaction.categoryId),
              ...(dateRange.from
                ? [gte(transaction.date, dateRange.from)]
                : []),
              ...(dateRange.to ? [lte(transaction.date, dateRange.to)] : []),
            ),
          ),
      ]);

      return {
        totalTransactions: total[0]?.count ?? 0,
        reviewedTransactions: reviewed[0]?.count ?? 0,
        uncategorizedTransactions: uncategorized[0]?.count ?? 0,
      };
    }),
};
