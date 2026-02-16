import {
  ArrowDownRight,
  ArrowUpRight,
  Minus,
  TrendingDownIcon,
  TrendingUpIcon,
} from "lucide-react";
import { Card } from "@/components/ui/card";
import { CurrencyAmount } from "@/components/ui/currency-amount";
import { formatCurrency } from "@/lib/utils";
import type { DashboardStats } from "../../../../server/src/routers";

const DAYS_PER_MONTH = 30;

function percentChange(current: number, expected: number): number | null {
  if (expected === 0) return current > 0 ? 100 : current < 0 ? -100 : 0;
  return Math.round(((current - expected) / Math.abs(expected)) * 100);
}

function ComparisonBadge({
  change,
  invertColor = false,
}: {
  change: number;
  invertColor?: boolean;
}) {
  const isPositive = change > 0;
  const isNegative = change < 0;
  const isNeutral = change === 0;
  const good = invertColor ? isNegative : isPositive;

  const colorClasses = isNeutral
    ? "bg-muted text-muted-foreground"
    : good
      ? "bg-income/15 text-income"
      : "bg-expense/15 text-expense";

  return (
    <span
      className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium ${colorClasses}`}
      title="vs your average"
    >
      {isNeutral && <Minus className="h-3 w-3" />}
      {isPositive && <ArrowUpRight className="h-3 w-3" />}
      {isNegative && <ArrowDownRight className="h-3 w-3" />}
      {change > 0 ? "+" : ""}
      {change}%
    </span>
  );
}

export function PeriodInsights({ data }: { data: DashboardStats | undefined }) {
  if (!data?.stats) {
    return (
      <Card className="border-dashed border-border/80 bg-muted/20 p-4 sm:p-5">
        <p className="text-sm text-muted-foreground">
          Your comparison to average will appear here once you have enough data.
        </p>
      </Card>
    );
  }

  const s = data.stats;
  const periodDays = s.periodLengthInDays ?? DAYS_PER_MONTH;
  const scale = periodDays / DAYS_PER_MONTH;

  const incomeCur = Number(s.totalIncome) || 0;
  const expensesCur = Math.abs(Number(s.totalExpenses) || 0);

  const scaledMonthlyIncome = (Number(s.avgIncomeAmountPerMonth) || 0) * scale;
  const scaledMonthlyExpense =
    (Number(s.avgExpenseAmountPerMonth) || 0) * scale;
  const avgTxPerMonth =
    (Number(s.avgIncomeTransactionsPerMonth) || 0) +
    (Number(s.avgExpenseTransactionsPerMonth) || 0);
  const scaledMonthlyTx = Math.round(avgTxPerMonth * scale);

  const useWindow =
    s.avgIncomeForWindow != null ||
    s.avgExpenseForWindow != null ||
    s.avgTransactionCountForWindow != null;

  const expectedIncome =
    useWindow && s.avgIncomeForWindow != null
      ? Number(s.avgIncomeForWindow)
      : scaledMonthlyIncome;
  const expectedExpenses =
    useWindow && s.avgExpenseForWindow != null
      ? Number(s.avgExpenseForWindow)
      : scaledMonthlyExpense;
  const expectedTxScaled =
    useWindow && s.avgTransactionCountForWindow != null
      ? Number(s.avgTransactionCountForWindow)
      : scaledMonthlyTx;

  const savingsCur =
    incomeCur === 0
      ? 0
      : Math.max(0, Math.round(((incomeCur - expensesCur) / incomeCur) * 100));
  const expectedSavingsRate =
    expectedIncome === 0
      ? 0
      : Math.max(
          0,
          Math.round(
            ((expectedIncome - expectedExpenses) / expectedIncome) * 100,
          ),
        );

  const incomeChange = percentChange(incomeCur, expectedIncome);
  const expensesChange = percentChange(expensesCur, expectedExpenses);
  const txChange = percentChange(s.totalTransactions, expectedTxScaled);
  const savingsChange = percentChange(savingsCur, expectedSavingsRate);

  const hasAverages =
    expectedIncome > 0 ||
    expectedExpenses > 0 ||
    expectedTxScaled > 0 ||
    expectedSavingsRate > 0;

  if (!hasAverages) {
    return (
      <Card className="border-dashed border-border/80 bg-muted/20 p-4 sm:p-5">
        <p className="text-sm text-muted-foreground">
          Add more history to see how this period compares to your average.
        </p>
      </Card>
    );
  }

  return (
    <Card className="border-border/80 bg-card p-4 sm:p-5 shadow-sm">
      <div className="mb-3">
        <h3 className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
          Vs your average
        </h3>
        <p className="text-xs text-muted-foreground mt-1">
          {useWindow
            ? "Compared to your typical for this many days in a month"
            : "Compared to your typical rate over this length of time"}
        </p>
      </div>
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4">
        <div className="min-w-0">
          <div className="flex items-center gap-1.5 text-muted-foreground mb-0.5">
            <TrendingUpIcon className="h-3.5 w-3.5 text-income" />
            <span className="text-xs font-medium">Income</span>
          </div>
          <div className="flex flex-wrap items-baseline gap-2">
            <CurrencyAmount
              amount={incomeCur}
              className="text-sm font-semibold text-income"
            />
            {incomeChange !== null && <ComparisonBadge change={incomeChange} />}
          </div>
          <p className="text-xs text-muted-foreground mt-1 tabular-nums">
            avg {formatCurrency(Math.round(expectedIncome))}
          </p>
        </div>
        <div className="min-w-0">
          <div className="flex items-center gap-1.5 text-muted-foreground mb-0.5">
            <TrendingDownIcon className="h-3.5 w-3.5 text-expense" />
            <span className="text-xs font-medium">Expenses</span>
          </div>
          <div className="flex flex-wrap items-baseline gap-2">
            <CurrencyAmount
              amount={-expensesCur}
              className="text-sm font-semibold text-expense"
            />
            {expensesChange !== null && (
              <ComparisonBadge change={expensesChange} invertColor />
            )}
          </div>
          <p className="text-xs text-muted-foreground mt-1 tabular-nums">
            avg {formatCurrency(Math.round(expectedExpenses))}
          </p>
        </div>
        <div className="min-w-0">
          <div className="text-xs font-medium text-muted-foreground mb-0.5">
            Transactions
          </div>
          <div className="flex flex-wrap items-baseline gap-2">
            <span className="text-sm font-semibold tabular-nums">
              {s.totalTransactions}
            </span>
            {txChange !== null && <ComparisonBadge change={txChange} />}
          </div>
          <p className="text-xs text-muted-foreground mt-1 tabular-nums">
            avg {expectedTxScaled}
          </p>
        </div>
        <div className="min-w-0">
          <div className="text-xs font-medium text-muted-foreground mb-0.5">
            Savings rate
          </div>
          <div className="flex flex-wrap items-baseline gap-2">
            <span className="text-sm font-semibold tabular-nums text-savings">
              {savingsCur}%
            </span>
            {savingsChange !== null && (
              <ComparisonBadge change={savingsChange} />
            )}
          </div>
          <p className="text-xs text-muted-foreground mt-1 tabular-nums">
            avg {expectedSavingsRate}%
          </p>
        </div>
      </div>
    </Card>
  );
}
