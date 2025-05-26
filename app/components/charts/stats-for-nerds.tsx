import { usePrivacyMode } from "@/components/toggle-privacy-mode";
import { ChartsRespository } from "@/repositories/charts";
import { useQuery } from "@tanstack/react-query";
import { Hash, PiggyBank, TrendingDown, TrendingUp } from "lucide-react";
import AmountDisplay from "../transactions/amount-display";
import { Card, CardHeader, CardTitle } from "../ui/card";
import { StatsSkeleton } from "./skeletons";

export function StatsForNerds(props: { from: Date; to: Date }) {
  const { data, isLoading } = useQuery(
    ChartsRespository.getStatsDataQuery({
      from: props.from,
      to: props.to,
    }),
  );

  const { isPrivacyMode } = usePrivacyMode();

  if (isLoading) {
    return <StatsSkeleton />;
  }

  if (!data) {
    return <h1>No data available</h1>;
  }

  return (
    <div className="gap-4 grid md:grid-cols-1 lg:grid-cols-2" suppressHydrationWarning>
      <Card>
        <CardHeader className="space-y-1">
          <CardTitle className="flex items-center gap-2 font-bold text-2xl">
            <Hash className="w-5 h-5" />
            {!isPrivacyMode ? data.count : "•".repeat(data.count.toString().length)}
          </CardTitle>
          <p className="text-gray-500 text-sm">tracked transactions</p>
        </CardHeader>
      </Card>

      <Card>
        <CardHeader className="space-y-1">
          <CardTitle className="flex items-center gap-2 font-bold text-2xl">
            <TrendingUp className="w-5 h-5 text-green-500" />
            <AmountDisplay amount={data.income} />
          </CardTitle>
          <p className="text-gray-500 text-sm">of income recorded</p>
        </CardHeader>
      </Card>

      <Card>
        <CardHeader className="space-y-1">
          <CardTitle className="flex items-center gap-2 font-bold text-2xl">
            <TrendingDown className="w-5 h-5 text-red-500" />
            <AmountDisplay amount={data.expenses} />
          </CardTitle>
          <p className="text-gray-500 text-sm">of expenses paid</p>
        </CardHeader>
      </Card>

      <Card>
        <CardHeader className="space-y-1">
          <CardTitle className="flex items-center gap-2 font-bold text-2xl">
            <PiggyBank className="w-5 h-5" />
            <div className="font-bold text-2xl">
              {(() => {
                if (isPrivacyMode) {
                  return "••%";
                }
                if (data.income === 0 || data.expenses === 0) {
                  return "0%";
                }
                const value = ((data.income - data.expenses) / data.income) * 100;

                if (value < 0) {
                  return "0%";
                }
                return <span>{value.toFixed(2)}%</span>;
              })()}
            </div>
          </CardTitle>
          <p className="text-gray-500 text-sm">of your income saved</p>
        </CardHeader>
      </Card>
    </div>
  );
}
