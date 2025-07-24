import { Card, CardHeader, CardTitle } from "@/components/ui/card";
import { useSession } from "@/lib/auth-client";
import { cn, formatCurrency, formatValueWithPrivacy } from "@/lib/utils";
import {
	ActivityIcon,
	BarChart3Icon,
	CreditCardIcon,
	FolderTreeIcon,
	PiggyBankIcon,
	StoreIcon,
	TagIcon,
	TrendingDownIcon,
	TrendingUpIcon,
} from "lucide-react";
import type { DashboardStats } from "../../../../server/src/routers";

export function Stats({
	data,
	averageIncome,
	averageExpenses,
}: {
	data: DashboardStats | undefined;
	averageIncome?: number;
	averageExpenses?: number;
}) {
	const { data: session } = useSession();
	const isPrivacyMode = session?.settings?.isPrivacyMode ?? false;

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
			value: data.totalTransactions,
			icon: CreditCardIcon,
			description: "tracked transactions",
		},

		{
			title: "Income",
			value: data.totalIncome,
			icon: ({ className }: { className: string }) => {
				return <TrendingUpIcon className={cn(className, "text-green-500")} />;
			},
			description: "of income recorded",
		},
		{
			title: "Expenses",
			value: data.totalExpenses,
			icon: ({ className }: { className: string }) => {
				return <TrendingDownIcon className={cn(className, "text-red-500")} />;
			},
			description: "of expenses paid out",
		},
		{
			title: "Savings Rate",
			value: (() => {
				// Convert formatted currency strings back to numbers (in cents)
				const parseCurrencyString = (str: string | number): number => {
					if (typeof str === "number") return str;
					// Remove currency symbols, commas, and convert to cents
					const cleanStr = str.replace(/[$,]/g, "");
					return Math.round(Number.parseFloat(cleanStr) * 100);
				};

				const income = parseCurrencyString(data.totalIncome);
				const expenses = parseCurrencyString(data.totalExpenses);

				const savingsRate =
					income > 0 ? Math.max(0, (income - expenses) / income) * 100 : 0;
				return `${Math.round(savingsRate * 10) / 10}%`;
			})(),
			icon: ({ className }: { className: string }) => {
				return <PiggyBankIcon className={cn(className, "text-pink-500")} />;
			},
			description: "of income saved",
		},
		{
			title: "Average Income",
			value:
				averageIncome !== undefined ? formatCurrency(averageIncome) : "N/A",
			icon: ({ className }: { className: string }) => {
				return <ActivityIcon className={cn(className, "text-blue-500")} />;
			},
			description: "per month",
		},
		{
			title: "Average Expenses",
			value:
				averageExpenses !== undefined ? formatCurrency(averageExpenses) : "N/A",
			icon: ({ className }: { className: string }) => {
				return <BarChart3Icon className={cn(className, "text-orange-500")} />;
			},
			description: "per month",
		},
		{
			title: "Categories",
			value: data.totalCategories,
			icon: FolderTreeIcon,
			description: "transaction categories",
		},
		{
			title: "Merchants",
			value: data.totalMerchants,
			icon: StoreIcon,
			description: "registered merchants",
		},
		{
			title: "Keywords",
			value: data.totalMerchantKeywords,
			icon: TagIcon,
			description: "auto-matching keywords",
		},
	];

	return (
		<div className="grid gap-3 grid-cols-2 md:grid-cols-2 lg:grid-cols-3 h-full">
			{stats.map((stat) => {
				const Icon = stat.icon;
				return (
					<Card
						key={stat.title}
						className="hover:shadow-md transition-shadow flex flex-col"
					>
						<CardHeader className="space-y-2 flex-1 flex flex-col justify-center">
							<div className="flex items-center gap-2">
								<div className="flex items-center justify-center w-7 h-7 rounded-lg bg-primary/10">
									<Icon className="w-4 h-4 text-primary" />
								</div>
								<CardTitle className="text-sm font-semibold">
									{stat.title}
								</CardTitle>
							</div>
							<div className="space-y-1">
								<p className="text-base font-mono">
									{formatValueWithPrivacy(stat.value, isPrivacyMode)}
								</p>
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
