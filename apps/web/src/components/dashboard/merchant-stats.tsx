import { cn, formatCurrency } from "@/lib/utils";
import { StoreIcon } from "lucide-react";
import type { DashboardMerchantStats } from "../../../../server/src/routers";

export function MerchantStats({
	data,
}: {
	data: DashboardMerchantStats | undefined;
}) {
	if (!data || data.length === 0) {
		return (
			<div className="flex flex-col items-center justify-center py-12 text-center">
				<div className="rounded-full bg-muted p-3 mb-4">
					{/* You can use a merchant/store icon here if desired */}
					<span className="text-muted-foreground text-3xl">🏪</span>
				</div>
				<h3 className="text-lg font-semibold mb-2">
					No Merchant Data Available
				</h3>
				<p className="text-sm text-muted-foreground max-w-sm">
					Merchant breakdown will appear here once you have transactions with
					merchants.
				</p>
			</div>
		);
	}

	return (
		<div className="space-y-0 border rounded-lg overflow-hidden h-full flex flex-col">
			{data.map((merchant, index) => (
				<div
					key={merchant.merchantId}
					className={cn(
						"bg-card flex items-center justify-between p-4 hover:bg-muted/50 transition-colors flex-1",
						{
							"border-b": index !== data.length - 1,
						},
					)}
				>
					<div className="flex items-center gap-3">
						<div className="flex items-center justify-center w-8 h-8 rounded-lg bg-primary/10">
							<StoreIcon className="w-4 h-4 text-primary" />
						</div>
						<div>
							<p className="font-semibold text-sm">{merchant.merchantName}</p>
							<p className="text-xs text-muted-foreground">
								{merchant.count} transaction{merchant.count !== 1 ? "s" : ""}
							</p>
						</div>
					</div>
					<div className="text-right">
						<p className="font-bold text-base">
							{formatCurrency(Number(merchant.totalAmount))}
						</p>
					</div>
				</div>
			))}
		</div>
	);
}
