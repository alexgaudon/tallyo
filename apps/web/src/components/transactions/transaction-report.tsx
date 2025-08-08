import { useQuery } from "@tanstack/react-query";
import { endOfMonth, startOfMonth } from "date-fns";
import { useCallback, useMemo, useState } from "react";
import type { DateRange } from "react-day-picker";
import { CategoryMultiSelect } from "@/components/categories/category-multi-select";
import DateRangePicker from "@/components/date-picker/date-range-picker";
import Loader from "@/components/loader";
import { MerchantMultiSelect } from "@/components/merchants/merchant-multi-select";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { CurrencyAmount } from "@/components/ui/currency-amount";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { orpc } from "@/utils/orpc";

interface TransactionReportFilters {
	dateFrom?: Date;
	dateTo?: Date;
	categoryIds?: string[];
	merchantIds?: string[];
	amountMin?: number;
	amountMax?: number;
	reviewed?: boolean;
	includeIncome?: boolean;
}

export function TransactionReport() {
	const defaultDateFrom = startOfMonth(new Date());
	const defaultDateTo = endOfMonth(new Date());

	const [filters, setFilters] = useState<TransactionReportFilters>({
		includeIncome: false,
		dateFrom: defaultDateFrom,
		dateTo: defaultDateTo,
	});

	const queryInput = useMemo(() => {
		// Convert UI dollars to cents
		const minCents =
			filters.amountMin !== undefined
				? Math.round(filters.amountMin * 100)
				: undefined;
		const maxCents =
			filters.amountMax !== undefined
				? Math.round(filters.amountMax * 100)
				: undefined;

		let apiAmountMin: number | undefined;
		let apiAmountMax: number | undefined;

		if (filters.includeIncome) {
			// When including income, pass through as-is (server compares raw values)
			apiAmountMin = minCents;
			apiAmountMax = maxCents;
		} else {
			// Expenses are negative in DB. Map absolute-dollar filters accordingly:
			// - both set: -max <= amount <= -min
			// - only min set: amount <= -min
			// - only max set: amount >= -max
			if (minCents !== undefined && maxCents !== undefined) {
				apiAmountMin = -maxCents;
				apiAmountMax = -minCents;
			} else if (minCents !== undefined) {
				apiAmountMin = undefined;
				apiAmountMax = -minCents;
			} else if (maxCents !== undefined) {
				apiAmountMin = -maxCents;
				apiAmountMax = undefined;
			}
		}

		return {
			dateFrom: filters.dateFrom,
			dateTo: filters.dateTo,
			categoryIds: filters.categoryIds,
			merchantIds: filters.merchantIds,
			amountMin: apiAmountMin,
			amountMax: apiAmountMax,
			reviewed: filters.reviewed,
			includeIncome: filters.includeIncome,
		};
	}, [filters]);

	const {
		data: reportData,
		isPending,
		isError,
		error,
	} = useQuery(
		orpc.transactions.getTransactionReport.queryOptions({
			input: queryInput,
		}),
	);

	const handleDateRangeChange = useCallback(
		(dateRange: DateRange | undefined) => {
			setFilters((prev) => ({
				...prev,
				dateFrom: dateRange?.from,
				dateTo: dateRange?.to,
			}));
		},
		[],
	);

	const handleCategoryChange = useCallback((categoryIds: string[]) => {
		setFilters((prev) => ({
			...prev,
			categoryIds: categoryIds.length > 0 ? categoryIds : undefined,
		}));
	}, []);

	const handleMerchantChange = useCallback((merchantIds: string[]) => {
		setFilters((prev) => ({
			...prev,
			merchantIds: merchantIds.length > 0 ? merchantIds : undefined,
		}));
	}, []);

	const handleAmountMinChange = useCallback((value: string) => {
		const numValue = value ? Number.parseFloat(value) : undefined;
		setFilters((prev) => ({
			...prev,
			amountMin: numValue,
		}));
	}, []);

	const handleAmountMaxChange = useCallback((value: string) => {
		const numValue = value ? Number.parseFloat(value) : undefined;
		setFilters((prev) => ({
			...prev,
			amountMax: numValue,
		}));
	}, []);

	const handleReviewedChange = useCallback((checked: boolean) => {
		setFilters((prev) => ({
			...prev,
			reviewed: checked,
		}));
	}, []);

	const handleIncludeIncomeChange = useCallback((checked: boolean) => {
		setFilters((prev) => ({
			...prev,
			includeIncome: checked,
		}));
	}, []);

	const dateRangeValue = useMemo(
		() => ({
			from: filters.dateFrom,
			to: filters.dateTo,
		}),
		[filters.dateFrom, filters.dateTo],
	);

	const handleResetFilters = useCallback(() => {
		setFilters({
			includeIncome: false,
			dateFrom: defaultDateFrom,
			dateTo: defaultDateTo,
			categoryIds: undefined,
			merchantIds: undefined,
			amountMin: undefined,
			amountMax: undefined,
			reviewed: undefined,
		});
	}, [defaultDateFrom, defaultDateTo]);

	return (
		<div className="space-y-6">
			{/* Filters Section */}
			<Card>
				<CardHeader>
					<div className="flex items-center justify-between gap-2">
						<CardTitle>Report Filters</CardTitle>
						<Button variant="ghost" size="sm" onClick={handleResetFilters}>
							Reset
						</Button>
					</div>
				</CardHeader>
				<CardContent className="space-y-4">
					{/* Date Range */}
					<div className="space-y-2">
						<Label>Date Range</Label>
						<DateRangePicker
							value={dateRangeValue}
							onRangeChange={handleDateRangeChange}
						/>
					</div>

					{/* Categories */}
					<div className="space-y-2">
						<Label>Categories</Label>
						<CategoryMultiSelect
							value={filters.categoryIds || []}
							onValueChange={handleCategoryChange}
							placeholder="Select categories to filter by"
							className="w-full"
						/>
					</div>

					{/* Merchants */}
					<div className="space-y-2">
						<Label>Merchants</Label>
						<MerchantMultiSelect
							value={filters.merchantIds || []}
							onValueChange={handleMerchantChange}
							placeholder="Select merchants to filter by"
							className="w-full"
						/>
					</div>

					{/* Amount Range */}
					<div className="grid grid-cols-2 gap-4">
						<div className="space-y-2">
							<Label>Minimum Amount</Label>
							<Input
								type="number"
								step="0.01"
								placeholder="0"
								value={filters.amountMin ?? ""}
								onChange={(e) => handleAmountMinChange(e.target.value)}
							/>
						</div>
						<div className="space-y-2">
							<Label>Maximum Amount</Label>
							<Input
								type="number"
								step="0.01"
								placeholder="0"
								value={filters.amountMax ?? ""}
								onChange={(e) => handleAmountMaxChange(e.target.value)}
							/>
						</div>
					</div>

					{/* Reviewed Status */}
					<div className="flex items-center space-x-2">
						<Switch
							id="reviewed"
							checked={filters.reviewed || false}
							onCheckedChange={handleReviewedChange}
						/>
						<Label htmlFor="reviewed">Only reviewed transactions</Label>
					</div>

					{/* Include Income */}
					<div className="flex items-center space-x-2">
						<Switch
							id="includeIncome"
							checked={filters.includeIncome || false}
							onCheckedChange={handleIncludeIncomeChange}
						/>
						<Label htmlFor="includeIncome">Include income transactions</Label>
					</div>
				</CardContent>
			</Card>

			{isPending && (
				<Card>
					<CardContent>
						<Loader />
					</CardContent>
				</Card>
			)}

			{isError && (
				<Card>
					<CardHeader>
						<CardTitle>Couldn’t load report</CardTitle>
					</CardHeader>
					<CardContent>
						<div className="text-sm text-destructive">
							{error instanceof Error ? error.message : "Unknown error"}
						</div>
					</CardContent>
				</Card>
			)}

			{/* Report Summary */}
			{reportData && reportData.transactions.length > 0 && (
				<Card>
					<CardHeader>
						<CardTitle>Report Summary</CardTitle>
					</CardHeader>
					<CardContent>
						<div className="flex flex-col md:flex-row justify-between items-stretch gap-4">
							<div className="flex-1 flex flex-col items-center justify-center bg-muted/50 rounded-lg p-6 shadow-sm border">
								<div className="text-3xl font-extrabold text-primary mb-1">
									{reportData.summary.totalCount}
								</div>
								<div className="text-xs uppercase tracking-wide text-muted-foreground font-medium">
									Total Transactions
								</div>
							</div>
							<div className="flex-1 flex flex-col items-center justify-center bg-muted/50 rounded-lg p-6 shadow-sm border">
								<div className="text-3xl font-extrabold text-primary mb-1">
									<CurrencyAmount
										amount={reportData.summary.totalAmount}
										animate
									/>
								</div>
								<div className="text-xs uppercase tracking-wide text-muted-foreground font-medium">
									Total Amount
								</div>
							</div>
							<div className="flex-1 flex flex-col items-center justify-center bg-muted/50 rounded-lg p-6 shadow-sm border">
								<div className="text-3xl font-extrabold text-primary mb-1">
									<CurrencyAmount
										amount={reportData.summary.averageAmount}
										animate
									/>
								</div>
								<div className="text-xs uppercase tracking-wide text-muted-foreground font-medium">
									Average Amount
								</div>
							</div>
						</div>
					</CardContent>
				</Card>
			)}

			{/* Transactions List */}
			{reportData && reportData.transactions.length > 0 && (
				<Card>
					<CardHeader>
						<CardTitle>
							Transactions ({reportData.transactions.length})
						</CardTitle>
					</CardHeader>
					<CardContent>
						<div className="space-y-2">
							{reportData.transactions.map((transaction) => (
								<div
									key={transaction.id}
									className="flex items-center justify-between p-3 border rounded-lg"
								>
									<div>
										<div className="font-medium">
											{transaction.transactionDetails}
										</div>
										<div className="text-sm text-muted-foreground">
											{new Date(transaction.date).toLocaleDateString()}
										</div>
									</div>
									<div className="text-right">
										<div className="font-medium">
											<CurrencyAmount amount={Number(transaction.amount)} />
										</div>
										<div className="text-sm text-muted-foreground">
											{transaction.reviewed ? "Reviewed" : "Unreviewed"}
										</div>
									</div>
								</div>
							))}
						</div>
					</CardContent>
				</Card>
			)}

			{reportData &&
				reportData.transactions.length === 0 &&
				!isPending &&
				!isError && (
					<Card>
						<CardHeader>
							<CardTitle>No results</CardTitle>
						</CardHeader>
						<CardContent>
							<div className="text-sm text-muted-foreground">
								No transactions match your current filters.
							</div>
						</CardContent>
					</Card>
				)}
		</div>
	);
}
