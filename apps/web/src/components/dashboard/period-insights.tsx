import {
  ArrowDownRight,
  ArrowUpRight,
  CreditCardIcon,
  Minus,
  TrendingDownIcon,
  TrendingUpIcon,
} from "lucide-react";
import type { ReactNode } from "react";
import { Card } from "@/components/ui/card";
import { CurrencyAmount } from "@/components/ui/currency-amount";
import type { DashboardStats } from "../../../../server/src/routers";

const DAYS_PER_MONTH = 30;
const INSIGHTS_TABLE_COLUMNS = "grid-cols-[minmax(0,1fr)_130px_110px]";

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
    ? "text-muted-foreground"
    : good
      ? "text-income"
      : "text-expense";

  return (
    <span
      className={`inline-flex items-center gap-1 text-xs font-medium tabular-nums ${colorClasses}`}
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

function InsightsRow({
  icon,
  label,
  current,
  badge,
  currentClassName,
}: {
  icon: ReactNode;
  label: string;
  current: ReactNode;
  badge: ReactNode;
  currentClassName?: string;
}) {
  return (
    <div className={`grid ${INSIGHTS_TABLE_COLUMNS} items-center gap-2 py-2.5`}>
      <div className="flex items-center gap-2 min-w-0">
        <span className="shrink-0">{icon}</span>
        <span className="text-sm text-foreground/90 whitespace-nowrap">
          {label}
        </span>
      </div>
      <span
        className={`text-sm font-semibold tabular-nums text-right whitespace-nowrap ${currentClassName ?? ""}`}
      >
        {current}
      </span>
      <span className="text-right whitespace-nowrap">{badge}</span>
    </div>
  );
}

function InsightsHeaderRow() {
  return (
    <div
      className={`grid ${INSIGHTS_TABLE_COLUMNS} items-center gap-2 py-1.5 text-[11px] uppercase tracking-[0.1em] text-muted-foreground border-b border-border/40`}
    >
      <span>Metric</span>
      <span className="text-right">Current</span>
      <span className="text-right">Change</span>
    </div>
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
    <Card className="border-border/80 bg-card/90 p-4 sm:p-5 shadow-sm">
      <div className="mb-3">
        <h3 className="text-[11px] font-semibold text-muted-foreground uppercase tracking-[0.08em]">
          Vs your average
        </h3>
        <p className="text-xs text-muted-foreground mt-1">
          Snapshot for this selected period
        </p>
      </div>

      <div className="border-y border-border/40">
        <div className="divide-y divide-border/40">
          <InsightsHeaderRow />

          <InsightsRow
            icon={<TrendingUpIcon className="h-3.5 w-3.5 text-income" />}
            label="Income"
            current={
              <CurrencyAmount
                amount={incomeCur}
                className="w-full justify-end tabular-nums"
              />
            }
            badge={
              incomeChange !== null ? (
                <ComparisonBadge change={incomeChange} />
              ) : null
            }
            currentClassName="text-income"
          />

          <InsightsRow
            icon={<TrendingDownIcon className="h-3.5 w-3.5 text-expense" />}
            label="Expenses"
            current={
              <CurrencyAmount
                amount={-expensesCur}
                className="w-full justify-end tabular-nums"
              />
            }
            badge={
              expensesChange !== null ? (
                <ComparisonBadge change={expensesChange} invertColor />
              ) : null
            }
            currentClassName="text-expense"
          />

          <InsightsRow
            icon={
              <CreditCardIcon className="h-3.5 w-3.5 text-muted-foreground" />
            }
            label="Transactions"
            current={s.totalTransactions}
            badge={
              txChange !== null ? <ComparisonBadge change={txChange} /> : null
            }
            currentClassName="text-foreground"
          />

          <InsightsRow
            icon={
              <span className="h-3.5 w-3.5 rounded-full bg-savings/60 inline-block" />
            }
            label="Savings Rate"
            current={`${savingsCur}%`}
            badge={
              savingsChange !== null ? (
                <ComparisonBadge change={savingsChange} />
              ) : null
            }
            currentClassName="text-savings"
          />
        </div>
      </div>

      <p className="text-[11px] text-muted-foreground mt-2">
        {useWindow
          ? "Based on your typical results for a similar window."
          : "Based on your average monthly pace."}
      </p>
    </Card>
  );
}
