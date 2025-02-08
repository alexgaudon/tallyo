import { getCategoryBreakdownQuery } from "./charts.category-breakdown";
import { getIncomeVsExpensesDataQuery } from "./charts.income-vs-expenses";
import { getMonthlyExpenseDataQuery } from "./charts.monthly-expense";
import { getStatsDataQuery } from "./charts.stats";
import { getTopVendorsDataQuery } from "./charts.topVendors";

export const ChartsRespository = {
  getStatsDataQuery: getStatsDataQuery,
  getMonthlyExpenseDataQuery: getMonthlyExpenseDataQuery,
  getIncomeVsExpensesDataQuery: getIncomeVsExpensesDataQuery,
  getCategoryBreakdownQuery: getCategoryBreakdownQuery,
  getTopVendorsDataQuery: getTopVendorsDataQuery,
};
