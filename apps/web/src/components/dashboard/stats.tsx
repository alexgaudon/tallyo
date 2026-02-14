import {
  CreditCardIcon,
  PiggyBankIcon,
  TrendingDownIcon,
  TrendingUpIcon,
} from "lucide-react";
import { Card } from "@/components/ui/card";
import type { DashboardStats } from "../../../../server/src/routers";

import { CurrencyAmount } from "../ui/currency-amount";
import { StatDisplay } from "../ui/stat-display";

export function Stats({ data }: { data: DashboardStats | undefined }) {
  if (!data) {
    return (
      <div className="flex flex-col items-center justify-center py-16 text-center">
        <div className="rounded-full bg-muted p-4 mb-4">
          <CreditCardIcon className="h-10 w-10 text-muted-foreground" />
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
  const savingsRate = (() => {
    const absIncome = Math.abs(income);
    const absExpenses = Math.abs(expenses);
    if (absIncome === 0) return 0;
    const rate = (absIncome - absExpenses) / absIncome;
    return Math.max(0, Math.round(rate * 100));
  })();

  return (
    <div className="grid grid-cols-2 gap-3 sm:gap-4">
      <Card className="p-4 sm:p-5 border-border/80 bg-card shadow-sm">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-xl bg-muted">
            <CreditCardIcon className="w-4 h-4 sm:w-5 sm:h-5 text-muted-foreground" />
          </div>
          <div className="min-w-0">
            <div className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
              Transactions
            </div>
            <StatDisplay
              animate
              value={data.stats.totalTransactions}
              className="text-lg sm:text-xl font-semibold tabular-nums"
            />
          </div>
        </div>
      </Card>

      <Card className="p-4 sm:p-5 border-border/80 bg-card shadow-sm">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-xl bg-income-muted">
            <TrendingUpIcon className="w-4 h-4 sm:w-5 sm:h-5 text-income" />
          </div>
          <div className="min-w-0">
            <div className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
              Income
            </div>
            <CurrencyAmount
              animate
              amount={income}
              className="text-lg sm:text-xl font-semibold text-income"
            />
          </div>
        </div>
      </Card>

      <Card className="p-4 sm:p-5 border-border/80 bg-card shadow-sm">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-xl bg-expense-muted">
            <TrendingDownIcon className="w-4 h-4 sm:w-5 sm:h-5 text-expense" />
          </div>
          <div className="min-w-0">
            <div className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
              Expenses
            </div>
            <CurrencyAmount
              animate
              amount={Math.abs(expenses)}
              className="text-lg sm:text-xl font-semibold text-expense"
            />
          </div>
        </div>
      </Card>

      <Card className="p-4 sm:p-5 border-border/80 bg-card shadow-sm">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-xl bg-savings-muted">
            <PiggyBankIcon className="w-4 h-4 sm:w-5 sm:h-5 text-savings" />
          </div>
          <div className="min-w-0">
            <div className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
              Savings rate
            </div>
            <div className="text-lg sm:text-xl font-semibold tabular-nums text-savings">
              {savingsRate}%
            </div>
          </div>
        </div>
      </Card>
    </div>
  );
}
