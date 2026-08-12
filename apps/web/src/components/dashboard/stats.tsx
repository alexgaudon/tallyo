import {
  CalendarDays,
  Minus,
  PiggyBankIcon,
  Plus,
  Receipt,
  TrendingDownIcon,
  TrendingUpIcon,
} from "lucide-react";
import { Card } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import type { DashboardStats } from "../../../../server/src/routers";

import { CurrencyAmount } from "../ui/currency-amount";

export function Stats({ data }: { data: DashboardStats | undefined }) {
  if (!data) {
    return (
      <EmptyState
        icon={<TrendingUpIcon className="h-10 w-10 text-muted-foreground" />}
        title="No Data Available"
        description="Your dashboard statistics will appear here once you start adding transactions."
        bordered={false}
      />
    );
  }

  const income = Number(data.stats.totalIncome) || 0;
  const expenses = Number(data.stats.totalExpenses) || 0;
  const netIncome = income + expenses; // expenses are negative
  const savingsRate = (() => {
    const absIncome = Math.abs(income);
    const absExpenses = Math.abs(expenses);
    if (absIncome === 0) return 0;
    const rate = (absIncome - absExpenses) / absIncome;
    return Math.max(0, Math.round(rate * 100));
  })();

  return (
    <Card className="border-border bg-card p-4 sm:p-5">
      <div className="space-y-4">
        <div>
          <p className="text-xs font-semibold tracking-wider uppercase text-muted-foreground">
            Income
          </p>
          <div className="mt-2 space-y-2">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <TrendingUpIcon className="h-4 w-4 text-income" />
                <span className="text-sm text-muted-foreground">
                  Total Income Earned
                </span>
              </div>
              <CurrencyAmount
                animate
                amount={income}
                className="text-base font-semibold text-income tabular-nums"
              />
            </div>
          </div>
        </div>

        <div className="border-t border-border/60 pt-3">
          <p className="text-xs font-semibold tracking-wider uppercase text-muted-foreground">
            Expenses
          </p>
          <div className="mt-2 space-y-2">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <TrendingDownIcon className="h-4 w-4 text-expense" />
                <span className="text-sm text-muted-foreground">
                  Total Expenses
                </span>
              </div>
              <div className="flex items-center gap-1.5">
                <Minus className="h-3 w-3 text-muted-foreground" />
                <CurrencyAmount
                  animate
                  amount={Math.abs(expenses)}
                  className="text-base font-semibold text-expense tabular-nums"
                />
              </div>
            </div>
          </div>
        </div>

        <div className="border-t border-border/60 pt-3 space-y-2">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              {netIncome >= 0 ? (
                <Plus className="h-4 w-4 text-income" />
              ) : (
                <Minus className="h-4 w-4 text-expense" />
              )}
              <span className="text-sm font-medium text-foreground">
                Net Income
              </span>
            </div>
            <CurrencyAmount
              animate
              amount={netIncome}
              showColor
              className="text-lg font-bold tabular-nums"
            />
          </div>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <PiggyBankIcon className="h-4 w-4 text-savings" />
              <span className="text-sm text-muted-foreground">
                Current Savings Rate
              </span>
            </div>
            <span
              className={`text-base font-semibold tabular-nums ${savingsRate >= 20 ? "text-savings" : savingsRate >= 10 ? "text-warning" : "text-muted-foreground"}`}
            >
              {savingsRate}%
            </span>
          </div>
        </div>

        <div className="border-t border-border/60 pt-3 space-y-2">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <CalendarDays className="h-4 w-4 text-muted-foreground" />
              <span className="text-sm text-muted-foreground">
                Avg Daily Spend
              </span>
            </div>
            <CurrencyAmount
              animate
              amount={Number(data.stats.avgDailyExpense) || 0}
              className="text-base font-semibold tabular-nums"
            />
          </div>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Receipt className="h-4 w-4 text-muted-foreground" />
              <span className="text-sm text-muted-foreground">
                Avg Expense / Transaction
              </span>
            </div>
            <CurrencyAmount
              animate
              amount={Number(data.stats.avgExpensePerTransaction) || 0}
              className="text-base font-semibold tabular-nums"
            />
          </div>
        </div>
      </div>
    </Card>
  );
}
