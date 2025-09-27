import { useQuery } from "@tanstack/react-query";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { startOfMonth } from "date-fns";
import { CreditCardIcon, FileTextIcon, PlusIcon } from "lucide-react";
import { useState } from "react";
import type { DateRange } from "react-day-picker";
import { CategoryPieChart } from "@/components/dashboard/category-pie-chart";
import { MerchantStats } from "@/components/dashboard/merchant-stats";
import { Stats } from "@/components/dashboard/stats";
import { TrendChart } from "@/components/dashboard/trend-chart";
import { UnreviewedTransactionsBanner } from "@/components/dashboard/unreviewed-transactions-banner";
import DateRangePicker from "@/components/date-picker/date-range-picker";
import { DelayedLoading } from "@/components/delayed-loading";
import { CreateTransactionForm } from "@/components/transactions/create-transaction-form";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { CurrencyAmount } from "@/components/ui/currency-amount";
import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogHeader,
	DialogTitle,
	DialogTrigger,
} from "@/components/ui/dialog";
import { ensureSession, useSession } from "@/lib/auth-client";
import { dateRangeToApiFormat } from "@/lib/utils";
import { orpc, queryClient } from "@/utils/orpc";

export const Route = createFileRoute("/dashboard")({
	component: RouteComponent,
	beforeLoad: async ({ context }) => {
		ensureSession(context.isAuthenticated, "/dashboard");
	},
	loader: async ({ context }) => {
		const defaultDateRange = {
			from: startOfMonth(new Date()),
			to: new Date(),
		};
		const [statsData, categoryData, merchantData] = await Promise.all([
			context.queryClient.ensureQueryData(
				orpc.dashboard.getStatsCounts.queryOptions({
					input: dateRangeToApiFormat(defaultDateRange),
				}),
			),
			context.queryClient.ensureQueryData(
				orpc.dashboard.getCategoryData.queryOptions({
					input: dateRangeToApiFormat(defaultDateRange),
				}),
			),
			context.queryClient.ensureQueryData(
				orpc.dashboard.getMerchantStats.queryOptions({
					input: dateRangeToApiFormat(defaultDateRange),
				}),
			),
		]);
		return {
			statsData,
			categoryData,
			merchantData,
		};
	},
});

function RouteComponent() {
	const { data: session } = useSession();
	const navigate = useNavigate();
	const [isCreateFormOpen, setIsCreateFormOpen] = useState(false);
	const [dateRange, setDateRange] = useState<DateRange | undefined>({
		from: startOfMonth(new Date()),
		to: new Date(),
	});

	const loaderData = Route.useLoaderData();

	const { data: statsData, isLoading: isStatsLoading } = useQuery(
		orpc.dashboard.getStatsCounts.queryOptions({
			placeholderData: (previousData) => previousData,
			input: dateRangeToApiFormat(dateRange),
			initialData: loaderData.statsData,
		}),
	);

	const { data: categoryData, isLoading: isCategoryLoading } = useQuery(
		orpc.dashboard.getCategoryData.queryOptions({
			placeholderData: (previousData) => previousData,
			input: dateRangeToApiFormat(dateRange),
			initialData: loaderData.categoryData,
		}),
	);

	const { data: merchantData, isLoading: isMerchantLoading } = useQuery(
		orpc.dashboard.getMerchantStats.queryOptions({
			placeholderData: (previousData) => previousData,
			input: dateRangeToApiFormat(dateRange),
			initialData: loaderData.merchantData,
		}),
	);

	return (
		<div className="container mx-auto max-w-7xl p-4 sm:p-6 space-y-4 sm:space-y-6">
			<div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
				<div className="flex items-center gap-2">
					<CreditCardIcon className="h-5 w-5 sm:h-6 sm:w-6" />
					<h1 className="text-xl sm:text-2xl font-bold">Dashboard</h1>
				</div>
				<div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 sm:gap-4">
					<div className="flex items-center gap-2">
						<Dialog
							open={isCreateFormOpen}
							onOpenChange={(open) => {
								setIsCreateFormOpen(open);
							}}
						>
							<DialogTrigger asChild>
								<Button variant="outline" className="flex-1 sm:flex-none">
									<PlusIcon className="h-4 w-4 mr-2" />
									<span className="hidden sm:inline">New Transaction</span>
									<span className="sm:hidden">New</span>
								</Button>
							</DialogTrigger>
							<DialogContent className="sm:max-w-[600px]">
								<DialogHeader>
									<DialogTitle>Create New Transaction</DialogTitle>
									<DialogDescription>
										Add a new transaction to your records.
									</DialogDescription>
								</DialogHeader>
								<CreateTransactionForm
									callback={() => {
										queryClient.invalidateQueries({
											queryKey: ["dashboard", "getStatsCounts"],
										});
										queryClient.invalidateQueries({
											queryKey: ["dashboard", "getCategoryData"],
										});
										queryClient.invalidateQueries({
											queryKey: ["dashboard", "getMerchantStats"],
										});
										setIsCreateFormOpen(false);
									}}
								/>
							</DialogContent>
						</Dialog>
						<button
							type="button"
							onClick={() => navigate({ to: "/reports" })}
							className="flex-1 sm:flex-none inline-flex items-center justify-center gap-2 px-3 sm:px-4 py-2 bg-secondary hover:bg-secondary/80 text-secondary-foreground text-sm font-medium rounded-lg shadow-sm transition-colors"
						>
							<FileTextIcon className="h-4 w-4" />
							<span className="hidden xs:inline">View Reports</span>
							<span className="xs:hidden">Reports</span>
						</button>
					</div>
					<div className="w-full sm:w-auto">
						<DateRangePicker value={dateRange} onRangeChange={setDateRange} />
					</div>
				</div>
			</div>

			<DelayedLoading
				isLoading={isStatsLoading || isCategoryLoading || isMerchantLoading}
			>
				<div className="space-y-8">
					{/* Unreviewed Transactions Banner */}
					<UnreviewedTransactionsBanner
						count={session?.meta?.unreviewedTransactionCount ?? 0}
					/>

					{/* Key Metrics Grid */}
					<div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-6">
						{/* Net Income Card */}
						<Card className="p-4 sm:p-6">
							<div className="flex items-center justify-between">
								<div className="flex-1 min-w-0">
									<p className="text-xs sm:text-sm font-medium text-muted-foreground truncate">
										Net Income
									</p>
									<div className="mt-1">
										<span className="text-lg sm:text-2xl font-bold block">
											<CurrencyAmount
												amount={
													Math.abs(statsData?.stats.totalIncome || 0) -
													Math.abs(statsData?.stats.totalExpenses || 0)
												}
												animate
											/>
										</span>
									</div>
								</div>
								<div className="w-10 h-10 sm:w-12 sm:h-12 bg-primary/10 rounded-xl flex items-center justify-center ml-3 flex-shrink-0">
									<CreditCardIcon className="h-5 w-5 sm:h-6 sm:w-6 text-primary" />
								</div>
							</div>
						</Card>

						{/* Savings Rate Card */}
						<Card className="p-4 sm:p-6">
							<div className="flex items-center justify-between">
								<div className="flex-1 min-w-0">
									<p className="text-xs sm:text-sm font-medium text-muted-foreground truncate">
										Savings Rate
									</p>
									<div className="mt-1">
										<span className="text-lg sm:text-2xl font-bold block">
											{(() => {
												const income = Math.abs(
													statsData?.stats.totalIncome || 0,
												);
												const expenses = Math.abs(
													statsData?.stats.totalExpenses || 0,
												);
												const savingsRate =
													income + expenses === 0
														? 0
														: (income - expenses) / income;
												const displaySavingsRate =
													savingsRate > 0 ? savingsRate : 0;
												return Math.round(displaySavingsRate * 100);
											})()}%
										</span>
									</div>
								</div>
								<div className="w-10 h-10 sm:w-12 sm:h-12 bg-primary/10 rounded-xl flex items-center justify-center ml-3 flex-shrink-0">
									<div className="text-primary font-bold text-base sm:text-lg">
										💰
									</div>
								</div>
							</div>
						</Card>

						{/* Total Transactions Card */}
						<Card className="p-4 sm:p-6">
							<div className="flex items-center justify-between">
								<div className="flex-1 min-w-0">
									<p className="text-xs sm:text-sm font-medium text-muted-foreground truncate">
										Transactions
									</p>
									<div className="mt-1">
										<span className="text-lg sm:text-2xl font-bold block">
											{statsData?.stats.totalTransactions || 0}
										</span>
									</div>
								</div>
								<div className="w-10 h-10 sm:w-12 sm:h-12 bg-primary/10 rounded-xl flex items-center justify-center ml-3 flex-shrink-0">
									<div className="text-primary font-bold text-base sm:text-lg">
										📊
									</div>
								</div>
							</div>
						</Card>

						{/* Active Categories Card */}
						<Card className="p-4 sm:p-6">
							<div className="flex items-center justify-between">
								<div className="flex-1 min-w-0">
									<p className="text-xs sm:text-sm font-medium text-muted-foreground truncate">
										Categories
									</p>
									<div className="mt-1">
										<span className="text-lg sm:text-2xl font-bold block">
											{statsData?.stats.totalCategories || 0}
										</span>
									</div>
								</div>
								<div className="w-10 h-10 sm:w-12 sm:h-12 bg-primary/10 rounded-xl flex items-center justify-center ml-3 flex-shrink-0">
									<div className="text-primary font-bold text-base sm:text-lg">
										🏷️
									</div>
								</div>
							</div>
						</Card>
					</div>

					{/* Main Content Grid */}
					<div className="grid grid-cols-1 lg:grid-cols-3 gap-6 sm:gap-8">
						{/* Left Column - Stats and Trends */}
						<div className="lg:col-span-2 space-y-6 sm:space-y-8 order-2 lg:order-1">
							{/* Financial Trends */}
							<Card className="p-4 sm:p-6">
								<TrendChart data={categoryData ?? []} />
							</Card>

							{/* Income vs Expenses Overview */}
							<Card className="p-4 sm:p-6">
								<h2 className="text-lg sm:text-xl font-semibold mb-4 sm:mb-6">
									Income & Expenses
								</h2>
								<Stats data={statsData} categoryData={categoryData} />
							</Card>

							{/* Category Breakdown */}
							<Card className="p-4 sm:p-6">
								<h2 className="text-lg sm:text-xl font-semibold mb-4 sm:mb-6">
									Spending by Category
								</h2>
								<CategoryPieChart data={categoryData ?? []} />
							</Card>
						</div>

						{/* Right Column - Merchants */}
						<div className="space-y-6 sm:space-y-8 order-1 lg:order-2">
							<Card className="p-4 sm:p-6">
								<h2 className="text-lg sm:text-xl font-semibold mb-4 sm:mb-6">
									Top Merchants
								</h2>
								<MerchantStats data={merchantData} />
							</Card>
						</div>
					</div>
				</div>
			</DelayedLoading>
		</div>
	);
}
