import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useSession } from "@/lib/auth-client";
import { formatCurrency, formatValueWithPrivacy } from "@/lib/utils";
import { useState } from "react";
import type { TooltipProps } from "recharts";
import { Pie, PieChart, ResponsiveContainer, Tooltip } from "recharts";
import type { CategoryData } from "../../../../server/src/routers";
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

export function CategoryPieChart({ data }: { data: CategoryData }) {
	const [activeIndex, setActiveIndex] = useState<number | null>(null);
	const { data: session } = useSession();
	const isPrivacyMode = session?.settings?.isPrivacyMode ?? false;

	if (!data || data.length === 0) {
		return (
			<Card>
				<CardHeader>
					<CardTitle>Category Breakdown</CardTitle>
				</CardHeader>
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
		}));

	// Custom tooltip component
	function CustomTooltip({ active, payload }: TooltipProps<number, string>) {
		if (active && payload && payload.length) {
			const data = payload[0].payload;
			const total = chartData.reduce(
				(sum: number, item: { value: number }) => sum + item.value,
				0,
			);
			const percentage = ((data.value / total) * 100).toFixed(1);

			return (
				<div className="bg-background border border-border rounded-lg shadow-lg p-3 space-y-2">
					<div className="font-semibold text-sm">{data.name}</div>
					<div className="space-y-1 text-xs">
						<div className="flex justify-between">
							<span className="text-muted-foreground">Amount:</span>
							<span className="font-medium">
								{formatValueWithPrivacy(
									formatCurrency(data.value),
									isPrivacyMode,
								)}
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
					</div>
				</div>
			);
		}
		return null;
	}

	return (
		<Card>
			<CardHeader>
				<CardTitle>Category Breakdown</CardTitle>
			</CardHeader>
			<CardContent>
				<div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
					{/* Pie Chart */}
					<div className="flex justify-center">
						<div className="w-full max-w-[400px] h-[400px] min-h-[300px]">
							<ResponsiveContainer width="100%" height="100%">
								<PieChart>
									<Pie
										data={chartData}
										dataKey="value"
										nameKey="name"
										cx="50%"
										cy="50%"
										outerRadius="80%"
										innerRadius="20%"
										fill="#8884d8"
										activeIndex={activeIndex !== null ? [activeIndex] : []}
										onMouseEnter={(_, index) => setActiveIndex(index)}
										onMouseLeave={() => setActiveIndex(null)}
									/>
									<Tooltip content={<CustomTooltip />} />
								</PieChart>
							</ResponsiveContainer>
						</div>
					</div>

					{/* Legend */}
					<div className="grid grid-cols-2 gap-1.5">
						{chartData.map((item, index) => (
							<div
								key={item.name}
								className={`flex items-center justify-between p-1.5 rounded-md border ${
									activeIndex === index
										? "bg-accent border-accent-foreground/20"
										: "bg-card hover:bg-accent/50"
								}`}
							>
								<div className="flex items-center gap-2">
									<div
										className="h-3 w-3 rounded-full flex-shrink-0"
										style={{ backgroundColor: item.fill }}
									/>
									<div className="flex flex-col min-w-0">
										<span className="font-medium text-xs truncate">
											{item.name}
										</span>
										<span className="text-[10px] text-muted-foreground">
											{item.count} transaction
											{item.count !== 1 ? "s" : ""}
										</span>
									</div>
								</div>
								<div className="text-right flex-shrink-0">
									<span className="font-semibold text-sm">
										{formatValueWithPrivacy(
											formatCurrency(item.value),
											isPrivacyMode,
										)}
									</span>
								</div>
							</div>
						))}
					</div>
				</div>
			</CardContent>
		</Card>
	);
}
