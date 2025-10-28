import { useQuery } from "@tanstack/react-query";
import {
  createFileRoute,
  useNavigate,
  useSearch,
} from "@tanstack/react-router";
import {
  endOfMonth,
  format,
  parseISO,
  startOfMonth,
  subMonths,
} from "date-fns";
import { CreditCardIcon } from "lucide-react";
import { useMemo } from "react";
import type { DateRange } from "react-day-picker";
import { z } from "zod";
import { CashFlowChart } from "@/components/dashboard/cash-flow-chart";
import { CategoryPieChart } from "@/components/dashboard/category-pie-chart";
import { MerchantStats } from "@/components/dashboard/merchant-stats";
import { Stats } from "@/components/dashboard/stats";
import { UnreviewedTransactionsBanner } from "@/components/dashboard/unreviewed-transactions-banner";
import DateRangePicker from "@/components/date-picker/date-range-picker";
import { DelayedLoading } from "@/components/delayed-loading";
import { ensureSession, useSession } from "@/lib/auth-client";
import { dateRangeToApiFormat, isDateRangeOneMonth } from "@/lib/utils";
import { orpc } from "@/utils/orpc";

const searchSchema = z.object({
  from: z.string().optional(),
  to: z.string().optional(),
});

type SearchParams = z.infer<typeof searchSchema>;

export const Route = createFileRoute("/dashboard")({
  validateSearch: searchSchema,
  component: RouteComponent,
  beforeLoad: async ({ context, search }) => {
    ensureSession(context.isAuthenticated, "/dashboard");

    const defaultDateRange = {
      from: startOfMonth(new Date()),
      to: new Date(),
    };
    const dateRange =
      search.from && search.to
        ? {
            from: parseISO(search.from),
            to: parseISO(search.to),
          }
        : defaultDateRange;

    await Promise.all([
      context.queryClient.prefetchQuery(
        orpc.dashboard.getStatsCounts.queryOptions({
          input: dateRangeToApiFormat(dateRange),
        }),
      ),
      context.queryClient.prefetchQuery(
        orpc.dashboard.getCategoryData.queryOptions({
          input: dateRangeToApiFormat(dateRange),
        }),
      ),
      context.queryClient.prefetchQuery(
        orpc.dashboard.getMerchantStats.queryOptions({
          input: dateRangeToApiFormat(dateRange),
        }),
      ),
      context.queryClient.prefetchQuery(
        orpc.dashboard.getCashFlowData.queryOptions({
          input: dateRangeToApiFormat(dateRange),
        }),
      ),
    ]);
  },
});

function RouteComponent() {
  const { data: session } = useSession();
  const navigate = useNavigate();
  const search = useSearch({ from: "/dashboard" });

  const now = new Date();
  const hour = now.getHours();
  let greeting = "Good evening 🌙";
  if (hour < 12) {
    greeting = "Good morning 👋";
  } else if (hour < 17) {
    greeting = "Good afternoon 🌞";
  }

  const dateRange = useMemo((): DateRange | undefined => {
    if (search.from && search.to) {
      return {
        from: parseISO(search.from),
        to: parseISO(search.to),
      };
    }
    return {
      from: startOfMonth(new Date()),
      to: new Date(),
    };
  }, [search.from, search.to]);

  const handleDateRangeChange = (newDateRange: DateRange | undefined) => {
    navigate({
      to: "/dashboard",
      search: {
        from: newDateRange?.from
          ? format(newDateRange.from, "yyyy-MM-dd")
          : undefined,
        to: newDateRange?.to
          ? format(newDateRange.to, "yyyy-MM-dd")
          : undefined,
      } as SearchParams,
    });
  };

  const { data: statsData, isLoading: isStatsLoading } = useQuery(
    orpc.dashboard.getStatsCounts.queryOptions({
      placeholderData: (previousData) => previousData,
      input: dateRangeToApiFormat(dateRange),
    }),
  );

  const { data: categoryData, isLoading: isCategoryLoading } = useQuery(
    orpc.dashboard.getCategoryData.queryOptions({
      placeholderData: (previousData) => previousData,
      input: dateRangeToApiFormat(dateRange),
    }),
  );

  const { data: merchantData, isLoading: isMerchantLoading } = useQuery(
    orpc.dashboard.getMerchantStats.queryOptions({
      placeholderData: (previousData) => previousData,
      input: dateRangeToApiFormat(dateRange),
    }),
  );

  const cashFlowDataInput = useMemo(() => {
    console.log("isOneMonth", isDateRangeOneMonth(dateRange));
    console.log("dateRange", dateRange);
    return isDateRangeOneMonth(dateRange)
      ? dateRangeToApiFormat({
          from: subMonths(startOfMonth(new Date()), 3),
          to: endOfMonth(new Date()),
        })
      : dateRangeToApiFormat(dateRange);
  }, [dateRange]);

  const { data: cashFlowData, isLoading: isCashFlowLoading } = useQuery(
    orpc.dashboard.getCashFlowData.queryOptions({
      input: cashFlowDataInput,
    }),
  );

  return (
    <div className="min-h-screen bg-linear-to-br from-background to-muted/20">
      {/* Hero Section */}
      <div className="border-b bg-linear-to-r from-primary/5 to-accent/5">
        <div className="container mx-auto px-4 py-6">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="flex items-center justify-center w-16 h-16 rounded-lg bg-primary/10">
                <CreditCardIcon className="h-8 w-8 text-primary" />
              </div>
              <div>
                <h1 className="text-2xl sm:text-4xl font-bold tracking-tight">
                  {greeting}
                </h1>
                <p className="text-sm text-muted-foreground">
                  Here's your financial overview
                </p>
              </div>
            </div>
            <div className="flex justify-center sm:justify-end w-full sm:w-auto">
              <div className="w-full max-w-xs sm:max-w-none">
                <DateRangePicker
                  value={dateRange}
                  onRangeChange={handleDateRangeChange}
                />
              </div>
            </div>
          </div>
        </div>
      </div>

      <DelayedLoading
        isLoading={
          isStatsLoading ||
          isCategoryLoading ||
          isMerchantLoading ||
          isCashFlowLoading
        }
      >
        {/* Main Content */}
        <div className="container mx-auto px-4 py-8 space-y-8">
          {/* Unreviewed Transactions Banner */}
          <UnreviewedTransactionsBanner
            count={session?.meta?.unreviewedTransactionCount ?? 0}
          />
          {/* Stats and Merchants Section */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            <div>
              <div className="flex items-center gap-3 mb-4">
                <div className="w-2 h-8 bg-blue-500 rounded-full"></div>
                <h2 className="text-lg font-semibold">Overview Stats</h2>
              </div>
              <Stats
                data={statsData}
                categoryData={categoryData}
                cashFlowData={cashFlowData}
              />
            </div>
            <div>
              <div className="flex items-center gap-3 mb-4">
                <div className="w-2 h-8 bg-green-500 rounded-full"></div>
                <h2 className="text-lg font-semibold">Top Merchants</h2>
              </div>
              <MerchantStats data={merchantData} />
            </div>
          </div>

          {/* Category Breakdown Section */}
          <div>
            <div className="flex items-center gap-3 mb-4">
              <div className="w-2 h-8 bg-purple-500 rounded-full"></div>
              <h2 className="text-lg font-semibold">Category Breakdown</h2>
            </div>
            <CategoryPieChart data={categoryData ?? []} />
          </div>

          {cashFlowData && (
            <>
              {/* Cash Flow Section */}
              <div>
                <div className="flex items-center gap-3 mb-4">
                  <div className="w-2 h-8 bg-orange-500 rounded-full"></div>
                  <h2 className="text-lg font-semibold">Cash Flow</h2>
                </div>
                <CashFlowChart data={cashFlowData ?? []} />
              </div>
            </>
          )}
        </div>
      </DelayedLoading>
    </div>
  );
}
