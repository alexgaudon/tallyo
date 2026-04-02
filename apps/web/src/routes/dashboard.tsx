import { useQuery } from "@tanstack/react-query";
import {
  createFileRoute,
  useNavigate,
  useSearch,
} from "@tanstack/react-router";
import { format, parseISO, startOfMonth } from "date-fns";
import { Plus } from "lucide-react";
import { useMemo } from "react";
import type { DateRange } from "react-day-picker";
import { z } from "zod";
import { CategoryPieChart } from "@/components/dashboard/category-pie-chart";
import { MerchantStats } from "@/components/dashboard/merchant-stats";
import { PeriodInsights } from "@/components/dashboard/period-insights";
import { Stats } from "@/components/dashboard/stats";
import { TransactionStats } from "@/components/dashboard/transaction-stats";
import { UnreviewedTransactionsBanner } from "@/components/dashboard/unreviewed-transactions-banner";
import DateRangePicker from "@/components/date-picker/date-range-picker";
import { DelayedLoading } from "@/components/delayed-loading";
import { Button } from "@/components/ui/button";
import { ensureSession, useSession } from "@/lib/auth-client";
import { dateRangeToApiFormat } from "@/lib/utils";
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
        orpc.dashboard.getTransactionStats.queryOptions({
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
  let greeting = "Good evening";
  if (hour < 12) {
    greeting = "Good morning";
  } else if (hour < 17) {
    greeting = "Good afternoon";
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

  const { data: transactionData, isLoading: isTransactionLoading } = useQuery(
    orpc.dashboard.getTransactionStats.queryOptions({
      placeholderData: (previousData) => previousData,
      input: dateRangeToApiFormat(dateRange),
    }),
  );

  const isLoading =
    isStatsLoading ||
    isCategoryLoading ||
    isMerchantLoading ||
    isTransactionLoading;

  return (
    <div className="min-h-full overflow-x-hidden">
      <DelayedLoading isLoading={isLoading}>
        <DashboardHeader
          greeting={greeting}
          userName={session?.user?.name}
          dateRange={dateRange}
          onDateRangeChange={handleDateRangeChange}
        />

        <div className="max-w-screen-2xl mx-auto px-4 py-5 lg:px-8 space-y-5">
          <UnreviewedTransactionsBanner
            count={session?.meta?.unreviewedTransactionCount ?? 0}
            onReviewClick={() =>
              navigate({
                to: "/transactions",
                search: { onlyUnreviewed: true },
              })
            }
          />

          <div className="grid gap-5">
            <div>
              <h2 className="text-sm font-semibold text-foreground mb-3">
                Overview
              </h2>
              <Stats data={statsData} />
            </div>
            <PeriodInsights data={statsData} />
          </div>

          <DashboardCharts categoryData={categoryData} />

          <DashboardDetails
            merchantData={merchantData}
            transactionData={transactionData}
          />
        </div>
      </DelayedLoading>
    </div>
  );
}

function DashboardHeader({
  greeting,
  userName,
  dateRange,
  onDateRangeChange,
}: {
  greeting: string;
  userName: string | null | undefined;
  dateRange: DateRange | undefined;
  onDateRangeChange: (range: DateRange | undefined) => void;
}) {
  const navigate = useNavigate();

  return (
    <header className="border-b border-border/40 bg-gradient-to-br from-background via-background to-muted/20">
      <div className="max-w-screen-2xl mx-auto px-4 py-6 lg:px-8">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div className="space-y-1">
            <h1 className="text-3xl sm:text-4xl font-bold tracking-tight">
              <span className="bg-gradient-to-r from-foreground via-foreground to-muted-foreground bg-clip-text text-transparent">
                {greeting}
              </span>
              <span className="text-foreground">, </span>
              <span className="text-primary">
                {userName?.split(" ")[0] ?? "there"}
              </span>
            </h1>
            <p className="text-sm text-muted-foreground font-medium">
              {format(new Date(), "EEEE, MMMM d, yyyy")}
            </p>
          </div>
          <div className="flex items-stretch gap-2 w-full sm:w-auto">
            <div className="flex-1 sm:flex-none min-w-0">
              <DateRangePicker
                value={dateRange}
                onRangeChange={onDateRangeChange}
                className="w-full"
              />
            </div>
            <Button
              onClick={() =>
                navigate({ to: "/transactions", search: { create: true } })
              }
              className="shrink-0"
            >
              <Plus className="w-4 h-4 sm:mr-1.5" />
              <span className="hidden sm:inline">Add</span>
            </Button>
          </div>
        </div>
      </div>
    </header>
  );
}

function DashboardCharts({
  categoryData,
}: {
  categoryData:
    | Awaited<ReturnType<typeof orpc.dashboard.getCategoryData.call>>
    | undefined;
}) {
  return (
    <div>
      <div className="mb-3">
        <h2 className="text-sm font-semibold text-foreground">
          Top Categories
        </h2>
      </div>
      {categoryData && categoryData.length > 0 ? (
        <CategoryPieChart data={categoryData} />
      ) : (
        <div className="h-[250px] sm:h-[300px] flex items-center justify-center text-muted-foreground text-sm rounded-xl bg-muted/40">
          No category data
        </div>
      )}
    </div>
  );
}

function DashboardDetails({
  merchantData,
  transactionData,
}: {
  merchantData:
    | Awaited<ReturnType<typeof orpc.dashboard.getMerchantStats.call>>
    | undefined;
  transactionData:
    | Awaited<ReturnType<typeof orpc.dashboard.getTransactionStats.call>>
    | undefined;
}) {
  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
      <div>
        <h2 className="text-sm font-semibold text-foreground mb-3">
          Top Merchants
        </h2>
        {merchantData && merchantData.length > 0 ? (
          <MerchantStats data={merchantData} />
        ) : (
          <div className="p-6 sm:p-8 text-center text-muted-foreground text-sm rounded-xl bg-muted/40">
            No merchant data
          </div>
        )}
      </div>

      <div>
        <h2 className="text-sm font-semibold text-foreground mb-3">
          Largest Transactions
        </h2>
        {transactionData && transactionData.length > 0 ? (
          <TransactionStats data={transactionData} />
        ) : (
          <div className="p-6 sm:p-8 text-center text-muted-foreground text-sm rounded-xl bg-muted/40">
            No transaction data
          </div>
        )}
      </div>
    </div>
  );
}
