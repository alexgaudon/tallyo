import { CategoryChart } from "@/components/dashboard/category-chart";
import { Stats } from "@/components/dashboard/stats";
import DateRangePicker from "@/components/date-picker/date-range-picker";
import { ensureSession } from "@/lib/auth-client";
import { orpc } from "@/utils/orpc";
import { useQuery } from "@tanstack/react-query";
import { createFileRoute } from "@tanstack/react-router";
import { addDays } from "date-fns";
import { CreditCardIcon } from "lucide-react";
import { useState } from "react";
import type { DateRange } from "react-day-picker";

export const Route = createFileRoute("/dashboard")({
	component: RouteComponent,
	beforeLoad: async ({ context }) => {
		ensureSession(context.isAuthenticated, "/dashboard");
		await Promise.all([
			context.queryClient.prefetchQuery(
				orpc.dashboard.getStatsCounts.queryOptions(),
			),
			context.queryClient.prefetchQuery(
				orpc.dashboard.getCategoryData.queryOptions(),
			),
		]);
	},
});

function RouteComponent() {
	const [dateRange, setDateRange] = useState<DateRange | undefined>({
		from: addDays(new Date(), -20),
		to: new Date(),
	});

	const { data: statsData } = useQuery(
		orpc.dashboard.getStatsCounts.queryOptions({
			select: (data) => data.stats,
		}),
	);

	const { data: categoryData } = useQuery(
		orpc.dashboard.getCategoryData.queryOptions({
			select: (data) => data,
		}),
	);

	return (
		<div className="min-h-screen bg-background">
			{/* Header Section */}
			<div className="border-b bg-card">
				<div className="container mx-auto px-4 py-6">
					<div className="flex items-center justify-between">
						<div className="flex items-center gap-3">
							<div className="flex items-center justify-center w-10 h-10 rounded-lg bg-primary/10">
								<CreditCardIcon className="h-5 w-5 text-primary" />
							</div>
							<div>
								<h1 className="text-2xl font-bold tracking-tight">Dashboard</h1>
								<p className="text-sm text-muted-foreground">
									Overview of your financial activity
								</p>
							</div>
						</div>
					</div>
				</div>
			</div>
			<div className="flex mx-auto justify-center mt-4">
				<DateRangePicker onRangeChange={setDateRange} />
			</div>

			{/* Main Content */}
			<div className="container mx-auto px-4 py-8">
				{/* Stats Section */}
				<div className="mb-8">
					<h2 className="text-lg font-semibold mb-4">Overview</h2>
					<Stats data={statsData} />
				</div>

				{/* Category Chart Section */}
				<div className="space-y-4">
					<h2 className="text-lg font-semibold">Category Breakdown</h2>
					<CategoryChart data={categoryData ?? []} />
				</div>
			</div>
		</div>
	);
}
