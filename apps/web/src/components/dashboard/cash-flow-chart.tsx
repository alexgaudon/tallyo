import { format, parseISO } from "date-fns";
import {
	Line,
	LineChart,
	ResponsiveContainer,
	Tooltip,
	XAxis,
	YAxis,
} from "recharts";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { CurrencyAmount } from "@/components/ui/currency-amount";
import type { DashboardCashFlowData } from "../../../../server/src/routers";

function CustomTooltip({
	active,
	payload,
}: {
	active?: boolean;
	payload?: Array<{
		payload: {
			month: string;
			income: number;
			expenses: number;
			net: number;
		};
	}>;
}) {
	if (active && payload && payload.length) {
		const data = payload[0].payload;
		return (
			<div className="bg-background border border-border rounded-lg shadow-lg p-3 space-y-2">
				<div className="font-semibold text-sm">
					{format(parseISO(`${data.month}-01`), "MMM, yyyy")}
				</div>
				<div className="space-y-1 text-xs">
					<div className="flex justify-between">
						<span className="text-muted-foreground">Income:</span>
						<span className="font-medium text-green-600">
							<CurrencyAmount amount={data.income} />
						</span>
					</div>
					<div className="flex justify-between">
						<span className="text-muted-foreground">Expenses:</span>
						<span className="font-medium text-red-600">
							<CurrencyAmount amount={data.expenses} />
						</span>
					</div>
					<div className="flex justify-between">
						<span className="text-muted-foreground">Net:</span>
						<span
							className={`font-medium ${data.net >= 0 ? "text-green-600" : "text-red-600"}`}
						>
							<CurrencyAmount amount={data.net} />
						</span>
					</div>
				</div>
			</div>
		);
	}
	return null;
}

export function CashFlowChart({ data }: { data: DashboardCashFlowData }) {
	if (!data || data.length === 0) {
		return (
			<Card>
				<CardHeader>
					<CardTitle>Cash Flow</CardTitle>
				</CardHeader>
				<CardContent>
					<div className="flex flex-col items-center justify-center py-8 text-center">
						<p className="text-muted-foreground">
							No transaction data available to display cash flow.
						</p>
					</div>
				</CardContent>
			</Card>
		);
	}

	// If only one data point, show text instead of chart
	if (data.length === 1) {
		const item = data[0];
		return (
			<Card>
				<CardHeader>
					<CardTitle>Cash Flow</CardTitle>
				</CardHeader>
				<CardContent>
					<div className="flex flex-col items-center justify-center py-8 text-center space-y-4">
						<div className="text-lg font-semibold">
							{format(parseISO(`${item.month}-01`), "MMMM yyyy")}
						</div>
						<div className="grid grid-cols-3 gap-6 w-full max-w-md">
							<div className="text-center">
								<div className="text-sm text-muted-foreground">Income</div>
								<div className="text-lg font-semibold text-green-600">
									<CurrencyAmount amount={item.income} />
								</div>
							</div>
							<div className="text-center">
								<div className="text-sm text-muted-foreground">Expenses</div>
								<div className="text-lg font-semibold text-red-600">
									<CurrencyAmount amount={item.expenses} />
								</div>
							</div>
							<div className="text-center">
								<div className="text-sm text-muted-foreground">Net</div>
								<div
									className={`text-lg font-semibold ${item.net >= 0 ? "text-green-600" : "text-red-600"}`}
								>
									<CurrencyAmount amount={item.net} />
								</div>
							</div>
						</div>
					</div>
				</CardContent>
			</Card>
		);
	}

	// Transform data for the chart
	const chartData = data.map((item) => ({
		...item,
		monthLabel: format(parseISO(`${item.month}-01`), "MMM, yyyy"),
	}));

	return (
		<Card>
			<CardHeader>
				<CardTitle>Cash Flow</CardTitle>
			</CardHeader>
			<CardContent>
				<div className="h-[400px] w-full">
					<ResponsiveContainer width="100%" height="100%">
						<LineChart data={chartData}>
							<XAxis
								dataKey="monthLabel"
								axisLine={false}
								tickLine={false}
								tick={{ fontSize: 12 }}
								interval="preserveStartEnd"
							/>
							<YAxis
								axisLine={false}
								tickLine={false}
								tick={{ fontSize: 12 }}
								tickFormatter={(value) => `$${(value / 100).toFixed(0)}`}
							/>
							<Tooltip content={<CustomTooltip />} />
							<Line
								type="monotone"
								dataKey="income"
								stroke="#10b981"
								strokeWidth={2}
								dot={{ fill: "#10b981", strokeWidth: 2, r: 4 }}
								activeDot={{ r: 6 }}
								name="Income"
							/>
							<Line
								type="monotone"
								dataKey="expenses"
								stroke="#ef4444"
								strokeWidth={2}
								dot={{ fill: "#ef4444", strokeWidth: 2, r: 4 }}
								activeDot={{ r: 6 }}
								name="Expenses"
							/>
							<Line
								type="monotone"
								dataKey="net"
								stroke="#3b82f6"
								strokeWidth={3}
								dot={{ fill: "#3b82f6", strokeWidth: 2, r: 4 }}
								activeDot={{ r: 6 }}
								name="Net"
							/>
						</LineChart>
					</ResponsiveContainer>
				</div>
				{data.length > 1 && (
					<div className="flex justify-center gap-6 mt-4 text-sm">
						<div className="flex items-center gap-2">
							<div className="w-3 h-3 rounded-full bg-green-500" />
							<span>Income</span>
						</div>
						<div className="flex items-center gap-2">
							<div className="w-3 h-3 rounded-full bg-red-500" />
							<span>Expenses</span>
						</div>
						<div className="flex items-center gap-2">
							<div className="w-3 h-0.5 bg-blue-500" />
							<span>Net</span>
						</div>
					</div>
				)}
			</CardContent>
		</Card>
	);
}
