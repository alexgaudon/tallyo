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

const categoryDataSchema = dateRangeSchema.extend({
  income: z.boolean().optional(),
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

  const [sideRows, txRows] = await Promise.all([
    db
      .select({
        incomeAmount: sql<string>`COALESCE(SUM(${transaction.amount}) FILTER (WHERE ${category.treatAsIncome}), 0)`,
        expenseAmount: sql<string>`COALESCE(SUM(${transaction.amount}) FILTER (WHERE NOT ${category.treatAsIncome}), 0)`,
        incomeCount: sql<number>`COUNT(*) FILTER (WHERE ${category.treatAsIncome})`,
        expenseCount: sql<number>`COUNT(*) FILTER (WHERE NOT ${category.treatAsIncome})`,
      })
      .from(transaction)
      .innerJoin(category, eq(transaction.categoryId, category.id))
      .where(and(baseWhere, eq(category.hideFromInsights, false)))
      .groupBy(
        sql`EXTRACT(YEAR FROM ${transaction.date})`,
        sql`EXTRACT(MONTH FROM ${transaction.date})`,
      ),
    db
      .select({ cnt: count() })
      .from(transaction)
      .where(baseWhere)
      .groupBy(
        sql`EXTRACT(YEAR FROM ${transaction.date})`,
        sql`EXTRACT(MONTH FROM ${transaction.date})`,
      ),
  ]);

  // Months that contain at least one transaction for each side.
  const incomeMonths = sideRows.filter((r) => Number(r.incomeCount) > 0);
  const expenseMonths = sideRows.filter((r) => Number(r.expenseCount) > 0);

  if (
    incomeMonths.length === 0 &&
    expenseMonths.length === 0 &&
    txRows.length === 0
  ) {
    return null;
  }

  const sumIncome = incomeMonths.reduce(
    (a, r) => a + Math.abs(Number(r.incomeAmount ?? 0)),
    0,
  );
  const sumExpense = expenseMonths.reduce(
    (a, r) => a + Math.abs(Number(r.expenseAmount ?? 0)),
    0,
  );

  return {
    avgIncome: incomeMonths.length > 0 ? sumIncome / incomeMonths.length : 0,
    avgExpense:
      expenseMonths.length > 0 ? sumExpense / expenseMonths.length : 0,
    avgTxCount:
      txRows.length > 0
        ? Math.round(
            txRows.reduce((a, r) => a + Number(r.cnt ?? 0), 0) / txRows.length,
          )
        : 0,
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
  const rangeFilters = and(
    eq(transaction.userId, userId),
    eq(transaction.reviewed, true),
    eq(category.hideFromInsights, false),
    ...(dateRange.from ? [gte(transaction.date, dateRange.from)] : []),
    ...(dateRange.to ? [lte(transaction.date, dateRange.to)] : []),
  );

  // One grouped query over all time feeds every monthly average; one ranged
  // aggregate feeds every period total; plus a plain count. Conditional
  // FILTER aggregates replace nine near-identical scans.
  const [transactionCount, periodAgg, monthRows] = await Promise.all([
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
      .select({
        incomeAmount: sql<string>`COALESCE(SUM(${transaction.amount}) FILTER (WHERE ${category.treatAsIncome}), 0)`,
        expenseAmount: sql<string>`COALESCE(SUM(${transaction.amount}) FILTER (WHERE NOT ${category.treatAsIncome}), 0)`,
        incomeCount: sql<number>`COUNT(*) FILTER (WHERE ${category.treatAsIncome})`,
        expenseCount: sql<number>`COUNT(*) FILTER (WHERE NOT ${category.treatAsIncome})`,
      })
      .from(transaction)
      .innerJoin(category, eq(transaction.categoryId, category.id))
      .where(rangeFilters),
    db
      .select({
        incomeAmount: sql<string>`COALESCE(SUM(${transaction.amount}) FILTER (WHERE ${category.treatAsIncome}), 0)`,
        expenseAmount: sql<string>`COALESCE(SUM(${transaction.amount}) FILTER (WHERE NOT ${category.treatAsIncome}), 0)`,
        incomeCount: sql<number>`COUNT(*) FILTER (WHERE ${category.treatAsIncome})`,
        expenseCount: sql<number>`COUNT(*) FILTER (WHERE NOT ${category.treatAsIncome})`,
      })
      .from(transaction)
      .innerJoin(category, eq(transaction.categoryId, category.id))
      .where(
        and(
          eq(transaction.userId, userId),
          eq(transaction.reviewed, true),
          eq(category.hideFromInsights, false),
        ),
      )
      .groupBy(
        sql`EXTRACT(YEAR FROM ${transaction.date})`,
        sql`EXTRACT(MONTH FROM ${transaction.date})`,
      ),
  ]);

  const incomeAmount = Number(periodAgg[0]?.incomeAmount ?? 0);
  const expenseAmount = Number(periodAgg[0]?.expenseAmount ?? 0);
  const expenseTxCount = Number(periodAgg[0]?.expenseCount ?? 0);

  // Months that contain at least one transaction for each side; averages use
  // per-side month counts so a month without income doesn't dilute income.
  const incomeMonths = monthRows.filter((r) => Number(r.incomeCount) > 0);
  const expenseMonths = monthRows.filter((r) => Number(r.expenseCount) > 0);

  let avgIncomeAmountPerMonth = 0;
  if (incomeMonths.length > 0) {
    avgIncomeAmountPerMonth =
      incomeMonths.reduce(
        (acc, r) => acc + Math.abs(Number(r.incomeAmount ?? 0)),
        0,
      ) / incomeMonths.length;
  }

  let avgExpenseAmountPerMonth = 0;
  if (expenseMonths.length > 0) {
    avgExpenseAmountPerMonth =
      expenseMonths.reduce(
        (acc, r) => acc + Math.abs(Number(r.expenseAmount ?? 0)),
        0,
      ) / expenseMonths.length;
  }

  let avgIncomeTransactions = 0;
  if (incomeMonths.length > 0) {
    avgIncomeTransactions = Math.round(
      incomeMonths.reduce((acc, r) => acc + Number(r.incomeCount), 0) /
        incomeMonths.length,
    );
  }

  let avgExpenseTransactions = 0;
  if (expenseMonths.length > 0) {
    avgExpenseTransactions = Math.round(
      expenseMonths.reduce((acc, r) => acc + Number(r.expenseCount), 0) /
        expenseMonths.length,
    );
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

  const expenseSum = Math.abs(expenseAmount);
  const avgDailyExpense =
    periodLengthInDays > 0 ? Math.round(expenseSum / periodLengthInDays) : 0;
  const avgExpensePerTransaction =
    expenseTxCount > 0 ? Math.round(expenseSum / expenseTxCount) : 0;

  return {
    stats: {
      totalTransactions: transactionCount[0]?.count ?? 0,
      totalExpenses: expenseAmount,
      totalIncome: incomeAmount,
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
    .input(categoryDataSchema.optional())
    .handler(async ({ context, input }) => {
      const dateRange = input || {};
      const userId = context.session.user.id;
      const treatAsIncome = input?.income ?? false;

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
            eq(category.treatAsIncome, treatAsIncome),
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
          treatAsIncome,
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
};
