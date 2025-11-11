import { useNavigate } from "@tanstack/react-router";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
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

interface TooltipPayloadItem {
  payload: {
    name: string;
    value: number;
    count: number;
    average12Months: number;
    categoryId: string;
    fill: string;
  };
  name?: string;
  value?: number;
}

function CustomTooltip(props: {
  active?: boolean;
  payload?: TooltipPayloadItem[];
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
        className="bg-background border border-border rounded-md shadow-lg p-2 space-y-1"
        style={{ zIndex: 9999, position: "relative" }}
      >
        <div className="font-semibold text-xs">{data.name}</div>
        <div className="space-y-0.5 text-xs">
          <div className="flex justify-between gap-2">
            <span className="text-muted-foreground">Amount:</span>
            <span className="font-medium">
              <CurrencyAmount amount={data.value} />
            </span>
          </div>
          <div className="flex justify-between gap-2">
            <span className="text-muted-foreground">Percentage:</span>
            <span className="font-medium">{percentage}%</span>
          </div>
          <div className="flex justify-between gap-2">
            <span className="text-muted-foreground">Transactions:</span>
            <span className="font-medium">{data.count}</span>
          </div>
          <div className="flex justify-between gap-2">
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

  // Rerender tracking
  const renderCount = useRef(0);
  const prevProps = useRef<{ data: DashboardCategoryData }>({ data });

  useEffect(() => {
    renderCount.current += 1;
    console.group(`🔄 CategoryPieChart Rerender #${renderCount.current}`);
    console.log("Previous data:", prevProps.current.data);
    console.log("Current data:", data);

    // Check what changed
    if (prevProps.current.data !== data) {
      console.log("📊 Data reference changed");
      if (prevProps.current.data.length !== data.length) {
        console.log(
          `  - Length changed: ${prevProps.current.data.length} → ${data.length}`,
        );
      }
      // Check if data content changed
      const prevDataStr = JSON.stringify(prevProps.current.data);
      const currentDataStr = JSON.stringify(data);
      if (prevDataStr !== currentDataStr) {
        console.log("  - Data content changed");
      }
    }

    console.log("Active index:", activeIndex);
    console.groupEnd();

    prevProps.current = { data };
  });

  // Memoize chart data so it only recalculates when data prop changes
  const chartData = useMemo(() => {
    if (!data || data.length === 0) {
      return [];
    }

    const sortedData = [...data].sort(
      (a, b) => Number(a.amount) - Number(b.amount),
    );

    // Filter out income categories and prepare chart data
    return sortedData
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
  }, [data]);

  // Calculate total for percentage calculations
  const totalAmount = useMemo(
    () => chartData.reduce((sum, item) => sum + item.value, 0),
    [chartData],
  );

  const handleCategoryClick = useCallback(
    (categoryId: string) => {
      navigate({
        to: "/transactions",
        search: { category: categoryId, page: 1 },
      });
    },
    [navigate],
  );

  // Memoize tooltip content to prevent recreation on every render
  const tooltipContent = useCallback(
    (props: { active?: boolean; payload?: TooltipPayloadItem[] }) => (
      <CustomTooltip {...props} chartData={chartData} />
    ),
    [chartData],
  );

  // Memoize mouse event handlers
  const handleMouseEnter = useCallback((_: unknown, index: number) => {
    setActiveIndex(index);
  }, []);

  const handleMouseLeave = useCallback(() => {
    setActiveIndex(null);
  }, []);

  const handlePieClick = useCallback(
    (data: { categoryId?: string }) => {
      if (data?.categoryId) {
        handleCategoryClick(data.categoryId);
      }
    },
    [handleCategoryClick],
  );

  if (!data || data.length === 0) {
    return (
      <Card>
        <CardContent>
          <div className="flex flex-col items-center justify-center py-4 text-center">
            <p className="text-muted-foreground text-sm">
              No transaction data available to display category breakdown.
            </p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardContent className="p-4">
        <div
          className="grid grid-cols-1 lg:grid-cols-3 gap-3"
          style={{ position: "relative" }}
        >
          {/* Pie Chart */}
          <div className="flex justify-center lg:col-span-1">
            <div
              className="w-full max-w-[240px] h-[240px] min-h-[200px] relative"
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
                    outerRadius="75%"
                    innerRadius="40%"
                    fill="#8884d8"
                    isAnimationActive={false}
                    onMouseEnter={handleMouseEnter}
                    onMouseLeave={handleMouseLeave}
                    onClick={handlePieClick}
                    // Removed invalid activeShape prop for Pie, as recharts Pie does not support activeShape here.
                    style={{ cursor: "pointer" }}
                  />
                  <Tooltip content={tooltipContent} />
                </PieChart>
              </ResponsiveContainer>

              <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none z-10">
                <div className="text-center">
                  <div className="text-sm font-bold">
                    <CurrencyAmount animate amount={totalAmount} />
                  </div>
                  <div className="text-[10px] text-muted-foreground font-medium">
                    Total Spend
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Legend */}
          <div className="lg:col-span-2 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-1">
            {chartData.map((item, index) => {
              const percentage =
                totalAmount > 0
                  ? ((item.value / totalAmount) * 100).toFixed(1)
                  : "0.0";
              return (
                <button
                  key={item.name}
                  type="button"
                  className={`flex items-center gap-1.5 px-1.5 py-1 rounded ${
                    activeIndex === index
                      ? "bg-muted/50 border-accent-foreground/20"
                      : "bg-card hover:bg-muted/50"
                  } cursor-pointer transition-colors text-left min-w-0`}
                  onClick={() => handleCategoryClick(item.categoryId)}
                  aria-label={`View transactions for ${item.name} category`}
                >
                  <div
                    className="h-2.5 w-2.5 rounded-full shrink-0"
                    style={{ backgroundColor: item.fill }}
                  />
                  <div className="flex flex-col min-w-0 flex-1">
                    <span className="font-medium text-xs truncate leading-tight">
                      {item.name}
                    </span>
                    <span className="text-[10px] text-muted-foreground leading-tight">
                      <CurrencyAmount animate amount={item.value} /> (
                      {percentage}%)
                    </span>
                  </div>
                </button>
              );
            })}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
