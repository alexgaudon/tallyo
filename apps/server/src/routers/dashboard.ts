import {
	and,
	asc,
	count,
	eq,
	gte,
	inArray,
	isNotNull,
	isNull,
	lte,
	not,
	or,
	type SQL,
	sql,
	sum,
} from "drizzle-orm";
import { z } from "zod";
import { db } from "@/db";
import { category, merchant, merchantKeyword, transaction } from "@/db/schema";
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

// Helper function to calculate standard deviation
function calculateStandardDeviation(values: number[]): number {
	if (values.length === 0) return 0;

	const mean = values.reduce((sum, val) => sum + val, 0) / values.length;
	const squaredDifferences = values.map((val) => (val - mean) ** 2);
	const variance =
		squaredDifferences.reduce((sum, val) => sum + val, 0) / values.length;

	return Math.sqrt(variance);
}

// Helper function to calculate volatility
function _calculateVolatility(values: number[]): number {
	if (values.length === 0) return 0;

	// Treat all values as absolute for volatility
	const absValues = values.map(Math.abs);
	const mean = absValues.reduce((sum, val) => sum + val, 0) / absValues.length;
	if (mean === 0) return 0;

	const standardDeviation = calculateStandardDeviation(absValues);
	return (standardDeviation / mean) * 100;
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
	getCategoryData: protectedProcedure
		.input(dateRangeSchema.optional())
		.handler(async ({ context, input }) => {
			const dateRange = input || {};

			// Calculate the date 12 months ago from the current date
			const twelveMonthsAgo = new Date();
			twelveMonthsAgo.setMonth(twelveMonthsAgo.getMonth() - 12);

			const categoryData = await db
				.select({
					amount: sum(transaction.amount),
					count: count(),
					category: {
						id: category.id,
						name: category.name,
						userId: category.userId,
						parentCategoryId: category.parentCategoryId,
						icon: category.icon,
						treatAsIncome: category.treatAsIncome,
						hideFromInsights: category.hideFromInsights,
						createdAt: category.createdAt,
						updatedAt: category.updatedAt,
					},
				})
				.from(transaction)
				.innerJoin(category, eq(transaction.categoryId, category.id))
				.where(
					and(
						eq(transaction.userId, context.session.user.id),
						eq(transaction.reviewed, true),
						...(dateRange.from ? [gte(transaction.date, dateRange.from)] : []),
						...(dateRange.to ? [lte(transaction.date, dateRange.to)] : []),
					),
				)
				.groupBy(
					category.id,
					category.name,
					category.userId,
					category.parentCategoryId,
					category.icon,
					category.treatAsIncome,
					category.hideFromInsights,
					category.createdAt,
					category.updatedAt,
				);

			// Get 12-month averages for each category
			const categoryAverages = await db
				.select({
					categoryId: transaction.categoryId,
					year: sql<number>`EXTRACT(YEAR FROM ${transaction.date})`,
					month: sql<number>`EXTRACT(MONTH FROM ${transaction.date})`,
					monthlyTotal: sum(transaction.amount),
				})
				.from(transaction)
				.innerJoin(category, eq(transaction.categoryId, category.id))
				.where(
					and(
						eq(transaction.userId, context.session.user.id),
						eq(transaction.reviewed, true),
						gte(transaction.date, twelveMonthsAgo.toISOString().split("T")[0]),
					),
				)
				.groupBy(
					transaction.categoryId,
					sql`EXTRACT(YEAR FROM ${transaction.date})`,
					sql`EXTRACT(MONTH FROM ${transaction.date})`,
				);

			// Calculate averages for each category
			const categoryAverageMap = new Map<
				string,
				{ total: number; count: number }
			>();

			for (const item of categoryAverages) {
				if (!item.categoryId) continue;

				const existing = categoryAverageMap.get(item.categoryId) || {
					total: 0,
					count: 0,
				};
				existing.total += Math.abs(Number(item.monthlyTotal));
				existing.count += 1;
				categoryAverageMap.set(item.categoryId, existing);
			}

			// Convert totals to averages
			const finalAverages = new Map<string, number>();
			for (const [categoryId, data] of categoryAverageMap.entries()) {
				finalAverages.set(
					categoryId,
					data.count > 0 ? data.total / data.count : 0,
				);
			}

			// Fetch parent categories for categories that have them
			const parentCategoryIds = categoryData
				.map((item) => item.category.parentCategoryId)
				.filter(Boolean) as string[];

			const parentCategories =
				parentCategoryIds.length > 0
					? await db
							.select({
								id: category.id,
								name: category.name,
								userId: category.userId,
								parentCategoryId: category.parentCategoryId,
								icon: category.icon,
								treatAsIncome: category.treatAsIncome,
								hideFromInsights: category.hideFromInsights,
								createdAt: category.createdAt,
								updatedAt: category.updatedAt,
							})
							.from(category)
							.where(
								and(
									eq(category.userId, context.session.user.id),
									inArray(category.id, parentCategoryIds),
								),
							)
					: [];

			// Create a map of parent categories for quick lookup
			const parentCategoryMap = new Map(
				parentCategories.map((parent) => [parent.id, parent]),
			);

			// Transform the data to include parent category information and 12-month average
			const transformedData = categoryData.map((item) => ({
				amount: item.amount,
				count: item.count,
				average12Months: finalAverages.get(item.category.id) || 0,
				category: {
					...item.category,
					parentCategory: item.category.parentCategoryId
						? parentCategoryMap.get(item.category.parentCategoryId) || null
						: null,
				},
			}));

			return transformedData;
		}),
	getStatsCounts: protectedProcedure
		.input(dateRangeSchema.optional())
		.handler(async ({ context, input }) => {
			const dateRange = input || {};

			if (dateRange.from && dateRange.to) {
				const toDate = new Date(dateRange.to);
				const currentDay = toDate.getDate();

				// Get historical data for the same day of month across previous months
				const historicalIncomeData = await db
					.select({
						year: sql<number>`EXTRACT(YEAR FROM ${transaction.date})`,
						month: sql<number>`EXTRACT(MONTH FROM ${transaction.date})`,
						day: sql<number>`EXTRACT(DAY FROM ${transaction.date})`,
						totalAmount: sum(transaction.amount),
					})
					.from(transaction)
					.innerJoin(category, eq(transaction.categoryId, category.id))
					.where(
						and(
							eq(transaction.userId, context.session.user.id),
							eq(transaction.reviewed, true),
							eq(category.treatAsIncome, true),
							eq(category.hideFromInsights, false),
							sql`EXTRACT(DAY FROM ${transaction.date}) <= ${currentDay}`,
							// Exclude current month to avoid bias
							sql`NOT (EXTRACT(YEAR FROM ${transaction.date}) = ${toDate.getFullYear()} AND EXTRACT(MONTH FROM ${transaction.date}) = ${toDate.getMonth() + 1})`,
						),
					)
					.groupBy(
						sql`EXTRACT(YEAR FROM ${transaction.date})`,
						sql`EXTRACT(MONTH FROM ${transaction.date})`,
						sql`EXTRACT(DAY FROM ${transaction.date})`,
					);

				const historicalExpenseData = await db
					.select({
						year: sql<number>`EXTRACT(YEAR FROM ${transaction.date})`,
						month: sql<number>`EXTRACT(MONTH FROM ${transaction.date})`,
						day: sql<number>`EXTRACT(DAY FROM ${transaction.date})`,
						totalAmount: sum(transaction.amount),
					})
					.from(transaction)
					.innerJoin(category, eq(transaction.categoryId, category.id))
					.where(
						and(
							eq(transaction.userId, context.session.user.id),
							eq(transaction.reviewed, true),
							eq(category.treatAsIncome, false),
							eq(category.hideFromInsights, false),
							sql`EXTRACT(DAY FROM ${transaction.date}) <= ${currentDay}`,
							// Exclude current month to avoid bias
							sql`NOT (EXTRACT(YEAR FROM ${transaction.date}) = ${toDate.getFullYear()} AND EXTRACT(MONTH FROM ${transaction.date}) = ${toDate.getMonth() + 1})`,
						),
					)
					.groupBy(
						sql`EXTRACT(YEAR FROM ${transaction.date})`,
						sql`EXTRACT(MONTH FROM ${transaction.date})`,
						sql`EXTRACT(DAY FROM ${transaction.date})`,
					);

				// Group by month and sum up to the current day
				const monthlyIncomeMap = new Map<string, number>();
				const monthlyExpenseMap = new Map<string, number>();

				for (const item of historicalIncomeData) {
					const monthKey = `${item.year}-${item.month}`;
					const existing = monthlyIncomeMap.get(monthKey) || 0;
					monthlyIncomeMap.set(
						monthKey,
						existing + Math.abs(Number(item.totalAmount)),
					);
				}

				for (const item of historicalExpenseData) {
					const monthKey = `${item.year}-${item.month}`;
					const existing = monthlyExpenseMap.get(monthKey) || 0;
					monthlyExpenseMap.set(
						monthKey,
						existing + Math.abs(Number(item.totalAmount)),
					);
				}
			}

			const [
				transactionCount,
				categoryCount,
				merchantCount,
				merchantKeywordCount,
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
					.select({
						count: count(),
					})
					.from(transaction)
					.where(
						and(
							eq(transaction.userId, context.session.user.id),
							...(dateRange.from
								? [gte(transaction.date, dateRange.from)]
								: []),
							...(dateRange.to ? [lte(transaction.date, dateRange.to)] : []),
						),
					),
				db
					.select({
						count: count(),
					})
					.from(category)
					.where(eq(category.userId, context.session.user.id)),
				db
					.select({
						count: count(),
					})
					.from(merchant)
					.where(eq(merchant.userId, context.session.user.id)),
				db
					.select({
						count: count(),
					})
					.from(merchantKeyword)
					.where(eq(merchantKeyword.userId, context.session.user.id)),
				db
					.select({
						amount: sum(transaction.amount),
					})
					.from(transaction)
					.innerJoin(category, eq(transaction.categoryId, category.id))
					.where(
						and(
							eq(transaction.userId, context.session.user.id),
							eq(category.treatAsIncome, false),
							eq(category.hideFromInsights, false),
							eq(transaction.reviewed, true),
							...(dateRange.from
								? [gte(transaction.date, dateRange.from)]
								: []),
							...(dateRange.to ? [lte(transaction.date, dateRange.to)] : []),
						),
					),
				db
					.select({
						amount: sum(transaction.amount),
					})
					.from(transaction)
					.innerJoin(category, eq(transaction.categoryId, category.id))
					.where(
						and(
							eq(transaction.userId, context.session.user.id),
							eq(category.treatAsIncome, true),
							eq(category.hideFromInsights, false),
							eq(transaction.reviewed, true),
							...(dateRange.from
								? [gte(transaction.date, dateRange.from)]
								: []),
							...(dateRange.to ? [lte(transaction.date, dateRange.to)] : []),
						),
					),
				// Count expense transactions
				db
					.select({
						count: count(),
					})
					.from(transaction)
					.innerJoin(category, eq(transaction.categoryId, category.id))
					.where(
						and(
							eq(transaction.userId, context.session.user.id),
							eq(category.treatAsIncome, false),
							eq(category.hideFromInsights, false),
							eq(transaction.reviewed, true),
							...(dateRange.from
								? [gte(transaction.date, dateRange.from)]
								: []),
							...(dateRange.to ? [lte(transaction.date, dateRange.to)] : []),
						),
					),
				// Count income transactions
				db
					.select({
						count: count(),
					})
					.from(transaction)
					.innerJoin(category, eq(transaction.categoryId, category.id))
					.where(
						and(
							eq(transaction.userId, context.session.user.id),
							eq(category.treatAsIncome, true),
							eq(category.hideFromInsights, false),
							eq(transaction.reviewed, true),
							...(dateRange.from
								? [gte(transaction.date, dateRange.from)]
								: []),
							...(dateRange.to ? [lte(transaction.date, dateRange.to)] : []),
						),
					),
				// Get all income amounts grouped by month for averages
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
							eq(transaction.userId, context.session.user.id),
							eq(transaction.reviewed, true),
							eq(category.treatAsIncome, true),
							eq(category.hideFromInsights, false),
						),
					)
					.groupBy(
						sql`EXTRACT(YEAR FROM ${transaction.date})`,
						sql`EXTRACT(MONTH FROM ${transaction.date})`,
					),
				// Get all expense amounts grouped by month for averages
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
							eq(transaction.userId, context.session.user.id),
							eq(transaction.reviewed, true),
							eq(category.treatAsIncome, false),
							eq(category.hideFromInsights, false),
						),
					)
					.groupBy(
						sql`EXTRACT(YEAR FROM ${transaction.date})`,
						sql`EXTRACT(MONTH FROM ${transaction.date})`,
					),
				// Calculate average income transactions per month (all time)
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
							eq(transaction.userId, context.session.user.id),
							eq(category.treatAsIncome, true),
							eq(category.hideFromInsights, false),
							eq(transaction.reviewed, true),
						),
					)
					.groupBy(
						sql`EXTRACT(YEAR FROM ${transaction.date})`,
						sql`EXTRACT(MONTH FROM ${transaction.date})`,
					),
				// Calculate average expense transactions per month (all time)
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
							eq(transaction.userId, context.session.user.id),
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

			// Calculate average monthly amounts and transaction counts
			let avgIncomeAmountPerMonth = 0;
			let avgExpenseAmountPerMonth = 0;
			let avgIncomeTransactions = 0;
			let avgExpenseTransactions = 0;

			// Calculate average income amount per month
			if (
				avgIncomeAmountsPerMonth.status === "fulfilled" &&
				avgIncomeAmountsPerMonth.value.length > 0
			) {
				const totalIncomeAmount = avgIncomeAmountsPerMonth.value.reduce(
					(sum, month) => sum + Math.abs(Number(month.totalAmount || 0)),
					0,
				);
				const monthCount = avgIncomeAmountsPerMonth.value.length;
				avgIncomeAmountPerMonth = totalIncomeAmount / monthCount;
			} else {
				// Fallback: estimate based on total income and rough month count
				const totalIncomeAmount =
					incomeCount.status === "fulfilled" && incomeCount.value[0].amount
						? Math.abs(Number(incomeCount.value[0].amount))
						: 0;
				if (totalIncomeAmount > 0) {
					// Rough estimate: assume data spans about 6 months
					avgIncomeAmountPerMonth = totalIncomeAmount / 6;
				}
			}

			// Calculate average expense amount per month
			if (
				avgExpenseAmountsPerMonth.status === "fulfilled" &&
				avgExpenseAmountsPerMonth.value.length > 0
			) {
				const totalExpenseAmount = avgExpenseAmountsPerMonth.value.reduce(
					(sum, month) => sum + Math.abs(Number(month.totalAmount || 0)),
					0,
				);
				const monthCount = avgExpenseAmountsPerMonth.value.length;
				avgExpenseAmountPerMonth = totalExpenseAmount / monthCount;
			} else {
				// Fallback: estimate based on total expenses and rough month count
				const totalExpenseAmount =
					expenseCount.status === "fulfilled" && expenseCount.value[0].amount
						? Math.abs(Number(expenseCount.value[0].amount))
						: 0;
				if (totalExpenseAmount > 0) {
					// Rough estimate: assume data spans about 6 months
					avgExpenseAmountPerMonth = totalExpenseAmount / 6;
				}
			}

			// Calculate average income transaction count per month
			if (
				avgIncomeTransactionsPerMonth.status === "fulfilled" &&
				avgIncomeTransactionsPerMonth.value.length > 0
			) {
				const totalIncomeTransactions =
					avgIncomeTransactionsPerMonth.value.reduce(
						(sum, month) => sum + (month.count || 0),
						0,
					);
				const monthCount = avgIncomeTransactionsPerMonth.value.length;
				avgIncomeTransactions = Math.round(
					totalIncomeTransactions / monthCount,
				);
			} else {
				// Fallback: estimate based on total transactions and rough month count
				const totalIncomeCount =
					incomeTransactionCount.status === "fulfilled"
						? incomeTransactionCount.value[0].count
						: 0;
				if (totalIncomeCount > 0) {
					// Rough estimate: assume data spans about 6 months
					avgIncomeTransactions = Math.round(totalIncomeCount / 6);
				}
			}

			// Calculate average expense amount and transaction count per month
			if (
				avgExpenseTransactionsPerMonth.status === "fulfilled" &&
				avgExpenseTransactionsPerMonth.value.length > 0
			) {
				const totalExpenseTransactions =
					avgExpenseTransactionsPerMonth.value.reduce(
						(sum, month) => sum + (month.count || 0),
						0,
					);
				const monthCount = avgExpenseTransactionsPerMonth.value.length;
				avgExpenseTransactions = Math.round(
					totalExpenseTransactions / monthCount,
				);
			} else {
				// Fallback: estimate based on total transactions and rough month count
				const totalExpenseCount =
					expenseTransactionCount.status === "fulfilled"
						? expenseTransactionCount.value[0].count
						: 0;
				if (totalExpenseCount > 0) {
					// Rough estimate: assume data spans about 6 months
					avgExpenseTransactions = Math.round(totalExpenseCount / 6);
				}
			}

			// Calculate period length for normalization
			let periodLengthInDays = 30; // Default to 30 days if no date range
			if (dateRange.from && dateRange.to) {
				const fromDate = new Date(dateRange.from);
				const toDate = new Date(dateRange.to);
				const diffTime = Math.abs(toDate.getTime() - fromDate.getTime());
				periodLengthInDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1; // +1 to include both start and end days
			}

			const result = {
				stats: {
					totalTransactions:
						transactionCount.status === "fulfilled"
							? transactionCount.value[0].count
							: 0,
					totalCategories:
						categoryCount.status === "fulfilled"
							? categoryCount.value[0].count
							: 0,
					totalMerchants:
						merchantCount.status === "fulfilled"
							? merchantCount.value[0].count
							: 0,
					totalMerchantKeywords:
						merchantKeywordCount.status === "fulfilled"
							? merchantKeywordCount.value[0].count
							: 0,
					totalExpenses:
						expenseCount.status === "fulfilled" && expenseCount.value[0].amount
							? Number(expenseCount.value[0].amount)
							: 0,
					totalIncome:
						incomeCount.status === "fulfilled" && incomeCount.value[0].amount
							? Number(incomeCount.value[0].amount)
							: 0,
					totalIncomeTransactions:
						incomeTransactionCount.status === "fulfilled"
							? incomeTransactionCount.value[0].count
							: 0,
					totalExpenseTransactions:
						expenseTransactionCount.status === "fulfilled"
							? expenseTransactionCount.value[0].count
							: 0,
					avgIncomeTransactionsPerMonth: avgIncomeTransactions,
					avgExpenseTransactionsPerMonth: avgExpenseTransactions,
					avgIncomeAmountPerMonth: avgIncomeAmountPerMonth,
					avgExpenseAmountPerMonth: avgExpenseAmountPerMonth,
					periodLengthInDays: periodLengthInDays,
				},
			};

			return result;
		}),
	getCashFlowData: protectedProcedure
		.input(dateRangeSchema.optional())
		.handler(async ({ context, input }) => {
			try {
				const dateRange = input || {};
				const fromDate = dateRange.from || null;
				const toDate = dateRange.to || new Date().toISOString().split("T")[0];

				// Helper to run a grouped sum query
				const getMonthlySum = async (whereClause: SQL<unknown> | undefined) =>
					whereClause
						? await db
								.select({
									monthKey: sql<string>`TO_CHAR(${transaction.date}::date, 'YYYY-MM')`,
									totalAmount: sum(
										sql`CASE WHEN ${transaction.splitIndex} = 1 THEN ${transaction.originalAmount} ELSE ${transaction.amount} END`,
									),
								})
								.from(transaction)
								.where(whereClause)
								.groupBy(sql`TO_CHAR(${transaction.date}::date, 'YYYY-MM')`)
						: [];

				const userId = context.session.user.id;

				const incomeWhere = and(
					eq(transaction.userId, userId),
					eq(transaction.reviewed, true),
					lte(transaction.date, toDate),
					...(fromDate ? [gte(transaction.date, fromDate)] : []),
					isNotNull(transaction.categoryId),
					eq(category.treatAsIncome, true),
					eq(category.hideFromInsights, false),
					// Only include original split transactions (splitIndex === 1) or non-split transactions
					or(isNull(transaction.splitIndex), eq(transaction.splitIndex, 1)),
				);

				const expenseWhere = and(
					eq(transaction.userId, userId),
					eq(transaction.reviewed, true),
					lte(transaction.date, toDate),
					...(fromDate ? [gte(transaction.date, fromDate)] : []),
					isNotNull(transaction.categoryId),
					eq(category.treatAsIncome, false),
					eq(category.hideFromInsights, false),
					// Only include original split transactions (splitIndex === 1) or non-split transactions
					or(isNull(transaction.splitIndex), eq(transaction.splitIndex, 1)),
				);

				const uncategorizedWhere = and(
					eq(transaction.userId, userId),
					eq(transaction.reviewed, true),
					lte(transaction.date, toDate),
					...(fromDate ? [gte(transaction.date, fromDate)] : []),
					isNull(transaction.categoryId),
					// Only include original split transactions (splitIndex === 1) or non-split transactions
					or(isNull(transaction.splitIndex), eq(transaction.splitIndex, 1)),
				);

				// Run queries
				const [incomeData, expenseData, uncategorizedData] = await Promise.all([
					db
						.select({
							monthKey: sql<string>`TO_CHAR(${transaction.date}::date, 'YYYY-MM')`,
							totalAmount: sum(
								sql`CASE WHEN ${transaction.splitIndex} = 1 THEN ${transaction.originalAmount} ELSE ${transaction.amount} END`,
							),
						})
						.from(transaction)
						.innerJoin(category, eq(transaction.categoryId, category.id))
						.where(incomeWhere)
						.groupBy(sql`TO_CHAR(${transaction.date}::date, 'YYYY-MM')`),
					db
						.select({
							monthKey: sql<string>`TO_CHAR(${transaction.date}::date, 'YYYY-MM')`,
							totalAmount: sum(
								sql`CASE WHEN ${transaction.splitIndex} = 1 THEN ${transaction.originalAmount} ELSE ${transaction.amount} END`,
							),
						})
						.from(transaction)
						.innerJoin(category, eq(transaction.categoryId, category.id))
						.where(expenseWhere)
						.groupBy(sql`TO_CHAR(${transaction.date}::date, 'YYYY-MM')`),
					getMonthlySum(uncategorizedWhere),
				]);

				// Merge all data into a single map
				const monthlyMap = new Map<
					string,
					{ income: number; expenses: number }
				>();

				const addToMap = (
					rows: Array<{ monthKey: string; totalAmount: unknown }>,
					type: "income" | "expenses",
				): void => {
					for (const row of rows) {
						const { monthKey } = row;
						const amount = Number(row.totalAmount) || 0;
						if (!monthlyMap.has(monthKey)) {
							monthlyMap.set(monthKey, { income: 0, expenses: 0 });
						}
						// For income, keep sign; for expenses, always positive
						const entry = monthlyMap.get(monthKey);
						if (!entry) continue;
						if (type === "income") {
							entry.income += amount;
						} else {
							entry.expenses += Math.abs(amount);
						}
					}
				};

				addToMap(incomeData, "income");
				addToMap(expenseData, "expenses");
				addToMap(uncategorizedData, "expenses");

				// Format and sort result
				return Array.from(monthlyMap.entries())
					.map(([month, data]) => ({
						month,
						income: data.income,
						expenses: data.expenses,
						net: data.income - data.expenses,
					}))
					.sort((a, b) => a.month.localeCompare(b.month));
			} catch (error) {
				console.error("Error fetching cash flow data:", error);
				throw error;
			}
		}),
	rangeCashflow: protectedProcedure
		.input(dateRangeSchema.optional())
		.output(
			z.object({
				income: z.number(),
				expenses: z.number(),
				net: z.number(),
				dateRange: z.object({
					from: z.string().nullable(),
					to: z.string(),
				}),
			}),
		)
		.handler(
			async ({
				context,
				input,
			}): Promise<{
				income: number;
				expenses: number;
				net: number;
				dateRange: {
					from: string | null;
					to: string;
				};
			}> => {
				try {
					const dateRange = input || {};
					const fromDate = dateRange.from || null;
					const toDate = dateRange.to || new Date().toISOString().split("T")[0];

					const userId = context.session.user.id;

					// Base where conditions for all queries
					const baseWhere = and(
						eq(transaction.userId, userId),
						eq(transaction.reviewed, true),
						...(fromDate ? [gte(transaction.date, fromDate)] : []),
						...(toDate ? [lte(transaction.date, toDate)] : []),
						// Only include original split transactions (splitIndex === 1) or non-split transactions
						or(isNull(transaction.splitIndex), eq(transaction.splitIndex, 1)),
					);

					// Income query
					const incomeWhere = and(
						baseWhere,
						isNotNull(transaction.categoryId),
						eq(category.treatAsIncome, true),
						eq(category.hideFromInsights, false),
					);

					// Expense query
					const expenseWhere = and(
						baseWhere,
						isNotNull(transaction.categoryId),
						eq(category.treatAsIncome, false),
						eq(category.hideFromInsights, false),
					);

					// Uncategorized query
					const uncategorizedWhere = and(
						baseWhere,
						isNull(transaction.categoryId),
					);

					// Run all queries in parallel
					const [incomeResult, expenseResult, uncategorizedResult] =
						await Promise.all([
							db
								.select({
									totalAmount: sum(
										sql`CASE WHEN ${transaction.splitIndex} = 1 THEN ${transaction.originalAmount} ELSE ${transaction.amount} END`,
									),
								})
								.from(transaction)
								.innerJoin(category, eq(transaction.categoryId, category.id))
								.where(incomeWhere),
							db
								.select({
									totalAmount: sum(
										sql`CASE WHEN ${transaction.splitIndex} = 1 THEN ${transaction.originalAmount} ELSE ${transaction.amount} END`,
									),
								})
								.from(transaction)
								.innerJoin(category, eq(transaction.categoryId, category.id))
								.where(expenseWhere),
							db
								.select({
									totalAmount: sum(
										sql`CASE WHEN ${transaction.splitIndex} = 1 THEN ${transaction.originalAmount} ELSE ${transaction.amount} END`,
									),
								})
								.from(transaction)
								.where(uncategorizedWhere),
						]);

					// Extract amounts
					const income = Number(incomeResult[0]?.totalAmount) || 0;
					const expenses = Math.abs(Number(expenseResult[0]?.totalAmount) || 0);
					const uncategorized = Math.abs(
						Number(uncategorizedResult[0]?.totalAmount) || 0,
					);
					const totalExpenses = expenses + uncategorized;
					const net = income - totalExpenses;

					return {
						income,
						expenses: totalExpenses,
						net,
						dateRange: {
							from: fromDate,
							to: toDate,
						},
					};
				} catch (error) {
					console.error("Error fetching range cash flow data:", error);
					throw error;
				}
			},
		),
};
