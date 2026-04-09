import {
  Minus,
  PiggyBankIcon,
  Plus,
  TrendingDownIcon,
  TrendingUpIcon,
} from "lucide-react";
import { Card } from "@/components/ui/card";
import type { DashboardStats } from "../../../../server/src/routers";

import { CurrencyAmount } from "../ui/currency-amount";

export function Stats({ data }: { data: DashboardStats | undefined }) {
  if (!data) {
    return (
      <div className="flex flex-col items-center justify-center py-16 text-center">
        <div className="rounded-2xl bg-secondary p-5 mb-4 shadow-soft">
          <TrendingUpIcon className="h-10 w-10 text-muted-foreground" />
        </div>
        <h3 className="text-lg font-semibold mb-2">No Data Available</h3>
        <p className="text-sm text-muted-foreground max-w-sm">
          Your dashboard statistics will appear here once you start adding
          transactions.
        </p>
      </div>
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
    <Card className="p-4 sm:p-5">
      <div className="space-y-3">
        {/* Income Line Item */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <TrendingUpIcon className="h-4 w-4 text-income" />
            <span className="text-sm text-muted-foreground">Income</span>
          </div>
          <CurrencyAmount
            animate
            amount={income}
            className="text-base font-semibold text-income tabular-nums"
          />
        </div>

        {/* Expenses Line Item */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <TrendingDownIcon className="h-4 w-4 text-expense" />
            <span className="text-sm text-muted-foreground">Expenses</span>
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

        {/* Divider */}
        <div className="border-t border-border/60" />

        {/* Net Income Line Item */}
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

        {/* Savings Rate Line Item */}
        <div className="flex items-center justify-between pt-2">
          <div className="flex items-center gap-2">
            <PiggyBankIcon className="h-4 w-4 text-savings" />
            <span className="text-sm text-muted-foreground">Savings Rate</span>
          </div>
          <div className="flex items-center gap-2">
            <span
              className={`text-base font-semibold tabular-nums ${savingsRate >= 20 ? "text-savings" : savingsRate >= 10 ? "text-amber-500" : "text-muted-foreground"}`}
            >
              {savingsRate}%
            </span>
          </div>
        </div>
      </div>
    </Card>
  );
}
