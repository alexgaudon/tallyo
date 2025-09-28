import { useQuery } from "@tanstack/react-query";
import {
	createFileRoute,
	useNavigate,
	useSearch,
} from "@tanstack/react-router";
import { format, parseISO, startOfMonth } from "date-fns";
import { CreditCardIcon } from "lucide-react";
import { useMemo } from "react";
import type { DateRange } from "react-day-picker";
import { z } from "zod";
import { CategoryPieChart } from "@/components/dashboard/category-pie-chart";
import { MerchantStats } from "@/components/dashboard/merchant-stats";
import { Stats } from "@/components/dashboard/stats";
import { UnreviewedTransactionsBanner } from "@/components/dashboard/unreviewed-transactions-banner";
import DateRangePicker from "@/components/date-picker/date-range-picker";
import { DelayedLoading } from "@/components/delayed-loading";
import { ensureSession, useSession } from "@/lib/auth-client";
import { dateRangeToApiFormat } from "@/lib/utils";
import { orpc } from "@/utils/orpc";

const searchSchema = z.object({
	from: z.string().optional(),
	to: z.string().optional(),
});

type SearchParams = z.infer<typeof searchSchema>;

export const Route = createFileRoute("/dashboard")({
	validateSearch: searchSchema,
	component: RouteComponent,
	beforeLoad: async ({ context, search }) => {
		ensureSession(context.isAuthenticated, "/dashboard");

		const defaultDateRange = {
			from: startOfMonth(new Date()),
			to: new Date(),
		};
		const dateRange =
			search.from && search.to
				? {
						from: parseISO(search.from),
						to: parseISO(search.to),
					}
				: defaultDateRange;

		await Promise.all([
			context.queryClient.prefetchQuery(
				orpc.dashboard.getStatsCounts.queryOptions({
					input: dateRangeToApiFormat(dateRange),
				}),
			),
			context.queryClient.prefetchQuery(
				orpc.dashboard.getCategoryData.queryOptions({
					input: dateRangeToApiFormat(dateRange),
				}),
			),
			context.queryClient.prefetchQuery(
				orpc.dashboard.getMerchantStats.queryOptions({
					input: dateRangeToApiFormat(dateRange),
				}),
			),
		]);
	},
});

function RouteComponent() {
	const { data: session } = useSession();
	const navigate = useNavigate();
	const search = useSearch({ from: "/dashboard" });

	const dateRange = useMemo((): DateRange | undefined => {
		if (search.from && search.to) {
			return {
				from: parseISO(search.from),
				to: parseISO(search.to),
			};
		}
		return {
			from: startOfMonth(new Date()),
			to: new Date(),
		};
	}, [search.from, search.to]);

	const handleDateRangeChange = (newDateRange: DateRange | undefined) => {
		navigate({
			to: "/dashboard",
			search: {
				from: newDateRange?.from
					? format(newDateRange.from, "yyyy-MM-dd")
					: undefined,
				to: newDateRange?.to
					? format(newDateRange.to, "yyyy-MM-dd")
					: undefined,
			} as SearchParams,
		});
	};

	const { data: statsData, isLoading: isStatsLoading } = useQuery(
		orpc.dashboard.getStatsCounts.queryOptions({
			placeholderData: (previousData) => previousData,
			input: dateRangeToApiFormat(dateRange),
		}),
	);

	const { data: categoryData, isLoading: isCategoryLoading } = useQuery(
		orpc.dashboard.getCategoryData.queryOptions({
			placeholderData: (previousData) => previousData,
			input: dateRangeToApiFormat(dateRange),
		}),
	);

	const { data: merchantData, isLoading: isMerchantLoading } = useQuery(
		orpc.dashboard.getMerchantStats.queryOptions({
			placeholderData: (previousData) => previousData,
			input: dateRangeToApiFormat(dateRange),
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
				<DateRangePicker
					value={dateRange}
					onRangeChange={handleDateRangeChange}
				/>
			</div>

			<DelayedLoading
				isLoading={isStatsLoading || isCategoryLoading || isMerchantLoading}
			>
				{/* Main Content */}
				<div className="container mx-auto px-4 py-8">
					{/* Unreviewed Transactions Banner */}
					<UnreviewedTransactionsBanner
						count={session?.meta?.unreviewedTransactionCount ?? 0}
					/>
					{(session?.meta?.unreviewedTransactionCount ?? 0) > 0 && (
						<div className="mb-6" />
					)}
					{/* Stats and Merchants Section */}
					<div className="flex flex-col md:flex-row gap-6">
						<div className="flex flex-col flex-1">
							<h2 className="text-lg font-semibold mb-4">Overview Stats</h2>
							<div className="flex-1">
								<Stats data={statsData} categoryData={categoryData} />
							</div>
						</div>
						<div className="flex flex-col flex-1">
							<h2 className="text-lg font-semibold mb-4">Top Merchants</h2>
							<div className="flex-1">
								<MerchantStats data={merchantData} />
							</div>
						</div>
					</div>

					{/* Category Breakdown Section */}
					<div className="space-y-4 mt-8">
						<h2 className="text-lg font-semibold mb-4">Category Breakdown</h2>
						<CategoryPieChart data={categoryData ?? []} />
					</div>
				</div>
			</DelayedLoading>
		</div>
	);
}
