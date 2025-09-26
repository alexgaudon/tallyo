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
	console.log("Stats data:", data?.stats);

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
			<Card className="p-2">
				<div className="flex items-center justify-between">
					<div className="flex items-center gap-2">
						<TrendingUpIcon className="w-3 h-3 text-green-500" />
						<span className="text-sm font-medium">Total Income</span>
					</div>
					<CurrencyAmount animate amount={data.stats.totalIncome} />
				</div>
			</Card>
			<Card className="p-2">
				<div className="flex items-center justify-between">
					<div className="flex items-center gap-2">
						<TrendingDownIcon className="w-3 h-3 text-red-500" />
						<span className="text-sm font-medium">Total Expenses</span>
					</div>
					<CurrencyAmount animate amount={Math.abs(data.stats.totalExpenses)} />
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
