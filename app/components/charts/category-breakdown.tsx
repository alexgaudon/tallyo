import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  ChartConfig,
  ChartContainer,
  ChartLegend,
  ChartTooltip,
  ChartTooltipContent,
} from "@/components/ui/chart";
import { formatCurrency, transformAmounts } from "@/lib/utils";
import { ChartsRespository } from "@/repositories/charts";
import { useQuery } from "@tanstack/react-query";
import { Label, Pie, PieChart } from "recharts";
import { usePrivacyMode } from "../toggle-privacy-mode";
import { ChartSkeleton } from "./skeletons";

const chartConfig: ChartConfig = {} satisfies ChartConfig;

export function CategoryBreakdownChart(props: { to?: Date; from?: Date }) {
  const { data, isLoading } = useQuery(
    ChartsRespository.getCategoryBreakdownQuery({
      to: props.to,
      from: props.from,
    }),
  );

  if (isLoading) {
    return <ChartSkeleton />;
  }

  if (!data) {
    return <h1>No Data Available.</h1>;
  }

  // Process data to ensure it's in the correct format and positive for display purposes
  const relevantData = data.map(transformAmounts).map((x) => ({
    name: x.name!,
    amount: parseFloat(x.amount), // Ensure amounts are positive
    fill: x.color!,
  }));

  // Configure chart settings based on the data
  relevantData.forEach((item) => {
    chartConfig[item.name] = {
      label: item.name,
      color: item.fill,
    };
  });

  const { isPrivacyMode } = usePrivacyMode();

  const totalAmount = relevantData.reduce((acc, curr) => acc + curr.amount, 0);

  return (
    <Card className="flex flex-col">
      <CardHeader className="items-center pb-0">
        <CardTitle>Transaction Category Breakdown</CardTitle>
        <CardDescription suppressHydrationWarning>
          All Tracked Transactions
        </CardDescription>
      </CardHeader>
      <CardContent className="flex-1 pb-0">
        <ChartContainer
          config={chartConfig}
          className="mx-auto max-h-[300px] aspect-square"
        >
          <PieChart>
            <ChartLegend />
            <ChartTooltip
              cursor={false}
              content={<ChartTooltipContent hideLabel />}
            />
            <Pie
              data={relevantData}
              dataKey="amount"
              nameKey="name"
              innerRadius={60}
              strokeWidth={5}
            >
              <Label
                content={({ viewBox }) => {
                  if (viewBox && "cx" in viewBox && "cy" in viewBox) {
                    return (
                      <text
                        x={viewBox.cx}
                        y={viewBox.cy}
                        textAnchor="middle"
                        dominantBaseline="middle"
                      >
                        <tspan
                          x={viewBox.cx}
                          y={viewBox.cy}
                          className="font-bold text-xl fill-foreground"
                        >
                          {!isPrivacyMode
                            ? formatCurrency(totalAmount)
                            : "$" +
                              "•".repeat(totalAmount.toString().length - 3) +
                              ".••"}
                        </tspan>
                        <tspan
                          x={viewBox.cx}
                          y={(viewBox.cy || 0) + 24}
                          className="fill-muted-foreground"
                        >
                          Spent
                        </tspan>
                      </text>
                    );
                  }
                }}
              />
            </Pie>
          </PieChart>
        </ChartContainer>
      </CardContent>
    </Card>
  );
}
