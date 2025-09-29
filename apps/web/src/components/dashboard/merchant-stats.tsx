import { useNavigate } from "@tanstack/react-router";
import { StoreIcon } from "lucide-react";
import { cn } from "@/lib/utils";
import type { DashboardMerchantStats } from "../../../../server/src/routers";
import { CurrencyAmount } from "../ui/currency-amount";

export function MerchantStats({
	data,
}: {
	data: DashboardMerchantStats | undefined;
}) {
	const navigate = useNavigate();

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

	const handleMerchantClick = (merchantId: string) => {
		navigate({
			to: "/transactions",
			search: { merchant: merchantId, page: 1 },
		});
	};

	return (
		<div className="space-y-0 border rounded-lg overflow-hidden flex flex-col">
			{data.map((merchant, index) => (
				<button
					key={merchant.merchantId}
					type="button"
					className={cn(
						"bg-card flex items-center justify-between p-3 hover:bg-muted/50 transition-colors flex-1 cursor-pointer w-full text-left",
						{
							"border-b": index !== data.length - 1,
						},
					)}
					onClick={() => handleMerchantClick(merchant.merchantId)}
					aria-label={`View transactions for ${merchant.merchantName}`}
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
						<p className="font-bold text-sm">
							<CurrencyAmount animate amount={Number(merchant.totalAmount)} />
						</p>
					</div>
				</button>
			))}
		</div>
	);
}
