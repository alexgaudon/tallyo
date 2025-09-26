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
import type { DashboardStats } from "../../../../server/src/routers";
import { CurrencyAmount } from "../ui/currency-amount";
import { StatDisplay } from "../ui/stat-display";

export function Stats({ data }: { data: DashboardStats | undefined }) {
	const [incomeExpanded, setIncomeExpanded] = useState(false);
	const [expensesExpanded, setExpensesExpanded] = useState(false);

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

	return (
		<div className="space-y-1">
			<Card className="p-2">
				<div className="flex items-center justify-between">
					<div className="flex items-center gap-2">
						<CreditCardIcon className="w-3 h-3 text-blue-500" />
						<span className="text-sm font-medium">Transaction Count</span>
					</div>
					<StatDisplay animate value={data.stats.totalTransactions} />
				</div>
			</Card>
			<Collapsible open={incomeExpanded} onOpenChange={setIncomeExpanded}>
				<Card className="p-2">
					<CollapsibleTrigger className="w-full">
						<div className="flex items-center justify-between">
							<div className="flex items-center gap-2">
								<TrendingUpIcon className="w-3 h-3 text-green-500" />
								<span className="text-sm font-medium">Total Income</span>
							</div>
							<div className="flex items-center gap-2">
								<CurrencyAmount animate amount={data.stats.totalIncome} />
								{incomeExpanded ? (
									<ChevronDownIcon className="w-3 h-3 text-muted-foreground" />
								) : (
									<ChevronRightIcon className="w-3 h-3 text-muted-foreground" />
								)}
							</div>
						</div>
					</CollapsibleTrigger>
					<CollapsibleContent className="mt-3">
						<div className="space-y-2 pl-5 border-l-2 border-green-100">
							<div className="flex items-center justify-between text-xs">
								<span className="text-muted-foreground">
									Average per transaction
								</span>
								<CurrencyAmount
									animate
									amount={
										data.stats.totalIncome /
										Math.max(data.stats.totalTransactions, 1)
									}
								/>
							</div>
							<div className="flex items-center justify-between text-xs">
								<span className="text-muted-foreground">
									Income transactions
								</span>
								<StatDisplay
									animate
									value={data.stats.totalIncomeTransactions ?? 0}
								/>
							</div>
						</div>
					</CollapsibleContent>
				</Card>
			</Collapsible>
			<Collapsible open={expensesExpanded} onOpenChange={setExpensesExpanded}>
				<Card className="p-2">
					<CollapsibleTrigger className="w-full">
						<div className="flex items-center justify-between">
							<div className="flex items-center gap-2">
								<TrendingDownIcon className="w-3 h-3 text-red-500" />
								<span className="text-sm font-medium">Total Expenses</span>
							</div>
							<div className="flex items-center gap-2">
								<CurrencyAmount
									animate
									amount={Math.abs(data.stats.totalExpenses)}
								/>
								{expensesExpanded ? (
									<ChevronDownIcon className="w-3 h-3 text-muted-foreground" />
								) : (
									<ChevronRightIcon className="w-3 h-3 text-muted-foreground" />
								)}
							</div>
						</div>
					</CollapsibleTrigger>
					<CollapsibleContent className="mt-3">
						<div className="space-y-2 pl-5 border-l-2 border-red-100">
							<div className="flex items-center justify-between text-xs">
								<span className="text-muted-foreground">
									Average per transaction
								</span>
								<CurrencyAmount
									animate
									amount={
										Math.abs(data.stats.totalExpenses) /
										Math.max(data.stats.totalTransactions, 1)
									}
								/>
							</div>
							<div className="flex items-center justify-between text-xs">
								<span className="text-muted-foreground">
									Expense transactions
								</span>
								<StatDisplay
									animate
									value={data.stats.totalExpenseTransactions ?? 0}
								/>
							</div>
							<div className="flex items-center justify-between text-xs">
								<span className="text-muted-foreground">Categories used</span>
								<StatDisplay animate value={data.stats.totalCategories} />
							</div>
						</div>
					</CollapsibleContent>
				</Card>
			</Collapsible>
			<Card className="p-2">
				<div className="flex items-center justify-between">
					<div className="flex items-center gap-2">
						<PiggyBankIcon className="w-3 h-3 text-pink-500" />
						<span className="text-sm font-medium">Savings Rate</span>
					</div>
					<div className="flex items-center gap-1">
						<StatDisplay
							animate
							value={(() => {
								const income = Math.abs(data.stats.totalIncome);
								const expenses = Math.abs(data.stats.totalExpenses);
								const savingsRate =
									income + expenses === 0 ? 0 : (income - expenses) / income;
								const displaySavingsRate = savingsRate > 0 ? savingsRate : 0;
								return Math.round(displaySavingsRate * 100);
							})()}
						/>
						<span className="text-xs text-muted-foreground">%</span>
					</div>
				</div>
			</Card>
		</div>
	);
}
