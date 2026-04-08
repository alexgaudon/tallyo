import type { PieItemIdentifier } from "@mui/x-charts";
import { PieChart } from "@mui/x-charts/PieChart";
import { useNavigate } from "@tanstack/react-router";
import { ChevronDown } from "lucide-react";
import { useCallback, useMemo, useRef, useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { CurrencyAmount } from "@/components/ui/currency-amount";
import type { DashboardCategoryData } from "../../../../server/src/routers";
import { formatCategoryText } from "../categories/category-select";

const chartColors = [
  "var(--chart-1)",
  "var(--chart-2)",
  "var(--chart-3)",
  "var(--chart-4)",
  "var(--chart-5)",
  "var(--chart-6)",
  "var(--chart-7)",
  "var(--chart-8)",
  "#f59e0b", // amber
  "#84cc16", // lime
  "#06b6d4", // cyan
  "#8b5cf6", // violet
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

interface ChartItem {
  id: string;
  value: number;
  label: string;
  color: string;
  count: number;
  average12Months: number;
  categoryId: string;
}

export function CategoryPieChart({ data }: { data: DashboardCategoryData }) {
  const [activeItemId, setActiveItemId] = useState<string | null>(null);
  const [isScrolledToBottom, setIsScrolledToBottom] = useState(false);
  const legendRef = useRef<HTMLDivElement>(null);
  const navigate = useNavigate();

  // Process all data - no grouping
  const chartData = useMemo<ChartItem[]>(() => {
    if (!data || data.length === 0) {
      return [];
    }

    // Sort by amount descending (largest first)
    const sortedData = [...data].sort(
      (a, b) => Math.abs(Number(b.amount)) - Math.abs(Number(a.amount)),
    );

    // Filter out income categories and map to chart items
    return sortedData
      .filter(
        (item) =>
          !item.category.treatAsIncome && !item.category.hideFromInsights,
      )
      .map((item) => ({
        id: item.category.id,
        value: Math.abs(Number(item.amount)),
        label: formatCategoryText(item.category),
        color: getColorFromCategoryId(item.category.id),
        count: item.count,
        categoryId: item.category.id,
        average12Months: item.average12Months || 0,
      }));
  }, [data]);

  // Calculate total
  const totalAmount = useMemo(
    () => chartData.reduce((sum, item) => sum + item.value, 0),
    [chartData],
  );

  // Check if we need scroll indicator (more than 3 rows worth)
  // Mobile: 2 cols × 3 rows = 6, Desktop: 3 cols × 3 rows = 9
  const needsScrollIndicator = chartData.length > 6;

  // Handle scroll to detect when at bottom
  const handleScroll = useCallback(() => {
    if (legendRef.current) {
      const { scrollTop, scrollHeight, clientHeight } = legendRef.current;
      // Check if scrolled to bottom (within 2px threshold)
      const isAtBottom = scrollTop + clientHeight >= scrollHeight - 2;
      // Only update state if it changed
      setIsScrolledToBottom((prev) => {
        if (prev !== isAtBottom) {
          return isAtBottom;
        }
        return prev;
      });
    }
  }, []);

  const handleCategoryClick = useCallback(
    (categoryId: string) => {
      navigate({
        to: "/transactions",
        search: { category: categoryId, page: 1 },
      });
    },
    [navigate],
  );

  // Handle item click from pie chart
  const handleItemClick = useCallback(
    (_event: React.MouseEvent, params: PieItemIdentifier) => {
      const item = chartData[params.dataIndex];
      if (item?.categoryId) {
        handleCategoryClick(item.categoryId);
      }
    },
    [chartData, handleCategoryClick],
  );

  // Handle highlight change (hover)
  const handleHighlightChange = useCallback(
    (
      highlightedItem: {
        dataIndex?: number;
        seriesId?: number | string;
      } | null,
    ) => {
      if (highlightedItem?.dataIndex !== undefined) {
        const item = chartData[highlightedItem.dataIndex];
        setActiveItemId(item?.id ?? null);
      } else {
        setActiveItemId(null);
      }
    },
    [chartData],
  );

  if (!data || data.length === 0) {
    return (
      <Card className="shadow-sm">
        <CardContent className="p-6">
          <div className="flex flex-col items-center justify-center py-8 text-center">
            <p className="text-muted-foreground text-sm">
              No transaction data available to display category breakdown.
            </p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="shadow-sm">
      <CardContent className="p-4">
        <div className="flex flex-col sm:flex-row gap-4">
          {/* Chart Section */}
          <div className="flex-shrink-0 flex justify-center">
            <div className="relative w-[220px] h-[220px]">
              <PieChart
                series={[
                  {
                    data: chartData,
                    innerRadius: 50,
                    outerRadius: 85,
                    paddingAngle: 0.5,
                    cornerRadius: 2,
                    highlightScope: { fade: "global", highlight: "item" },
                    faded: {
                      innerRadius: 50,
                      additionalRadius: -2,
                      color: "gray",
                    },
                    valueFormatter: (item) => {
                      const dollars = item.value / 100;
                      return new Intl.NumberFormat("en-US", {
                        style: "currency",
                        currency: "USD",
                      }).format(dollars);
                    },
                  },
                ]}
                width={220}
                height={220}
                onItemClick={handleItemClick}
                onHighlightChange={handleHighlightChange}
                skipAnimation
                hideLegend
              />

              {/* Center Text */}
              <div
                className="absolute pointer-events-none"
                style={{
                  top: "50%",
                  left: "50%",
                  transform: "translate(-50%, -50%)",
                }}
              >
                <div className="text-center">
                  <div className="text-base font-semibold leading-tight whitespace-nowrap">
                    <CurrencyAmount animate amount={totalAmount} />
                  </div>
                  <div className="mt-0.5 text-[10px] text-muted-foreground font-medium tracking-wide uppercase whitespace-nowrap">
                    Total
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Custom Legend - Scrollable if many items */}
          <div className="flex-1 min-h-0 relative">
            <div
              ref={legendRef}
              onScroll={handleScroll}
              className="grid grid-cols-2 lg:grid-cols-3 gap-x-3 gap-y-1.5 max-h-[220px] overflow-y-auto pr-1"
              style={{
                scrollbarWidth: "thin",
                scrollbarColor: "var(--muted-foreground) transparent",
              }}
            >
              {chartData.map((item) => {
                const percentage =
                  totalAmount > 0
                    ? ((item.value / totalAmount) * 100).toFixed(1)
                    : "0.0";
                const isActive = activeItemId === item.id;
                return (
                  <button
                    key={item.id}
                    type="button"
                    className={`flex items-center gap-2 px-2 py-1 rounded-md text-left transition-colors cursor-pointer ${
                      isActive ? "bg-muted" : "hover:bg-muted/50"
                    }`}
                    onClick={() => handleCategoryClick(item.categoryId)}
                    onMouseEnter={() => setActiveItemId(item.id)}
                    onMouseLeave={() => setActiveItemId(null)}
                    title={`${item.label}: ${item.count} transactions`}
                  >
                    <div
                      className="h-2.5 w-2.5 rounded-full shrink-0"
                      style={{ backgroundColor: item.color }}
                    />
                    <div className="flex flex-col min-w-0 flex-1 overflow-hidden">
                      <span className="text-sm font-medium truncate leading-tight">
                        {item.label}
                      </span>
                      <span className="text-xs text-muted-foreground tabular-nums">
                        <CurrencyAmount amount={item.value} /> ({percentage}%)
                      </span>
                    </div>
                  </button>
                );
              })}
            </div>

            {/* Scroll indicator - shown when more than 3 rows and not scrolled to bottom */}
            {needsScrollIndicator && !isScrolledToBottom && (
              <div className="absolute bottom-0 left-0 right-0 h-6 bg-gradient-to-t from-card to-transparent pointer-events-none flex items-end justify-center pb-0.5">
                <ChevronDown className="w-4 h-4 text-muted-foreground" />
              </div>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
