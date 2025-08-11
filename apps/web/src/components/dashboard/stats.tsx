import { differenceInDays } from "date-fns";
import {
	CreditCardIcon,
	FolderTreeIcon,
	PiggyBankIcon,
	StoreIcon,
	TagIcon,
	TrendingDownIcon,
	TrendingUpIcon,
} from "lucide-react";
import type { DateRange } from "react-day-picker";
import { Card, CardHeader, CardTitle } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import type { DashboardStats } from "../../../../server/src/routers";
import { CurrencyAmount } from "../ui/currency-amount";
import { StatDisplay } from "../ui/stat-display";

export function Stats({
	data,
	dateRange,
}: {
	data: DashboardStats | undefined;
	dateRange?: DateRange;
}) {
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

	const stats = [
		{
			title: "Transactions",
			display: <StatDisplay animate value={data.stats.totalTransactions} />,
			icon: CreditCardIcon,
			description: "tracked transactions",
		},
		{
			title: "Income",
			display: (() => {
				const current = Math.abs(data.stats.totalIncome);
				const average = Math.abs(data.averages.averageIncome);
				const isHigher = current > average;
				const isLower = current < average;
				const isEqual = current === average;

				// Only show comparison if date range is 1 month or less
				const showComparison =
					dateRange?.from &&
					dateRange?.to &&
					differenceInDays(dateRange.to, dateRange.from) <= 31;

				return (
					<div className="space-y-0.5">
						<CurrencyAmount animate amount={data.stats.totalIncome} />
						{showComparison && (
							<div className="flex items-center gap-1 text-xs text-muted-foreground">
								<span
									className={cn(
										"font-medium",
										isHigher && "text-green-600",
										isLower && "text-red-600",
										isEqual && "text-muted-foreground",
									)}
								>
									{isHigher ? "↗" : isLower ? "↘" : "→"}
								</span>
								<CurrencyAmount amount={data.averages.averageIncome} />
								<span>avg at this point</span>
							</div>
						)}
					</div>
				);
			})(),
			icon: ({ className }: { className: string }) => {
				return <TrendingUpIcon className={cn(className, "text-green-500")} />;
			},
			description: (() => {
				const showComparison =
					dateRange?.from &&
					dateRange?.to &&
					differenceInDays(dateRange.to, dateRange.from) <= 31;
				return showComparison ? "vs avg at this point" : "total income";
			})(),
		},
		{
			title: "Expenses",
			display: (() => {
				const current = Math.abs(data.stats.totalExpenses);
				const average = Math.abs(data.averages.averageExpenses);
				const isHigher = current > average;
				const isLower = current < average;
				const isEqual = current === average;

				// Only show comparison if date range is 1 month or less
				const showComparison =
					dateRange?.from &&
					dateRange?.to &&
					differenceInDays(dateRange.to, dateRange.from) <= 31;

				return (
					<div className="space-y-0.5">
						<CurrencyAmount animate amount={data.stats.totalExpenses} />
						{showComparison && (
							<div className="flex items-center gap-1 text-xs text-muted-foreground">
								<span
									className={cn(
										"font-medium",
										isHigher && "text-red-600",
										isLower && "text-green-600",
										isEqual && "text-muted-foreground",
									)}
								>
									{isHigher ? "↗" : isLower ? "↘" : "→"}
								</span>
								<CurrencyAmount amount={data.averages.averageExpenses} />
								<span>avg at this point</span>
							</div>
						)}
					</div>
				);
			})(),
			icon: ({ className }: { className: string }) => {
				return <TrendingDownIcon className={cn(className, "text-red-500")} />;
			},
			description: (() => {
				const showComparison =
					dateRange?.from &&
					dateRange?.to &&
					differenceInDays(dateRange.to, dateRange.from) <= 31;
				return showComparison ? "vs avg at this point" : "total expenses";
			})(),
		},
		{
			title: "Savings Rate",
			display: (() => {
				const income = Math.abs(data.stats.totalIncome);
				const expenses = Math.abs(data.stats.totalExpenses);
				const savingsRate =
					income + expenses === 0 ? 0 : (income - expenses) / income;

				const displaySavingsRate = savingsRate > 0 ? savingsRate : 0;

				return (
					<div className="flex items-center gap-1">
						<StatDisplay animate value={Math.round(displaySavingsRate * 100)} />
						<span className="text-xs text-muted-foreground">%</span>
					</div>
				);
			})(),
			icon: ({ className }: { className: string }) => {
				return <PiggyBankIcon className={cn(className, "text-pink-500")} />;
			},
			description: "of income saved",
		},
		{
			title: "Categories",
			display: <StatDisplay animate value={data.stats.totalCategories} />,
			icon: FolderTreeIcon,
			description: "transaction categories",
		},
		{
			title: "Merchants",
			display: <StatDisplay animate value={data.stats.totalMerchants} />,
			icon: StoreIcon,
			description: "registered merchants",
		},
		{
			title: "Keywords",
			display: <StatDisplay animate value={data.stats.totalMerchantKeywords} />,
			icon: TagIcon,
			description: "auto-matching keywords",
			hidden: true,
		},
	];

	return (
		<div className="grid gap-2 grid-cols-2 xl:grid-cols-3 h-full">
			{stats.map((stat) => {
				const Icon = stat.icon;
				return (
					<Card
						key={stat.title}
						className="hover:shadow-md transition-shadow flex flex-col"
					>
						<CardHeader className="space-y-2 flex-1 flex flex-col justify-center p-3">
							<div className="flex items-center gap-2">
								<div className="flex items-center justify-center w-6 h-6 rounded-lg bg-primary/10">
									<Icon className="w-3 h-3 text-primary" />
								</div>
								<CardTitle className="text-xs font-semibold">
									{stat.title}
								</CardTitle>
							</div>
							<div className="space-y-1">
								{stat.display}
								<p className="text-xs text-muted-foreground">
									{stat.description}
								</p>
							</div>
						</CardHeader>
					</Card>
				);
			})}
		</div>
	);
}
