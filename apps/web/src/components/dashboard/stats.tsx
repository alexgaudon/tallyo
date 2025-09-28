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

			{/* Income Section */}
			<Collapsible open={isIncomeExpanded} onOpenChange={setIsIncomeExpanded}>
				<Card className="p-2">
					<CollapsibleTrigger className="flex items-center justify-between w-full">
						<div className="flex items-center gap-2">
							<TrendingUpIcon className="w-3 h-3 text-green-500" />
							<span className="text-sm font-medium">Total Income</span>
						</div>
						<div className="flex items-center gap-2">
							<CurrencyAmount animate amount={data.stats.totalIncome} />
							{isIncomeExpanded ? (
								<ChevronDownIcon className="w-3 h-3 text-muted-foreground" />
							) : (
								<ChevronRightIcon className="w-3 h-3 text-muted-foreground" />
							)}
						</div>
					</CollapsibleTrigger>
					<CollapsibleContent className="mt-2">
						<div className="space-y-1 pl-5">
							{incomeCategories.length > 0 ? (
								incomeCategories.map((cat) => (
									<div
										key={cat.category.id}
										className="flex items-center justify-between text-xs"
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
								<div className="text-xs text-muted-foreground pl-2">
									No income categories
								</div>
							)}
						</div>
					</CollapsibleContent>
				</Card>
			</Collapsible>

			{/* Expense Section */}
			<Collapsible open={isExpenseExpanded} onOpenChange={setIsExpenseExpanded}>
				<Card className="p-2">
					<CollapsibleTrigger className="flex items-center justify-between w-full">
						<div className="flex items-center gap-2">
							<TrendingDownIcon className="w-3 h-3 text-red-500" />
							<span className="text-sm font-medium">Total Expenses</span>
						</div>
						<div className="flex items-center gap-2">
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
					<CollapsibleContent className="mt-2">
						<div className="space-y-1 pl-5">
							{expenseCategories.length > 0 ? (
								expenseCategories.map((cat) => (
									<div
										key={cat.category.id}
										className="flex items-center justify-between text-xs"
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
								<div className="text-xs text-muted-foreground pl-2">
									No expense categories
								</div>
							)}
						</div>
					</CollapsibleContent>
				</Card>
			</Collapsible>

			<Card className="p-2">
				<div className="flex items-center justify-between">
					<div className="flex items-center gap-2">
						{(() => {
							const income = Number(data.stats.totalIncome) || 0;
							const expenses = Number(data.stats.totalExpenses) || 0;
							const netIncome = income + expenses;
							return netIncome >= 0 ? (
								<TrendingUpIcon className="w-3 h-3 text-green-500" />
							) : (
								<TrendingDownIcon className="w-3 h-3 text-red-500" />
							);
						})()}
						<span className="text-sm font-medium">Net Income</span>
					</div>
					<div className="flex items-center gap-1">
						<CurrencyAmount
							animate
							amount={(() => {
								const income = Number(data.stats.totalIncome) || 0;
								const expenses = Number(data.stats.totalExpenses) || 0;
								// Net income should be income minus expenses, but expenses are negative
								// so we add them to income to get the correct net
								return income + expenses;
							})()}
							className={(() => {
								const income = Number(data.stats.totalIncome) || 0;
								const expenses = Number(data.stats.totalExpenses) || 0;
								const netIncome = income + expenses;
								return netIncome >= 0 ? "text-green-600" : "text-red-600";
							})()}
						/>
					</div>
				</div>
			</Card>

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
