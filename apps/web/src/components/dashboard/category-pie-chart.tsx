import { useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { Pie, PieChart, ResponsiveContainer, Tooltip } from "recharts";
import { Card, CardContent } from "@/components/ui/card";
import { CurrencyAmount } from "@/components/ui/currency-amount";
import type { DashboardCategoryData } from "../../../../server/src/routers";
import { formatCategoryText } from "../categories/category-select";

// Chart colors for different categories
const chartColors = [
	"#3b82f6", // blue
	"#10b981", // green
	"#f59e0b", // amber
	"#ef4444", // red
	"#8b5cf6", // violet
	"#06b6d4", // cyan
	"#f97316", // orange
	"#84cc16", // lime
	"#ec4899", // pink
	"#6366f1", // indigo
	"#14b8a6", // teal
	"#f43f5e", // rose
	"#a855f7", // purple
	"#0ea5e9", // sky
	"#22c55e", // emerald
	"#eab308", // yellow
];

function hashString(str: string): number {
	let hash = 5381;
	for (let i = 0; i < str.length; i++) {
		hash = (hash * 33) ^ str.charCodeAt(i);
	}

	return hash >>> 0;
}

function getColorFromCategoryId(categoryId: string): string {
	const hash = hashString(categoryId);
	return chartColors[hash % chartColors.length];
}

function CustomTooltip(props: {
	active?: boolean;
	payload?: Array<{
		payload: {
			name: string;
			value: number;
			count: number;
			average12Months: number;
		};
	}>;
	chartData: Array<{ value: number }>;
}) {
	const { active, payload } = props;

	if (active && payload && payload.length) {
		const data = payload[0].payload;
		const total = props.chartData.reduce(
			(sum: number, item: { value: number }) => sum + item.value,
			0,
		);
		const percentage = ((data.value / total) * 100).toFixed(1);

		return (
			<div
				className="bg-background border border-border rounded-lg shadow-lg p-3 space-y-2"
				style={{ zIndex: 9999, position: "relative" }}
			>
				<div className="font-semibold text-sm">{data.name}</div>
				<div className="space-y-1 text-xs">
					<div className="flex justify-between">
						<span className="text-muted-foreground">Amount:</span>
						<span className="font-medium">
							<CurrencyAmount amount={data.value} />
						</span>
					</div>
					<div className="flex justify-between">
						<span className="text-muted-foreground">Percentage:</span>
						<span className="font-medium">{percentage}%</span>
					</div>
					<div className="flex justify-between">
						<span className="text-muted-foreground">Transactions:</span>
						<span className="font-medium">{data.count}</span>
					</div>
					<div className="flex justify-between">
						<span className="text-muted-foreground">12-Month Avg:</span>
						<span className="font-medium">
							<CurrencyAmount amount={data.average12Months} />
						</span>
					</div>
				</div>
			</div>
		);
	}
	return null;
}

export function CategoryPieChart({ data }: { data: DashboardCategoryData }) {
	const [activeIndex, setActiveIndex] = useState<number | null>(null);
	const navigate = useNavigate();

	if (!data || data.length === 0) {
		return (
			<Card>
				<CardContent>
					<div className="flex flex-col items-center justify-center py-8 text-center">
						<p className="text-muted-foreground">
							No transaction data available to display category breakdown.
						</p>
					</div>
				</CardContent>
			</Card>
		);
	}

	const sortedData = [...data].sort(
		(a, b) => Number(a.amount) - Number(b.amount),
	);

	// Filter out income categories and prepare chart data
	const chartData = sortedData
		.filter((item) => !item.category.treatAsIncome)
		.filter((item) => !item.category.hideFromInsights)
		.map((item) => ({
			name: formatCategoryText(item.category),
			value: Math.abs(Number(item.amount)),
			fill: getColorFromCategoryId(item.category.id),
			count: item.count,
			categoryId: item.category.id,
			average12Months: item.average12Months || 0,
		}));

	const handleCategoryClick = (categoryId: string) => {
		navigate({
			to: "/transactions",
			search: { category: categoryId, page: 1 },
		});
	};

	return (
		<Card>
			<CardContent>
				<div
					className="grid grid-cols-1 xl:grid-cols-3 gap-4"
					style={{ position: "relative" }}
				>
					{/* Pie Chart */}
					<div className="flex justify-center xl:col-span-1">
						<div
							className="w-full max-w-[400px] h-[400px] min-h-[300px] relative"
							style={{ position: "relative", zIndex: 1 }}
						>
							<ResponsiveContainer width="100%" height="100%">
								<PieChart>
									<Pie
										data={chartData}
										dataKey="value"
										nameKey="name"
										cx="50%"
										cy="50%"
										outerRadius="80%"
										innerRadius="35%"
										fill="#8884d8"
										onMouseEnter={(_, index) => setActiveIndex(index)}
										onMouseLeave={() => setActiveIndex(null)}
										onClick={(data) => {
											if (data?.categoryId) {
												handleCategoryClick(data.categoryId);
											}
										}}
										// Removed invalid activeShape prop for Pie, as recharts Pie does not support activeShape here.
										style={{ cursor: "pointer" }}
									/>
									<Tooltip
										content={(props) => (
											<CustomTooltip {...props} chartData={chartData} />
										)}
									/>
								</PieChart>
							</ResponsiveContainer>

							{/* Center text with total spent */}
							<div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none z-10">
								<div className="text-center">
									<div className="text-xs text-muted-foreground font-medium">
										Total Spent
									</div>
									<div className="text-base font-bold">
										<CurrencyAmount
											animate
											amount={chartData.reduce(
												(sum, item) => sum + item.value,
												0,
											)}
										/>
									</div>
								</div>
							</div>
						</div>
					</div>

					{/* Legend */}
					<div className="xl:col-span-2 grid grid-cols-1 md:grid-cols-2 gap-1.5">
						{chartData.map((item, index) => (
							<button
								key={item.name}
								type="button"
								className={`flex items-center justify-between p-1.5 rounded-md border ${
									activeIndex === index
										? "bg-accent border-accent-foreground/20"
										: "bg-card hover:bg-accent/50"
								} cursor-pointer transition-colors text-left min-w-0`}
								onClick={() => handleCategoryClick(item.categoryId)}
								aria-label={`View transactions for ${item.name} category`}
							>
								<div className="flex items-center gap-2 min-w-0 flex-1">
									<div
										className="h-3 w-3 rounded-full flex-shrink-0"
										style={{ backgroundColor: item.fill }}
									/>
									<div className="flex flex-col min-w-0 flex-1">
										<span className="font-medium text-xs truncate">
											{item.name}
										</span>
										<span className="text-muted-foreground truncate text-xs">
											{item.count} transaction
											{item.count !== 1 ? "s" : ""}
										</span>
									</div>
								</div>
								<div className="text-right flex-shrink-0 ml-2">
									<span className="font-semibold text-sm">
										<CurrencyAmount animate amount={item.value} />
									</span>
								</div>
							</button>
						))}
					</div>
				</div>
			</CardContent>
		</Card>
	);
}
