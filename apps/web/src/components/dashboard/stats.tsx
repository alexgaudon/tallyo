import {
  ChevronDownIcon,
  ChevronRightIcon,
  CreditCardIcon,
  PiggyBankIcon,
  TrendingDownIcon,
  TrendingUpIcon,
} from "lucide-react";
import { useState } from "react";
import { Card } from "@/components/ui/card";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import type {
  DashboardCategoryData,
  DashboardStats,
} from "../../../../server/src/routers";

import { CurrencyAmount } from "../ui/currency-amount";
import { StatDisplay } from "../ui/stat-display";

export function Stats({
  data,
  categoryData,
}: {
  data: DashboardStats | undefined;
  categoryData: DashboardCategoryData | undefined;
}) {
  const [isIncomeExpanded, setIsIncomeExpanded] = useState(false);
  const [isExpenseExpanded, setIsExpenseExpanded] = useState(false);
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

  // Filter categories by income/expense type and sort alphabetically
  const incomeCategories =
    categoryData
      ?.filter(
        (cat) => cat.category.treatAsIncome && !cat.category.hideFromInsights,
      )
      .sort((a, b) => a.category.name.localeCompare(b.category.name)) || [];
  const expenseCategories =
    categoryData
      ?.filter(
        (cat) => !cat.category.treatAsIncome && !cat.category.hideFromInsights,
      )
      .sort((a, b) => a.category.name.localeCompare(b.category.name)) || [];

  // Calculate derived values once
  const income = Number(data.stats.totalIncome) || 0;
  const expenses = Number(data.stats.totalExpenses) || 0;
  const netIncome = income + expenses; // Expenses are negative, so adding gives net
  const savingsRate = (() => {
    const absIncome = Math.abs(income);
    const absExpenses = Math.abs(expenses);
    if (absIncome === 0) return 0;
    const rate = (absIncome - absExpenses) / absIncome;
    return Math.max(0, Math.round(rate * 100));
  })();

  return (
    <div className="space-y-2">
      <Card className="p-4 shadow-sm">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="p-1.5 rounded-lg bg-primary/10">
              <CreditCardIcon className="w-4 h-4 text-primary" />
            </div>
            <span className="text-sm font-medium">Transaction Count</span>
          </div>
          <StatDisplay animate value={data.stats.totalTransactions} />
        </div>
      </Card>

      {/* Income Section */}
      <Collapsible open={isIncomeExpanded} onOpenChange={setIsIncomeExpanded}>
        <Card className="p-4 shadow-sm">
          <CollapsibleTrigger className="flex items-center justify-between w-full">
            <div className="flex items-center gap-2.5">
              <div className="p-1.5 rounded-lg bg-green-500/10">
                <TrendingUpIcon className="w-4 h-4 text-green-500" />
              </div>
              <span className="text-sm font-medium">Total Income</span>
            </div>
            <div className="flex items-center gap-2">
              <CurrencyAmount animate amount={income} />
              {isIncomeExpanded ? (
                <ChevronDownIcon className="w-4 h-4 text-muted-foreground" />
              ) : (
                <ChevronRightIcon className="w-4 h-4 text-muted-foreground" />
              )}
            </div>
          </CollapsibleTrigger>
          <CollapsibleContent className="mt-2">
            <div className="space-y-1.5 pl-9">
              {incomeCategories.length > 0 ? (
                incomeCategories.map((cat) => (
                  <div
                    key={cat.category.id}
                    className="flex items-center justify-between text-sm"
                  >
                    <span className="text-muted-foreground">
                      {cat.category.parentCategory?.name &&
                        `${cat.category.parentCategory?.name} -> `}
                      {cat.category.name}
                    </span>
                    <CurrencyAmount amount={Number(cat.amount)} />
                  </div>
                ))
              ) : (
                <div className="text-sm text-muted-foreground pl-0.5">
                  No income categories
                </div>
              )}
            </div>
          </CollapsibleContent>
        </Card>
      </Collapsible>

      {/* Expense Section */}
      <Collapsible open={isExpenseExpanded} onOpenChange={setIsExpenseExpanded}>
        <Card className="p-4 shadow-sm">
          <CollapsibleTrigger className="flex items-center justify-between w-full">
            <div className="flex items-center gap-2.5">
              <div className="p-1.5 rounded-lg bg-red-500/10">
                <TrendingDownIcon className="w-4 h-4 text-red-500" />
              </div>
              <span className="text-sm font-medium">Total Expenses</span>
            </div>
            <div className="flex items-center gap-2">
              <CurrencyAmount animate amount={Math.abs(expenses)} />
              {isExpenseExpanded ? (
                <ChevronDownIcon className="w-4 h-4 text-muted-foreground" />
              ) : (
                <ChevronRightIcon className="w-4 h-4 text-muted-foreground" />
              )}
            </div>
          </CollapsibleTrigger>
          <CollapsibleContent className="mt-2">
            <div className="space-y-1.5 pl-9">
              {expenseCategories.length > 0 ? (
                expenseCategories.map((cat) => (
                  <div
                    key={cat.category.id}
                    className="flex items-center justify-between text-sm"
                  >
                    <span className="text-muted-foreground">
                      {cat.category.parentCategory?.name &&
                        `${cat.category.parentCategory?.name} -> `}
                      {cat.category.name}
                    </span>
                    <CurrencyAmount amount={Math.abs(Number(cat.amount))} />
                  </div>
                ))
              ) : (
                <div className="text-sm text-muted-foreground pl-0.5">
                  No expense categories
                </div>
              )}
            </div>
          </CollapsibleContent>
        </Card>
      </Collapsible>

      <Card className="p-4 shadow-sm">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div
              className={`p-1.5 rounded-lg ${netIncome >= 0 ? "bg-green-500/10" : "bg-red-500/10"}`}
            >
              {netIncome >= 0 ? (
                <TrendingUpIcon className="w-4 h-4 text-green-500" />
              ) : (
                <TrendingDownIcon className="w-4 h-4 text-red-500" />
              )}
            </div>
            <span className="text-sm font-medium">Net Income</span>
          </div>
          <div className="flex items-center gap-1">
            <CurrencyAmount
              animate
              amount={netIncome}
              className={netIncome >= 0 ? "text-green-600" : "text-red-600"}
            />
          </div>
        </div>
      </Card>

      <Card className="p-4 shadow-sm">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="p-1.5 rounded-lg bg-primary/10">
              <PiggyBankIcon className="w-4 h-4 text-primary" />
            </div>
            <span className="text-sm font-medium">Savings Rate</span>
          </div>
          <div className="flex items-center gap-1">
            <StatDisplay animate value={savingsRate} />
            <span className="text-sm text-muted-foreground">%</span>
          </div>
        </div>
      </Card>
    </div>
  );
}
