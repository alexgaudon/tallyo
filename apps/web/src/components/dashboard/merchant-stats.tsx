import { useNavigate } from "@tanstack/react-router";
import { StoreIcon } from "lucide-react";
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
		<div className="space-y-3">
			{data.map((merchant, _index) => (
				<button
					key={merchant.merchantId}
					type="button"
					className="bg-slate-50/50 dark:bg-slate-800/50 hover:bg-slate-100/50 dark:hover:bg-slate-700/50 border border-slate-200/50 dark:border-slate-700/50 rounded-xl p-4 transition-all duration-200 cursor-pointer w-full text-left group"
					onClick={() => handleMerchantClick(merchant.merchantId)}
					aria-label={`View transactions for ${merchant.merchantName}`}
				>
					<div className="flex items-center justify-between">
						<div className="flex items-center gap-4">
							<div className="flex items-center justify-center w-10 h-10 rounded-lg bg-gradient-to-br from-blue-500 to-blue-600 shadow-sm">
								<StoreIcon className="w-5 h-5 text-white" />
							</div>
							<div>
								<p className="font-semibold text-slate-900 dark:text-white group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors">
									{merchant.merchantName}
								</p>
								<p className="text-xs text-slate-600 dark:text-slate-400">
									{merchant.count} transaction{merchant.count !== 1 ? "s" : ""}
								</p>
							</div>
						</div>
						<div className="text-right">
							<p className="font-bold text-lg text-slate-900 dark:text-white">
								<CurrencyAmount animate amount={Number(merchant.totalAmount)} />
							</p>
						</div>
					</div>
				</button>
			))}
		</div>
	);
}
