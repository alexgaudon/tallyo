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
import {
  displayFormatMonth,
  getRealMonth,
  transformAmounts,
} from "@/lib/utils";
import { ChartsRespository } from "@/repositories/charts";
import { useQuery } from "@tanstack/react-query";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Line,
  LineChart,
  XAxis,
  YAxis,
} from "recharts";
import { usePrivacyMode } from "../toggle-privacy-mode";
import { ChartSkeleton } from "./skeletons";

const chartConfig = {
  income: {
    label: "Income",
    color: "hsl(var(--chart-1))",
  },
  expense: {
    label: "Expense",
    color: "hsl(var(--chart-2))",
  },
} satisfies ChartConfig;

export function IncomeVsExpenseLine(props: { to?: Date; from?: Date }) {
  const { data, isLoading } = useQuery(
    ChartsRespository.getIncomeVsExpensesDataQuery({
      from: props.from,
      to: props.to,
    })
  );

  if (isLoading) {
    return <ChartSkeleton />;
  }

  if (!data) {
    return <h1>No Data Available.</h1>;
  }

  const tableData = data
    .map((x) => ({
      month: getRealMonth(new Date(x.period + "-01")),
      income: x.income,
      expenses: x.expenses,
    }))
    .map(transformAmounts);

  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle>Income vs Expenses (Line)</CardTitle>
        <CardDescription suppressHydrationWarning>
          Past 12 Months
        </CardDescription>
      </CardHeader>
      <CardContent>
        <ChartContainer config={chartConfig}>
          <LineChart
            data={tableData}
            margin={{ top: 5, right: 30, left: 20, bottom: 5 }}
          >
            <ChartLegend />
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis
              dataKey="month"
              tickLine={false}
              tickMargin={10}
              axisLine={false}
              tickFormatter={(value) => value.slice(0, 3)}
            />
            <YAxis />
            <ChartTooltip content={<ChartTooltipContent indicator="line" />} />
            <Line
              type="monotone"
              dataKey="income"
              stroke="hsl(var(--chart-2))"
              strokeWidth={2}
              dot={false}
            />
            <Line
              type="monotone"
              dataKey="expenses"
              stroke="hsl(var(--chart-5))"
              strokeWidth={2}
              dot={false}
            />
          </LineChart>
        </ChartContainer>
      </CardContent>
    </Card>
  );
}

export function IncomeVsExpenseBar(props: { to?: Date; from?: Date }) {
  const { data, isLoading } = useQuery(
    ChartsRespository.getIncomeVsExpensesDataQuery({
      from: props.from,
      to: props.to,
    })
  );

  const { isPrivacyMode } = usePrivacyMode();

  if (isLoading) {
    return <ChartSkeleton />;
  }

  if (!data) {
    return <h1>No Data Available.</h1>;
  }

  const tableData = data
    .map((x) => ({
      month: getRealMonth(new Date(x.period + "-01")),
      income: x.income,
      expenses: x.expenses,
    }))
    .map(transformAmounts);

  return (
    <Card>
      <CardHeader>
        <CardTitle>Income v Expenses (Bar)</CardTitle>
        <CardDescription suppressHydrationWarning>
          {props.from &&
            props.to &&
            `${displayFormatMonth(props.from)} - ${displayFormatMonth(props.to)}`}
          {!props.from && !props.to && "Past 12 Months"}
        </CardDescription>
      </CardHeader>
      <CardContent>
        <ChartContainer config={chartConfig}>
          <BarChart accessibilityLayer data={tableData}>
            <ChartLegend />
            <CartesianGrid vertical={false} />
            <XAxis
              dataKey="month"
              tickLine={false}
              tickMargin={10}
              axisLine={false}
              tickFormatter={(value) => value.slice(0, 3)}
            />
            <ChartTooltip
              cursor={false}
              content={<ChartTooltipContent indicator="dashed" />}
            />
            <Bar dataKey="income" fill="hsl(var(--chart-2))" radius={4} />
            <Bar dataKey="expenses" fill="hsl(var(--chart-5))" radius={4} />
          </BarChart>
        </ChartContainer>
      </CardContent>
    </Card>
  );
}
