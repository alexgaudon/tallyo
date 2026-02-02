import { format, parseISO } from "date-fns";
import { memo, useMemo } from "react";
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
import { useSession } from "@/lib/auth-client";
import { formatCurrency, formatValueWithPrivacy } from "@/lib/utils";
import type { DashboardCashFlowData } from "../../../../server/src/routers";

function CustomTooltip({
  active,
  payload,
}: {
  active?: boolean;
  payload?: Array<{
    value: number;
    name: string;
    dataKey: string;
    payload: {
      month: string;
      monthLabel?: string;
      income: number;
      expenses: number;
      net: number;
    };
  }>;
  label?: string | number;
}) {
  if (active && payload && payload.length > 0) {
    const data = payload[0].payload;

    return (
      <div className="bg-popover border border-border/50 rounded-lg shadow-lg p-3 space-y-1.5 min-w-[160px]">
        <div className="font-semibold text-sm border-b pb-1.5">
          {data.monthLabel || format(parseISO(`${data.month}-01`), "MMM, yyyy")}
        </div>
        <div className="space-y-1.5 text-sm">
          <div className="flex justify-between items-center gap-4">
            <span className="text-muted-foreground">Income:</span>
            <span className="font-medium text-green-600 dark:text-green-500">
              <CurrencyAmount amount={data.income} />
            </span>
          </div>
          <div className="flex justify-between items-center gap-4">
            <span className="text-muted-foreground">Expenses:</span>
            <span className="font-medium text-red-600 dark:text-red-500">
              <CurrencyAmount amount={data.expenses} />
            </span>
          </div>
          <div className="flex justify-between items-center pt-1.5 border-t gap-4">
            <span className="text-muted-foreground font-medium">Net:</span>
            <span
              className={`font-semibold ${data.net >= 0 ? "text-green-600 dark:text-green-500" : "text-red-600 dark:text-red-500"}`}
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

const EMPTY_ARRAY: DashboardCashFlowData = [];

export const CashFlowChart = memo(function CashFlowChart({
  data,
}: {
  data: DashboardCashFlowData;
}) {
  const { data: session } = useSession();
  const isPrivacyMode = session?.settings?.isPrivacyMode ?? false;

  // Transform data for the chart - memoized to prevent unnecessary re-renders
  const chartData = useMemo(
    () =>
      data?.map((item) => ({
        ...item,
        monthLabel: format(parseISO(`${item.month}-01`), "MMM, yyyy"),
      })) ?? EMPTY_ARRAY,
    [data],
  );

  // Y-axis tick formatter with privacy mode support
  const yAxisTickFormatter = useMemo(
    () => (value: number) => {
      const formatted = formatCurrency(value);
      return String(formatValueWithPrivacy(formatted, isPrivacyMode));
    },
    [isPrivacyMode],
  );

  if (!data || data.length === 0) {
    return (
      <Card className="shadow-sm">
        <CardHeader className="pb-3">
          <CardTitle>Cash Flow</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col items-center justify-center py-8 text-center">
            <p className="text-sm text-muted-foreground">
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
      <Card className="shadow-sm">
        <CardHeader className="pb-3">
          <CardTitle className="sr-only">Cash Flow</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col items-center justify-center py-6 text-center space-y-3">
            <div className="text-base font-semibold text-muted-foreground">
              {format(parseISO(`${item.month}-01`), "MMMM yyyy")}
            </div>
            <div className="grid grid-cols-3 gap-6 w-full max-w-sm">
              <div className="text-center">
                <div className="text-xs text-muted-foreground mb-1.5">
                  Income
                </div>
                <div className="text-lg font-semibold text-green-600 dark:text-green-500">
                  <CurrencyAmount amount={item.income} />
                </div>
              </div>
              <div className="text-center">
                <div className="text-xs text-muted-foreground mb-1.5">
                  Expenses
                </div>
                <div className="text-lg font-semibold text-red-600 dark:text-red-500">
                  <CurrencyAmount amount={item.expenses} />
                </div>
              </div>
              <div className="text-center">
                <div className="text-xs text-muted-foreground mb-1.5">Net</div>
                <div
                  className={`text-lg font-semibold ${item.net >= 0 ? "text-green-600 dark:text-green-500" : "text-red-600 dark:text-red-500"}`}
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

  return (
    <Card className="shadow-sm">
      <CardHeader className="pb-3">
        <CardTitle className="sr-only">Cash Flow</CardTitle>
      </CardHeader>
      <CardContent className="pt-0">
        <div className="h-[300px] w-full">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={chartData}>
              <XAxis
                dataKey="monthLabel"
                axisLine={false}
                tickLine={false}
                tick={{ fontSize: 12 }}
                interval="preserveStartEnd"
                height={32}
              />
              <YAxis
                axisLine={false}
                tickLine={false}
                tick={{ fontSize: 12 }}
                width={80}
                tickFormatter={yAxisTickFormatter}
              />
              <Tooltip
                content={CustomTooltip}
                cursor={{
                  stroke: "#888",
                  strokeWidth: 1,
                  strokeDasharray: "4 4",
                }}
              />
              <Line
                key="income"
                type="monotone"
                dataKey="income"
                stroke="#22c55e"
                strokeWidth={2}
                dot={{ fill: "#22c55e", strokeWidth: 2, r: 4 }}
                activeDot={{ r: 6 }}
                name="Income"
                isAnimationActive={true}
              />
              <Line
                key="expenses"
                type="monotone"
                dataKey="expenses"
                stroke="#dc2626"
                strokeWidth={2}
                dot={{ fill: "#dc2626", strokeWidth: 2, r: 4 }}
                activeDot={{ r: 6 }}
                name="Expenses"
                isAnimationActive={true}
              />
              <Line
                key="net"
                type="monotone"
                dataKey="net"
                stroke="#a78bfa"
                strokeWidth={2.5}
                dot={{ fill: "#a78bfa", strokeWidth: 2, r: 4 }}
                activeDot={{ r: 6 }}
                name="Net"
                isAnimationActive={true}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
        {data.length > 1 && (
          <div className="flex justify-center gap-5 mt-4 text-sm">
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 bg-green-500" />
              <span>Income</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 bg-red-500" />
              <span>Expenses</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-8 h-0.5 bg-accent" />
              <span>Net</span>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
});
