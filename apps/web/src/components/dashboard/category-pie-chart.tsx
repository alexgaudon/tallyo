import { defineChart } from "@tanstack/charts";
import { focusGroupAngle, pie, polar, radialArc } from "@tanstack/charts/polar";
import { Chart } from "@tanstack/charts/react";
import { tooltip } from "@tanstack/charts/tooltip";
import { useNavigate } from "@tanstack/react-router";
import { ChevronDown } from "lucide-react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { CurrencyAmount } from "@/components/ui/currency-amount";
import { getColorFromCategoryId } from "@/lib/chart-colors";
import { formatCurrency } from "@/lib/utils";
import type {
  DashboardCategoryData,
  DashboardPeriodComparison,
} from "../../../../server/src/routers";
import { formatCategoryText } from "../categories/category-select";

interface ChartItem {
  id: string;
  value: number;
  label: string;
  color: string;
  count: number;
  categoryId: string;
}

export function CategoryPieChart({
  data,
  previous,
}: {
  data: DashboardCategoryData;
  previous?: DashboardPeriodComparison["categories"];
}) {
  const [activeItemId, setActiveItemId] = useState<string | null>(null);
  const [hasLegendOverflow, setHasLegendOverflow] = useState(false);
  const [isScrolledToBottom, setIsScrolledToBottom] = useState(false);
  const legendRef = useRef<HTMLDivElement>(null);
  const navigate = useNavigate();

  const previousMap = useMemo(() => {
    const map = new Map<string, number>();
    for (const item of previous ?? []) {
      map.set(item.categoryId, item.amount);
    }
    return map;
  }, [previous]);

  // Process all data - no grouping
  const chartData = useMemo<ChartItem[]>(() => {
    if (!data || data.length === 0) {
      return [];
    }

    // Sort by amount descending (largest first)
    const sortedData = [...data].sort(
      (a, b) => Math.abs(Number(b.amount)) - Math.abs(Number(a.amount)),
    );

    // Map to chart items, honoring the server's income/expense selection
    return sortedData
      .filter((item) => !item.category.hideFromInsights)
      .map((item) => ({
        id: item.category.id,
        value: Math.abs(Number(item.amount)),
        label: formatCategoryText(item.category),
        color: getColorFromCategoryId(item.category.id),
        count: item.count,
        categoryId: item.category.id,
      }));
  }, [data]);

  // Calculate total
  const totalAmount = useMemo(
    () => chartData.reduce((sum, item) => sum + item.value, 0),
    [chartData],
  );

  const updateLegendOverflowState = useCallback(() => {
    if (legendRef.current) {
      const { scrollTop, scrollHeight, clientHeight } = legendRef.current;
      const hasOverflow = scrollHeight > clientHeight + 2;
      const isAtBottom = scrollTop + clientHeight >= scrollHeight - 2;
      setHasLegendOverflow(hasOverflow);
      setIsScrolledToBottom(!hasOverflow || isAtBottom);
    }
  }, []);

  // Handle scroll to detect when at bottom
  const handleScroll = useCallback(() => {
    updateLegendOverflowState();
  }, [updateLegendOverflowState]);

  useEffect(() => {
    updateLegendOverflowState();

    const node = legendRef.current;
    if (!node) return;

    const resizeObserver = new ResizeObserver(() => {
      updateLegendOverflowState();
    });
    resizeObserver.observe(node);

    return () => {
      resizeObserver.disconnect();
    };
  }, [updateLegendOverflowState]);

  const handleCategoryClick = useCallback(
    (categoryId: string) => {
      navigate({
        to: "/transactions",
        search: { category: categoryId, page: 1 },
      });
    },
    [navigate],
  );

  // Allocate the chart data into angular slices
  const pieData = useMemo(
    () => pie(chartData, { value: (item) => item.value }),
    [chartData],
  );

  // Rebuild the definition whenever the active slice changes so the fill
  // accessor can fade non-active slices (radialArc has no declarative states).
  const definition = useMemo(
    () =>
      defineChart({
        marks: [
          polar({
            inset: 4,
            radiusRatio: 0.96,
            marks: [
              radialArc(pieData, {
                key: (datum) => datum.categoryId,
                innerRadius: ({ radius }) => radius * 0.55,
                cornerRadius: 2,
                stroke: "var(--card)",
                strokeWidth: 2,
                fill: (datum) => {
                  if (
                    activeItemId !== null &&
                    activeItemId !== datum.categoryId
                  ) {
                    return `color-mix(in srgb, ${datum.color} 22%, transparent)`;
                  }
                  return datum.color;
                },
              }),
            ],
          }),
        ],
        focus: focusGroupAngle,
        tooltip: {
          use: tooltip,
          content: (points) => {
            const point = points[0];
            if (!point) {
              return { rows: [] };
            }
            return {
              title: point.datum.label,
              color: point.color,
              rows: [
                {
                  label: "Amount",
                  value: formatCurrency(point.datum.value),
                },
              ],
            };
          },
        },
      }),
    [pieData, activeItemId],
  );

  // Keep the legend in sync with the hovered slice
  const handleFocusChange = useCallback(
    (point: { datum: ChartItem } | null) => {
      setActiveItemId(point?.datum.categoryId ?? null);
    },
    [],
  );

  // Handle item click from pie chart
  const handleItemClick = useCallback(
    (point: { datum: ChartItem } | null) => {
      const categoryId = point?.datum.categoryId;
      if (categoryId) {
        handleCategoryClick(categoryId);
      }
    },
    [handleCategoryClick],
  );

  if (!data || data.length === 0) {
    return (
      <Card>
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
    <Card>
      <CardContent className="p-4">
        <div className="flex flex-col sm:flex-row gap-4">
          {/* Chart Section */}
          <div className="flex-shrink-0 flex justify-center">
            <div className="relative w-[220px] h-[220px]">
              <Chart
                definition={definition}
                width={220}
                height={220}
                ariaLabel="Category spending breakdown"
                onFocusChange={handleFocusChange}
                onSelect={handleItemClick}
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
                  <div className="mt-1 text-xs text-muted-foreground font-medium tracking-wide uppercase whitespace-nowrap">
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
              className="grid grid-cols-2 lg:grid-cols-3 gap-x-3 gap-y-2 max-h-[220px] overflow-y-auto pr-1"
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
                const prevAmount = previousMap.get(item.categoryId);
                const delta =
                  prevAmount === undefined ? null : item.value - prevAmount;
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
                      {delta !== null && (
                        <span
                          className={`text-[11px] tabular-nums ${
                            delta > 0
                              ? "text-expense"
                              : delta < 0
                                ? "text-income"
                                : "text-muted-foreground"
                          }`}
                        >
                          {delta === 0 ? (
                            "Same as last period"
                          ) : (
                            <>
                              {delta > 0 ? "▲" : "▼"}{" "}
                              <CurrencyAmount amount={Math.abs(delta)} /> vs
                              last period
                            </>
                          )}
                        </span>
                      )}
                    </div>
                  </button>
                );
              })}
            </div>

            {/* Scroll indicator - shown only when legend actually overflows */}
            {hasLegendOverflow && !isScrolledToBottom && (
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
