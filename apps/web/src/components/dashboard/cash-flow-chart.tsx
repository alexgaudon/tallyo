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
      <div className="bg-background border border-border rounded-md shadow-lg p-2 space-y-1 min-w-[150px]">
        <div className="font-semibold text-xs border-b pb-1">
          {data.monthLabel || format(parseISO(`${data.month}-01`), "MMM, yyyy")}
        </div>
        <div className="space-y-1 text-xs">
          <div className="flex justify-between items-center gap-3">
            <span className="text-muted-foreground">Income:</span>
            <span className="font-medium text-green-600 dark:text-green-500">
              <CurrencyAmount amount={data.income} />
            </span>
          </div>
          <div className="flex justify-between items-center gap-3">
            <span className="text-muted-foreground">Expenses:</span>
            <span className="font-medium text-red-600 dark:text-red-500">
              <CurrencyAmount amount={data.expenses} />
            </span>
          </div>
          <div className="flex justify-between items-center pt-1 border-t gap-3">
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
      <Card>
        <CardHeader className="pb-3">
          <CardTitle>Cash Flow</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col items-center justify-center py-4 text-center">
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
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="sr-only">Cash Flow</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col items-center justify-center py-4 text-center space-y-2">
            <div className="text-sm font-semibold text-muted-foreground">
              {format(parseISO(`${item.month}-01`), "MMMM yyyy")}
            </div>
            <div className="grid grid-cols-3 gap-4 w-full max-w-sm">
              <div className="text-center">
                <div className="text-xs text-muted-foreground mb-1">Income</div>
                <div className="text-base font-semibold text-green-600 dark:text-green-500">
                  <CurrencyAmount amount={item.income} />
                </div>
              </div>
              <div className="text-center">
                <div className="text-xs text-muted-foreground mb-1">
                  Expenses
                </div>
                <div className="text-base font-semibold text-red-600 dark:text-red-500">
                  <CurrencyAmount amount={item.expenses} />
                </div>
              </div>
              <div className="text-center">
                <div className="text-xs text-muted-foreground mb-1">Net</div>
                <div
                  className={`text-base font-semibold ${item.net >= 0 ? "text-green-600 dark:text-green-500" : "text-red-600 dark:text-red-500"}`}
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
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="sr-only">Cash Flow</CardTitle>
      </CardHeader>
      <CardContent className="pt-0">
        <div className="h-[280px] w-full">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={chartData}>
              <XAxis
                dataKey="monthLabel"
                axisLine={false}
                tickLine={false}
                tick={{ fontSize: 11 }}
                interval="preserveStartEnd"
                height={30}
              />
              <YAxis
                axisLine={false}
                tickLine={false}
                tick={{ fontSize: 11 }}
                width={80}
                tickFormatter={yAxisTickFormatter}
              />
              <Tooltip content={CustomTooltip} />
              <Line
                key="income"
                type="monotone"
                dataKey="income"
                stroke="#10b981"
                strokeWidth={2}
                dot={{ fill: "#10b981", strokeWidth: 2, r: 3 }}
                activeDot={{ r: 5 }}
                name="Income"
                isAnimationActive={false}
              />
              <Line
                key="expenses"
                type="monotone"
                dataKey="expenses"
                stroke="#ef4444"
                strokeWidth={2}
                dot={{ fill: "#ef4444", strokeWidth: 2, r: 3 }}
                activeDot={{ r: 5 }}
                name="Expenses"
                isAnimationActive={false}
              />
              <Line
                key="net"
                type="monotone"
                dataKey="net"
                stroke="#3b82f6"
                strokeWidth={2.5}
                dot={{ fill: "#3b82f6", strokeWidth: 2, r: 3 }}
                activeDot={{ r: 5 }}
                name="Net"
                isAnimationActive={false}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
        {data.length > 1 && (
          <div className="flex justify-center gap-4 mt-3 text-xs">
            <div className="flex items-center gap-1.5">
              <div className="w-2.5 h-2.5 rounded-full bg-green-500" />
              <span>Income</span>
            </div>
            <div className="flex items-center gap-1.5">
              <div className="w-2.5 h-2.5 rounded-full bg-red-500" />
              <span>Expenses</span>
            </div>
            <div className="flex items-center gap-1.5">
              <div className="w-2.5 h-0.5 bg-blue-500" />
              <span>Net</span>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
});
