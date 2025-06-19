import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
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
			description: "All recorded transactions",
		},
		{
			title: "Categories",
			value: data.totalCategories,
			icon: FolderTreeIcon,
			description: "Transaction categories",
		},
		{
			title: "Merchants",
			value: data.totalMerchants,
			icon: StoreIcon,
			description: "Registered merchants",
		},
		{
			title: "Merchant Keywords",
			value: data.totalMerchantKeywords,
			icon: TagIcon,
			description: "Auto-matching keywords",
		},
	];

	return (
		<div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
			{stats.map((stat) => {
				const Icon = stat.icon;
				return (
					<Card key={stat.title}>
						<CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
							<CardTitle className="text-sm font-medium">
								{stat.title}
							</CardTitle>
							<Icon className="h-4 w-4 text-muted-foreground" />
						</CardHeader>
						<CardContent>
							<div className="text-2xl font-bold">{stat.value}</div>
							<p className="text-xs text-muted-foreground">
								{stat.description}
							</p>
						</CardContent>
					</Card>
				);
			})}
		</div>
	);
}
