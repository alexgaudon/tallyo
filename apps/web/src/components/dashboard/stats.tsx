import { Card, CardHeader, CardTitle } from "@/components/ui/card";
import {
	CreditCardIcon,
	FolderTreeIcon,
	StoreIcon,
	TagIcon,
} from "lucide-react";
import type { DashboardStats } from "../../../../server/src/routers";

export function Stats({
	data,
}: {
	data: DashboardStats | undefined;
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
			title: "Total Transactions",
			value: data.totalTransactions,
			icon: CreditCardIcon,
			description: "tracked transactions",
		},
		{
			title: "Categories",
			value: data.totalCategories,
			icon: FolderTreeIcon,
			description: "transaction categories",
		},
		{
			title: "Total Expenses",
			value: data.totalExpenses,
			icon: CreditCardIcon,
			description: "of expenses paid",
		},
		{
			title: "Total Income",
			value: data.totalIncome,
			icon: CreditCardIcon,
			description: "of income recorded",
		},
		{
			title: "Merchants",
			value: data.totalMerchants,
			icon: StoreIcon,
			description: "registered merchants",
		},
		{
			title: "Merchant Keywords",
			value: data.totalMerchantKeywords,
			icon: TagIcon,
			description: "auto-matching keywords",
		},
	];

	return (
		<div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
			{stats.map((stat) => {
				const Icon = stat.icon;
				return (
					<Card key={stat.title} className="hover:shadow-md transition-shadow">
						<CardHeader className="space-y-2">
							<div className="flex items-center gap-2">
								<div className="flex items-center justify-center w-8 h-8 rounded-lg bg-primary/10">
									<Icon className="w-4 h-4 text-primary" />
								</div>
								<CardTitle className="text-lg font-semibold">
									{stat.title}
								</CardTitle>
							</div>
							<div className="space-y-1">
								<p className="text-2xl font-bold">{stat.value}</p>
								<p className="text-sm text-muted-foreground">
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
