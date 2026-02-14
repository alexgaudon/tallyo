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
import { Plus } from "lucide-react";
import { useMemo } from "react";
import type { DateRange } from "react-day-picker";
import { z } from "zod";
import { CashFlowChart } from "@/components/dashboard/cash-flow-chart";
import { CategoryPieChart } from "@/components/dashboard/category-pie-chart";
import { MerchantStats } from "@/components/dashboard/merchant-stats";
import { Stats } from "@/components/dashboard/stats";
import { TransactionStats } from "@/components/dashboard/transaction-stats";
import { UnreviewedTransactionsBanner } from "@/components/dashboard/unreviewed-transactions-banner";
import DateRangePicker from "@/components/date-picker/date-range-picker";
import { DelayedLoading } from "@/components/delayed-loading";
import { Button } from "@/components/ui/button";
import { Section } from "@/components/ui/section";
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

    const cashFlowDataInput = isDateRangeOneMonth(dateRange)
      ? dateRangeToApiFormat({
          from: subMonths(startOfMonth(new Date()), 3),
          to: endOfMonth(new Date()),
        })
      : dateRangeToApiFormat(dateRange);

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
      context.queryClient.prefetchQuery(
        orpc.dashboard.getCashFlowData.queryOptions({
          input: cashFlowDataInput,
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

  const cashFlowDataInput = useMemo(() => {
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

  const isLoading =
    isStatsLoading ||
    isCategoryLoading ||
    isMerchantLoading ||
    isTransactionLoading ||
    isCashFlowLoading;

  return (
    <div className="min-h-[calc(100vh-4rem)] overflow-x-hidden">
      <DelayedLoading isLoading={isLoading}>
        <DashboardHeader
          greeting={greeting}
          userName={session?.user?.name}
          dateRange={dateRange}
          onDateRangeChange={handleDateRangeChange}
        />

        <div className="max-w-screen-2xl mx-auto px-3 py-6 lg:px-8 space-y-6 lg:space-y-8">
          <UnreviewedTransactionsBanner
            count={session?.meta?.unreviewedTransactionCount ?? 0}
            onReviewClick={() =>
              navigate({
                to: "/transactions",
                search: { onlyUnreviewed: true },
              })
            }
          />

          <Section>
            <div className="mb-3 sm:mb-4">
              <h2 className="text-base sm:text-lg font-semibold">Overview</h2>
            </div>
            <Stats data={statsData} />
          </Section>

          <DashboardCharts
            cashFlowData={cashFlowData}
            categoryData={categoryData}
            dateRange={dateRange}
          />

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
    <header className="border-b border-border/60 bg-background/80 backdrop-blur-sm">
      <div className="max-w-screen-2xl mx-auto px-4 py-4 lg:px-8 lg:py-6">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold font-sans">
              {greeting}, {userName?.split(" ")[0] ?? "there"}
            </h1>
            <p className="text-sm text-muted-foreground">
              {format(new Date(), "EEEE, MMMM d, yyyy")}
            </p>
          </div>
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 w-full sm:w-auto">
            <div className="w-full">
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
              className="w-full sm:w-auto"
            >
              <Plus className="w-4 h-4 mr-2" />
              Add Transaction
            </Button>
          </div>
        </div>
      </div>
    </header>
  );
}

function DashboardCharts({
  cashFlowData,
  categoryData,
  dateRange,
}: {
  cashFlowData:
    | Awaited<ReturnType<typeof orpc.dashboard.getCashFlowData.call>>
    | undefined;
  categoryData:
    | Awaited<ReturnType<typeof orpc.dashboard.getCategoryData.call>>
    | undefined;
  dateRange: DateRange | undefined;
}) {
  const hasMultipleMonths = useMemo(() => {
    if (!dateRange?.from || !dateRange?.to) return false;
    const from = new Date(dateRange.from);
    const to = new Date(dateRange.to);
    return (
      to.getMonth() !== from.getMonth() ||
      to.getFullYear() !== from.getFullYear()
    );
  }, [dateRange]);

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 lg:gap-8">
      {hasMultipleMonths && (
        <div className="lg:col-span-2">
          <Section>
            <div className="mb-3 sm:mb-4">
              <h2 className="text-base sm:text-lg font-semibold">Cash Flow</h2>
            </div>
            {cashFlowData && cashFlowData.length > 0 ? (
              <CashFlowChart data={cashFlowData} />
            ) : (
              <div className="h-[250px] sm:h-[300px] flex items-center justify-center text-muted-foreground text-sm rounded-xl bg-muted/40">
                No cash flow data
              </div>
            )}
          </Section>
        </div>
      )}

      <div className={hasMultipleMonths ? undefined : "lg:col-span-3"}>
        <Section>
          <div className="mb-3 sm:mb-4">
            <h2 className="text-base sm:text-lg font-semibold">
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
        </Section>
      </div>
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
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 lg:gap-8">
      <Section>
        <div className="mb-3 sm:mb-4">
          <h2 className="text-base sm:text-lg font-semibold">Top Merchants</h2>
        </div>
        {merchantData && merchantData.length > 0 ? (
          <MerchantStats data={merchantData} />
        ) : (
          <div className="p-6 sm:p-8 text-center text-muted-foreground text-sm rounded-xl bg-muted/40">
            No merchant data
          </div>
        )}
      </Section>

      <Section>
        <div className="mb-3 sm:mb-4">
          <h2 className="text-base sm:text-lg font-semibold">
            Largest Transactions
          </h2>
        </div>
        {transactionData && transactionData.length > 0 ? (
          <TransactionStats data={transactionData} />
        ) : (
          <div className="p-6 sm:p-8 text-center text-muted-foreground text-sm rounded-xl bg-muted/40">
            No transaction data
          </div>
        )}
      </Section>
    </div>
  );
}
