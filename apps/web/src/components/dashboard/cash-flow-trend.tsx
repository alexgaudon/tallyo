import { BarChart } from "@mui/x-charts/BarChart";
import { useMemo } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { useSession } from "@/lib/auth-client";
import { formatCurrency, formatValueWithPrivacy } from "@/lib/utils";
import type { DashboardCashFlowTrend } from "../../../../server/src/routers";

const INCOME_COLOR = "var(--income)";
const EXPENSE_COLOR = "var(--expense)";

export function CashFlowTrend({ data }: { data: DashboardCashFlowTrend }) {
  const { data: session } = useSession();
  const isPrivacyMode = session?.settings?.isPrivacyMode ?? false;

  const { labels, income, expenses } = useMemo(() => {
    const buckets = data?.buckets ?? [];
    return {
      labels: buckets.map((bucket) => {
        if (data?.granularity === "month") {
          const [year, month] = bucket.key.split("-");
          const date = new Date(Number(year), Number(month) - 1, 1);
          return date.toLocaleDateString("en-US", {
            month: "short",
            year: "2-digit",
          });
        }
        const date = new Date(`${bucket.key}T00:00:00`);
        return date.toLocaleDateString("en-US", {
          month: "short",
          day: "numeric",
        });
      }),
      income: buckets.map((bucket) => bucket.income),
      expenses: buckets.map((bucket) => Math.abs(bucket.expenses)),
    };
  }, [data]);

  const formatAmount = (value: number | null) =>
    String(formatValueWithPrivacy(formatCurrency(value ?? 0), isPrivacyMode));

  if (!data || data.buckets.length === 0) {
    return (
      <Card>
        <CardContent className="p-6">
          <div className="flex flex-col items-center justify-center py-8 text-center">
            <p className="text-muted-foreground text-sm">
              No transaction data available to display a cash flow trend.
            </p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardContent className="p-4">
        <div className="w-full overflow-x-auto">
          <div className="min-w-[320px]">
            <BarChart
              height={260}
              series={[
                {
                  data: income,
                  label: "Income",
                  color: INCOME_COLOR,
                  valueFormatter: (value) => formatAmount(value),
                },
                {
                  data: expenses,
                  label: "Expenses",
                  color: EXPENSE_COLOR,
                  valueFormatter: (value) => formatAmount(value),
                },
              ]}
              xAxis={[{ scaleType: "band", data: labels }]}
              yAxis={[
                {
                  valueFormatter: (value: number | null) => formatAmount(value),
                },
              ]}
              margin={{ top: 12, right: 16, bottom: 32, left: 56 }}
              skipAnimation
            />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
