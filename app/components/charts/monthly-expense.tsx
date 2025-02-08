import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHeader,
  TableRow,
} from "../ui/table";

import { getRealMonth } from "@/lib/utils";
import { CategoryRepository } from "@/repositories/categories";
import { ChartsRespository } from "@/repositories/charts";
import { useQuery } from "@tanstack/react-query";
import { subMonths } from "date-fns";
import { MinusIcon, PlusIcon } from "lucide-react";
import { useState } from "react";
import { CategoryBadge } from "../categories/category-badge";
import AmountDisplay from "../transactions/amount-display";
import { Button } from "../ui/button";
import { ChartSkeleton } from "./skeletons";

export function MonthlyExpenseChart(props: { numberOfMonths?: number }) {
  const { data, isLoading } = useQuery(
    ChartsRespository.getMonthlyExpenseDataQuery()
  );
  const { data: categories, isLoading: isCategoriesLoading } = useQuery(
    CategoryRepository.getAllUserCategoriesQuery()
  );

  const [months, setMonths] = useState(props.numberOfMonths ?? 2);

  if (isLoading || isCategoriesLoading) {
    return <ChartSkeleton />;
  }

  if (!data || !categories || isCategoriesLoading) {
    return <h1>No data available.</h1>;
  }

  const validPeriods: string[] = [];

  for (let i = 0; i < months; i++) {
    const year = subMonths(new Date(), i).getFullYear();
    validPeriods.push(
      `${year}-${(subMonths(new Date(), i).getMonth() + 1).toString().padStart(2, "0")}`
    );
  }

  const getAmountOfCategory = (category: string) =>
    Object.fromEntries(
      validPeriods.map((month) => [
        month,
        data?.find((x) => x.category === category && x.period === month)
          ?.amount ?? 0,
      ])
    );

  const totalIncomeAmounts = Object.fromEntries(
    validPeriods.map((month) => [month, 0])
  );
  const totalExpenseAmounts = Object.fromEntries(
    validPeriods.map((month) => [month, 0])
  );

  const tableRows = (
    <>
      {categories
        .filter((x) => !x.hideFromInsights && !x.treatAsIncome)
        .map((category) => {
          const amounts = getAmountOfCategory(category.name);
          // Accumulate expense totals
          validPeriods.forEach((month) => {
            totalExpenseAmounts[month] += Number(amounts[month]);
          });
          return (
            <TableRow key={`expense-${category.name}`}>
              <TableCell className="p-1">
                <CategoryBadge color={category.color} name={category.name} />
              </TableCell>
              {validPeriods.map((month) => (
                <TableCell className="p-1" key={month}>
                  <AmountDisplay amount={amounts[month]} />
                </TableCell>
              ))}
            </TableRow>
          );
        })}
      {categories
        .filter((x) => x.treatAsIncome)
        .map((category) => {
          const amounts = getAmountOfCategory(category.name);

          // Accumulate income totals
          validPeriods.forEach((month) => {
            totalIncomeAmounts[month] += Number(amounts[month]);
          });

          return (
            <TableRow key={`income-${category.name}`}>
              <TableCell className="p-1">
                <CategoryBadge color={category.color} name={category.name} />
              </TableCell>
              {validPeriods.map((month) => (
                <TableCell className="p-1" key={month}>
                  <AmountDisplay amount={amounts[month]} />
                </TableCell>
              ))}
            </TableRow>
          );
        })}
    </>
  );

  return (
    <Card>
      <CardHeader>
        <CardTitle>
          <div className="flex items-center">
            <span>Monthly Expense Chart</span>
            <div className="md:flex gap-x-2 hidden ml-auto">
              <Button
                className="hover:cursor-pointer"
                disabled={months <= 1}
                onClick={() => {
                  setMonths(months - 1);
                }}
              >
                <MinusIcon />
              </Button>
              <Button
                className="hover:cursor-pointer"
                disabled={months >= 6}
                onClick={() => {
                  setMonths(months + 1);
                }}
              >
                <PlusIcon />
              </Button>{" "}
            </div>
          </div>
        </CardTitle>
        <CardDescription suppressHydrationWarning>
          {" "}
          {getRealMonth(subMonths(new Date(), months - 1))} -{" "}
          {getRealMonth(new Date())} {new Date().getFullYear()}
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Table>
          <TableHeader>
            <TableRow>
              <TableCell className="p-1">Category</TableCell>
              {[...Array(months).keys()].map((idx) => (
                <TableCell className="p-1" key={idx}>
                  {getRealMonth(subMonths(new Date(), idx))}
                </TableCell>
              ))}
            </TableRow>
          </TableHeader>
          <TableBody>
            {tableRows}
            <TableRow>
              <TableCell className="p-0">Income</TableCell>
              {validPeriods.map((month) => (
                <TableCell className="p-0" key={`income-${month}`}>
                  <AmountDisplay amount={totalIncomeAmounts[month]} />
                </TableCell>
              ))}
            </TableRow>
            <TableRow>
              <TableCell className="p-0">Expense</TableCell>
              {validPeriods.map((month) => (
                <TableCell className="p-0" key={`expense-${month}`}>
                  <AmountDisplay amount={totalExpenseAmounts[month]} />
                </TableCell>
              ))}
            </TableRow>
            <TableRow>
              <TableCell className="p-0">Totals</TableCell>
              {validPeriods.map((month) => (
                <TableCell className="p-0" key={`totals-${month}`}>
                  <AmountDisplay
                    colored
                    amount={
                      totalIncomeAmounts[month] -
                      Math.abs(totalExpenseAmounts[month])
                    }
                  />
                </TableCell>
              ))}
            </TableRow>
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
}
