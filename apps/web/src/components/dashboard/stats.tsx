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
        <div className="rounded-2xl bg-secondary p-5 mb-4 shadow-soft">
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
    <div className="grid grid-cols-2 gap-4">
      <Card className="p-5 group">
        <div className="flex items-center gap-4">
          <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-secondary text-secondary-foreground transition-colors group-hover:bg-primary/10 group-hover:text-primary">
            <CreditCardIcon className="h-5 w-5" />
          </div>
          <div className="min-w-0">
            <div className="text-xs font-medium text-muted-foreground">
              Transactions
            </div>
            <StatDisplay
              animate
              value={data.stats.totalTransactions}
              className="mt-1 text-base font-semibold tabular-nums"
            />
          </div>
        </div>
      </Card>

      <Card className="p-5 group">
        <div className="flex items-center gap-4">
          <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-income-muted text-income transition-colors">
            <TrendingUpIcon className="h-5 w-5" />
          </div>
          <div className="min-w-0">
            <div className="text-xs font-medium text-muted-foreground">
              Income
            </div>
            <CurrencyAmount
              animate
              amount={income}
              className="mt-1 text-base font-semibold text-income"
            />
          </div>
        </div>
      </Card>

      <Card className="p-5 group">
        <div className="flex items-center gap-4">
          <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-expense-muted text-expense transition-colors">
            <TrendingDownIcon className="h-5 w-5" />
          </div>
          <div className="min-w-0">
            <div className="text-xs font-medium text-muted-foreground">
              Expenses
            </div>
            <CurrencyAmount
              animate
              amount={Math.abs(expenses)}
              className="mt-1 text-base font-semibold text-expense"
            />
          </div>
        </div>
      </Card>

      <Card className="p-5 group">
        <div className="flex items-center gap-4">
          <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-savings-muted text-savings transition-colors">
            <PiggyBankIcon className="h-5 w-5" />
          </div>
          <div className="min-w-0">
            <div className="text-xs font-medium text-muted-foreground">
              Savings Rate
            </div>
            <div className="mt-1 text-base font-semibold tabular-nums text-savings">
              {savingsRate}%
            </div>
          </div>
        </div>
      </Card>
    </div>
  );
}
