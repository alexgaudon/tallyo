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

function calculateNetIncome(
  totalIncome: string | number,
  totalExpenses: string | number,
): number {
  const income = Number(totalIncome) || 0;
  let expenses = Number(totalExpenses) || 0;
  // Expenses should be negative, but ensure they are if they're not
  // (defensive: if expenses is positive, make it negative)
  if (expenses > 0) {
    expenses = -expenses;
  }
  // Expenses are stored as negative values, so adding them to income
  // gives us net income (e.g., 0 + (-100) = -100)
  return income + expenses;
}

function calculateSavingsRate(
  totalIncome: string | number,
  totalExpenses: string | number,
): number {
  const income = Math.abs(Number(totalIncome) || 0);
  const expenses = Math.abs(Number(totalExpenses) || 0);
  if (income + expenses === 0) {
    return 0;
  }
  const savingsRate = (income - expenses) / income;
  return Math.round(Math.max(0, savingsRate) * 100);
}

function formatCategoryName(category: {
  name: string;
  parentCategory?: { name: string } | null;
}): string {
  if (category.parentCategory?.name) {
    return `${category.parentCategory.name} -> ${category.name}`;
  }
  return category.name;
}

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
      <div className="flex flex-col items-center justify-center py-12 text-center">
        <div className="rounded-full bg-muted p-3 mb-4">
          <CreditCardIcon className="h-8 w-8 text-muted-foreground" />
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

  const netIncome = calculateNetIncome(
    data.stats.totalIncome,
    data.stats.totalExpenses,
  );

  return (
    <div className="space-y-0.5">
      <Card className="p-2.5">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-1.5">
            <CreditCardIcon className="w-3 h-3 text-accent" />
            <span className="text-xs font-medium">Transaction Count</span>
          </div>
          <StatDisplay animate value={data.stats.totalTransactions} />
        </div>
      </Card>

      {/* Income Section */}
      <Collapsible open={isIncomeExpanded} onOpenChange={setIsIncomeExpanded}>
        <Card className="p-2.5">
          <CollapsibleTrigger className="flex items-center justify-between w-full">
            <div className="flex items-center gap-1.5">
              <TrendingUpIcon className="w-3 h-3 text-green-500" />
              <span className="text-xs font-medium">Total Income</span>
            </div>
            <div className="flex items-center gap-1.5">
              <CurrencyAmount animate amount={data.stats.totalIncome} />
              {isIncomeExpanded ? (
                <ChevronDownIcon className="w-3 h-3 text-muted-foreground" />
              ) : (
                <ChevronRightIcon className="w-3 h-3 text-muted-foreground" />
              )}
            </div>
          </CollapsibleTrigger>
          <CollapsibleContent className="mt-1.5">
            <div className="space-y-0.5 pl-4">
              {incomeCategories.length > 0 ? (
                incomeCategories.map((cat) => (
                  <div
                    key={cat.category.id}
                    className="flex items-center justify-between text-xs"
                  >
                    <span className="text-muted-foreground">
                      {formatCategoryName(cat.category)}
                    </span>
                    <CurrencyAmount amount={Number(cat.amount)} />
                  </div>
                ))
              ) : (
                <div className="text-xs text-muted-foreground pl-1.5">
                  No income categories
                </div>
              )}
            </div>
          </CollapsibleContent>
        </Card>
      </Collapsible>

      {/* Expense Section */}
      <Collapsible open={isExpenseExpanded} onOpenChange={setIsExpenseExpanded}>
        <Card className="p-2.5">
          <CollapsibleTrigger className="flex items-center justify-between w-full">
            <div className="flex items-center gap-1.5">
              <TrendingDownIcon className="w-3 h-3 text-red-500" />
              <span className="text-xs font-medium">Total Expenses</span>
            </div>
            <div className="flex items-center gap-1.5">
              <CurrencyAmount
                animate
                amount={Math.abs(data.stats.totalExpenses)}
              />
              {isExpenseExpanded ? (
                <ChevronDownIcon className="w-3 h-3 text-muted-foreground" />
              ) : (
                <ChevronRightIcon className="w-3 h-3 text-muted-foreground" />
              )}
            </div>
          </CollapsibleTrigger>
          <CollapsibleContent className="mt-1.5">
            <div className="space-y-0.5 pl-4">
              {expenseCategories.length > 0 ? (
                expenseCategories.map((cat) => (
                  <div
                    key={cat.category.id}
                    className="flex items-center justify-between text-xs"
                  >
                    <span className="text-muted-foreground">
                      {formatCategoryName(cat.category)}
                    </span>
                    <CurrencyAmount amount={Math.abs(Number(cat.amount))} />
                  </div>
                ))
              ) : (
                <div className="text-xs text-muted-foreground pl-1.5">
                  No expense categories
                </div>
              )}
            </div>
          </CollapsibleContent>
        </Card>
      </Collapsible>

      <Card className="p-2.5">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-1.5">
            {netIncome >= 0 ? (
              <TrendingUpIcon className="w-3 h-3 text-green-500" />
            ) : (
              <TrendingDownIcon className="w-3 h-3 text-red-500" />
            )}
            <span className="text-xs font-medium">Net Income</span>
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

      <Card className="p-2.5">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-1.5">
            <PiggyBankIcon className="w-3 h-3 text-accent" />
            <span className="text-xs font-medium">Savings Rate</span>
          </div>
          <div className="flex items-center gap-1">
            <StatDisplay
              animate
              value={calculateSavingsRate(
                data.stats.totalIncome,
                data.stats.totalExpenses,
              )}
            />
            <span className="text-xs text-muted-foreground">%</span>
          </div>
        </div>
      </Card>
    </div>
  );
}
