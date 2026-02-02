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
    <div className="grid grid-cols-2 gap-3 p-3 sm:p-4">
      <Card className="p-3 sm:p-4">
        <div className="flex items-center gap-2 sm:gap-3">
          <div className="p-1.5 sm:p-2 bg-accent/10">
            <CreditCardIcon className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-accent" />
          </div>
          <div>
            <div className="text-xs text-muted-foreground">Transactions</div>
            <StatDisplay animate value={data.stats.totalTransactions} />
          </div>
        </div>
      </Card>

      <Card className="p-3 sm:p-4">
        <div className="flex items-center gap-2 sm:gap-3">
          <div className="p-1.5 sm:p-2 bg-green-500/10">
            <TrendingUpIcon className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-green-500" />
          </div>
          <div>
            <div className="text-xs text-muted-foreground">Income</div>
            <CurrencyAmount animate amount={income} />
          </div>
        </div>
      </Card>

      <Card className="p-3 sm:p-4">
        <div className="flex items-center gap-2 sm:gap-3">
          <div className="p-1.5 sm:p-2 bg-red-500/10">
            <TrendingDownIcon className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-red-500" />
          </div>
          <div>
            <div className="text-xs text-muted-foreground">Expenses</div>
            <CurrencyAmount animate amount={Math.abs(expenses)} />
          </div>
        </div>
      </Card>

      <Card className="p-3 sm:p-4">
        <div className="flex items-center gap-2 sm:gap-3">
          <div className="p-1.5 sm:p-2 bg-accent/10">
            <PiggyBankIcon className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-accent" />
          </div>
          <div>
            <div className="text-xs text-muted-foreground">Savings</div>
            <div className="font-mono font-semibold text-sm sm:text-base">
              {savingsRate}%
            </div>
          </div>
        </div>
      </Card>
    </div>
  );
}
