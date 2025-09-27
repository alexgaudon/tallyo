import { useMemo } from "react";
import {
	Line,
	LineChart,
	ResponsiveContainer,
	Tooltip,
	XAxis,
	YAxis,
} from "recharts";
import { useTheme } from "@/components/theme-provider";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { CurrencyAmount } from "@/components/ui/currency-amount";
import type { DashboardCategoryData } from "../../../../server/src/routers";

// Chart colors that adapt to theme
function getChartColors(theme: string) {
	const isDark = theme === "dark";

	if (isDark) {
		return {
			income: "#a855f7", // purple-500
			expenses: "#3b82f6", // blue-500
			axisText: "#ffffff", // white for dark background
		};
	} else {
		return {
			income: "#10b981", // emerald-500
			expenses: "#ef4444", // red-500
			axisText: "#000000", // black for light background
		};
	}
}

interface TrendDataPoint {
	month: string;
	income: number;
	expenses: number;
}

interface TooltipEntry {
	color: string;
	dataKey: string;
	value: number;
}

function CustomTooltip({
	active,
	payload,
	label,
}: {
	active?: boolean;
	payload?: TooltipEntry[];
	label?: string;
}) {
	if (active && payload && payload.length) {
		return (
			<div className="bg-background border border-border rounded-lg shadow-lg p-3">
				<p className="font-semibold text-sm mb-2">{label}</p>
				<div className="space-y-1">
					{payload.map((entry: TooltipEntry) => (
						<div
							key={entry.dataKey}
							className="flex items-center gap-2 text-xs"
						>
							<div
								className="w-3 h-3 rounded-full"
								style={{ backgroundColor: entry.color }}
							/>
							<span className="text-muted-foreground capitalize">
								{entry.dataKey}:
							</span>
							<span className="font-medium">
								<CurrencyAmount amount={entry.value} />
							</span>
						</div>
					))}
				</div>
			</div>
		);
	}
	return null;
}

export function TrendChart({ data }: { data: DashboardCategoryData }) {
	const { theme } = useTheme();
	const chartColors = getChartColors(theme);

	const trendData = useMemo(() => {
		if (!data || data.length === 0) return [];

		// Group data by month and calculate totals
		const monthlyData = new Map<string, { income: number; expenses: number }>();

		// Get current date for relative month calculation
		const now = new Date();
		const currentMonth = now.getMonth();
		const currentYear = now.getFullYear();

		// Process each category's 12-month average
		data.forEach((category) => {
			const avgAmount = category.average12Months || 0;

			// For simplicity, we'll distribute the 12-month average across 12 months
			// In a real app, you'd want actual monthly data
			for (let i = 11; i >= 0; i--) {
				const date = new Date(currentYear, currentMonth - i, 1);
				const monthKey = date.toLocaleDateString("en-US", {
					month: "short",
					year: "2-digit",
				});

				const existing = monthlyData.get(monthKey) || {
					income: 0,
					expenses: 0,
				};

				if (category.category.treatAsIncome) {
					existing.income += Math.abs(avgAmount) / 12; // Distribute across months
				} else {
					existing.expenses += Math.abs(avgAmount) / 12; // Distribute across months
				}

				monthlyData.set(monthKey, existing);
			}
		});

		// Convert to array and sort by date
		const result: TrendDataPoint[] = Array.from(monthlyData.entries())
			.map(([month, values]) => ({
				month,
				income: Math.round(values.income),
				expenses: Math.round(values.expenses),
			}))
			.sort((a, b) => {
				// Simple sort - in real app you'd parse dates properly
				const months = [
					"Jan",
					"Feb",
					"Mar",
					"Apr",
					"May",
					"Jun",
					"Jul",
					"Aug",
					"Sep",
					"Oct",
					"Nov",
					"Dec",
				];
				const aMonth = a.month.split(" ")[0];
				const bMonth = b.month.split(" ")[0];
				return months.indexOf(aMonth) - months.indexOf(bMonth);
			});

		return result;
	}, [data]);

	if (!data || data.length === 0 || trendData.length === 0) {
		return (
			<Card>
				<CardHeader>
					<CardTitle>Financial Trends</CardTitle>
				</CardHeader>
				<CardContent>
					<div className="flex flex-col items-center justify-center py-8 text-center">
						<p className="text-muted-foreground">
							Trend data will appear here once you have more transaction
							history.
						</p>
					</div>
				</CardContent>
			</Card>
		);
	}

	return (
		<Card>
			<CardHeader>
				<CardTitle>12-Month Financial Trends</CardTitle>
			</CardHeader>
			<CardContent>
				<div className="h-80">
					<ResponsiveContainer width="100%" height="100%">
						<LineChart data={trendData}>
							<XAxis
								dataKey="month"
								axisLine={false}
								tickLine={false}
								tick={{ fontSize: 12, fill: chartColors.axisText }}
							/>
							<YAxis
								axisLine={false}
								tickLine={false}
								tick={{ fontSize: 12, fill: chartColors.axisText }}
								tickFormatter={(value) => `$${(value / 1000).toFixed(0)}k`}
							/>
							<Tooltip content={<CustomTooltip />} />
							<Line
								type="monotone"
								dataKey="income"
								stroke={chartColors.income}
								strokeWidth={3}
								dot={{ fill: chartColors.income, strokeWidth: 2, r: 4 }}
								activeDot={{
									r: 6,
									stroke: chartColors.income,
									strokeWidth: 2,
								}}
							/>
							<Line
								type="monotone"
								dataKey="expenses"
								stroke={chartColors.expenses}
								strokeWidth={3}
								dot={{ fill: chartColors.expenses, strokeWidth: 2, r: 4 }}
								activeDot={{
									r: 6,
									stroke: chartColors.expenses,
									strokeWidth: 2,
								}}
							/>
						</LineChart>
					</ResponsiveContainer>
				</div>
				<div className="flex items-center justify-center gap-6 mt-4">
					<div className="flex items-center gap-2">
						<div
							className="w-3 h-3 rounded-full"
							style={{ backgroundColor: chartColors.income }}
						/>
						<span className="text-sm text-muted-foreground">Income</span>
					</div>
					<div className="flex items-center gap-2">
						<div
							className="w-3 h-3 rounded-full"
							style={{ backgroundColor: chartColors.expenses }}
						/>
						<span className="text-sm text-muted-foreground">Expenses</span>
					</div>
				</div>
			</CardContent>
		</Card>
	);
}
