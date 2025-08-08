import { TransactionReport } from "@/components/transactions/transaction-report";
import { ensureSession } from "@/lib/auth-client";
import { orpc } from "@/utils/orpc";
import { createFileRoute } from "@tanstack/react-router";
import { BarChart3Icon } from "lucide-react";

export const Route = createFileRoute("/reports")({
	component: RouteComponent,
	beforeLoad: async ({ context }) => {
		ensureSession(context.isAuthenticated, "/reports");
		await Promise.all([
			context.queryClient.prefetchQuery(
				orpc.categories.getUserCategories.queryOptions(),
			),
			context.queryClient.prefetchQuery(
				orpc.merchants.getUserMerchants.queryOptions(),
			),
		]);
	},
});

function RouteComponent() {
	return (
		<div className="min-h-screen bg-background">
			{/* Header Section */}
			<div className="border-b bg-card">
				<div className="container mx-auto px-4 py-6">
					<div className="flex items-center gap-3">
						<div className="flex items-center justify-center w-10 h-10 rounded-lg bg-primary/10">
							<BarChart3Icon className="h-5 w-5 text-primary" />
						</div>
						<div>
							<h1 className="text-2xl font-bold tracking-tight">
								Transaction Reports
							</h1>
							<p className="text-sm text-muted-foreground">
								Generate detailed reports on your transactions
							</p>
						</div>
					</div>
				</div>
			</div>

			{/* Main Content */}
			<div className="container mx-auto px-4 py-8">
				<TransactionReport />
			</div>
		</div>
	);
}
