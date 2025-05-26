import { CategoryBreakdownChart } from "@/components/charts/category-breakdown";
import { IncomeVsExpenseBar } from "@/components/charts/income-vs-expense";
import { MonthlyExpenseChart } from "@/components/charts/monthly-expense";
import { StatsForNerds } from "@/components/charts/stats-for-nerds";
import { TopVendors } from "@/components/charts/top-vendors";
import { usePrivacyMode } from "@/components/toggle-privacy-mode";
import { Button } from "@/components/ui/button";
import { DateRangePicker } from "@/components/ui/date-range-picker";
import { formatDateISO8601, getDateAdjustedForTimezone } from "@/lib/utils";
import { CategoryRepository } from "@/repositories/categories";
import { ChartsRespository } from "@/repositories/charts";
import { createFileRoute, redirect, useNavigate } from "@tanstack/react-router";
import { addDays, startOfMonth } from "date-fns";
import { EyeIcon, EyeOffIcon } from "lucide-react";
import { useState } from "react";
import { z } from "zod";

const searchParamSchema = z.object({
  from: z.coerce.string().optional(),
  to: z.coerce.string().optional(),
});

export const Route = createFileRoute("/dashboard")({
  component: RouteComponent,
  validateSearch: searchParamSchema,
  beforeLoad: async ({ context, search }) => {
    if (!context.auth || !context.auth.isAuthenticated) {
      throw redirect({ to: "/signin" });
    }

    const defaultFrom = search.from ?? formatDateISO8601(startOfMonth(new Date()));
    const defaultTo = search.to ?? formatDateISO8601(new Date());

    await Promise.all([
      context.queryClient.prefetchQuery(
        ChartsRespository.getStatsDataQuery({
          from: new Date(defaultFrom),
          to: new Date(defaultTo),
        }),
      ),
      context.queryClient.prefetchQuery(CategoryRepository.getAllUserCategoriesQuery()),
      context.queryClient.prefetchQuery(ChartsRespository.getMonthlyExpenseDataQuery()),
      context.queryClient.prefetchQuery(
        ChartsRespository.getTopVendorsDataQuery({
          from: new Date(defaultFrom),
          to: new Date(defaultTo),
        }),
      ),
      context.queryClient.prefetchQuery(
        ChartsRespository.getIncomeVsExpensesDataQuery({
          from: new Date(defaultFrom),
          to: new Date(defaultTo),
        }),
      ),
      context.queryClient.prefetchQuery(
        ChartsRespository.getCategoryBreakdownQuery({
          from: new Date(defaultFrom),
          to: new Date(defaultTo),
        }),
      ),
    ]);
  },
});

const isThisMonth = (range: { from: Date; to: Date }) => {
  return (
    formatDateISO8601(range.from) === formatDateISO8601(startOfMonth(new Date())) &&
    (formatDateISO8601(range.to) === formatDateISO8601(addDays(new Date(), 1)) ||
      formatDateISO8601(range.to) === formatDateISO8601(new Date()))
  );
};

function RouteComponent() {
  const search = Route.useSearch();

  const defaultFrom = search.from ?? formatDateISO8601(startOfMonth(new Date()));
  const defaultTo = search.to ?? formatDateISO8601(new Date());

  const [from, setFrom] = useState<Date>(() => getDateAdjustedForTimezone(defaultFrom));
  const [to, setTo] = useState<Date>(() => getDateAdjustedForTimezone(defaultTo));

  const navigate = useNavigate();

  const { isPrivacyMode, togglePrivacyMode } = usePrivacyMode();

  return (
    <div>
      <div className="flex justify-center items-center mx-auto mt-4">
        <div>
          <DateRangePicker
            showCompare={false}
            initialDateFrom={from}
            initialDateTo={to}
            onUpdate={(values) => {
              setFrom(values.range.from);
              setTo(values.range.to ?? new Date());

              if (
                isThisMonth({
                  from: values.range.from,
                  to: values.range.to ?? new Date(),
                })
              ) {
                navigate({
                  replace: true,
                  to: "/dashboard",
                  search: {},
                });
              } else {
                navigate({
                  replace: true,
                  to: "/dashboard",
                  search: {
                    from: formatDateISO8601(getDateAdjustedForTimezone(values.range.from)),
                    to: formatDateISO8601(getDateAdjustedForTimezone(values.range.to ?? new Date())),
                  },
                });
              }
            }}
          />
        </div>

        <div className="float-right ml-2">
          <Button
            className="hover:cursor-pointer"
            variant="ghost"
            onClick={() => {
              togglePrivacyMode();
            }}
          >
            {isPrivacyMode ? <EyeOffIcon /> : <EyeIcon />}
          </Button>
        </div>
      </div>

      <div className="mx-auto px-4 py-6 container">
        <div className="gap-6 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3">
          {/* Stats and Category Breakdown - Always visible */}
          <div className="space-y-6 lg:col-span-1">
            <StatsForNerds from={from} to={to} />
            <CategoryBreakdownChart from={from} to={to} />
          </div>

          {/* Monthly Expense Chart - Prioritized on mobile */}
          <div className="order-first lg:order-none lg:col-span-1">
            <MonthlyExpenseChart />
          </div>

          {/* Income vs Expense and Top Vendors */}
          <div className="space-y-6 lg:col-span-1">
            <div className="block">
              <IncomeVsExpenseBar from={from} to={to} />
            </div>
            <div className="block">
              <TopVendors from={from} to={to} />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
