import { useQuery } from "@tanstack/react-query";
import {
  createFileRoute,
  useNavigate,
  useSearch,
} from "@tanstack/react-router";
import { format, parseISO, startOfMonth } from "date-fns";
import { CreditCardIcon, Plus, StoreIcon } from "lucide-react";
import { type ReactNode, useMemo, useState } from "react";
import type { DateRange } from "react-day-picker";
import { z } from "zod";
import { CashFlowTrend } from "@/components/dashboard/cash-flow-trend";
import { CategoryPieChart } from "@/components/dashboard/category-pie-chart";
import { IncomeExpenseSankey } from "@/components/dashboard/income-expense-sankey";
import { MerchantStats } from "@/components/dashboard/merchant-stats";
import { PeriodInsights } from "@/components/dashboard/period-insights";
import { Stats } from "@/components/dashboard/stats";
import { TransactionStats } from "@/components/dashboard/transaction-stats";
import { UnreviewedTransactionsBanner } from "@/components/dashboard/unreviewed-transactions-banner";
import DateRangePicker from "@/components/date-picker/date-range-picker";
import { DelayedLoading } from "@/components/delayed-loading";
import { PageHeader } from "@/components/layout/page-header";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { ensureSession, useSession } from "@/lib/auth-client";
import { cn, dateRangeToApiFormat } from "@/lib/utils";
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
        orpc.dashboard.getCashFlowTrend.queryOptions({
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
        orpc.dashboard.getSankeyData.queryOptions({
          input: dateRangeToApiFormat(dateRange),
        }),
      ),
      context.queryClient.prefetchQuery(
        orpc.dashboard.getPeriodComparison.queryOptions({
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

  const { data: trendData, isLoading: isTrendLoading } = useQuery(
    orpc.dashboard.getCashFlowTrend.queryOptions({
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

  const { data: incomeCategoryData, isLoading: isIncomeCategoryLoading } =
    useQuery(
      orpc.dashboard.getCategoryData.queryOptions({
        placeholderData: (previousData) => previousData,
        input: { ...dateRangeToApiFormat(dateRange), income: true },
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

  const { data: sankeyData, isLoading: isSankeyLoading } = useQuery(
    orpc.dashboard.getSankeyData.queryOptions({
      placeholderData: (previousData) => previousData,
      input: dateRangeToApiFormat(dateRange),
    }),
  );

  const { data: periodData, isLoading: isPeriodLoading } = useQuery(
    orpc.dashboard.getPeriodComparison.queryOptions({
      placeholderData: (previousData) => previousData,
      input: dateRangeToApiFormat(dateRange),
    }),
  );

  const isLoading =
    isStatsLoading ||
    isTrendLoading ||
    isCategoryLoading ||
    isIncomeCategoryLoading ||
    isMerchantLoading ||
    isTransactionLoading ||
    isSankeyLoading ||
    isPeriodLoading;

  return (
    <div className="min-h-full overflow-x-hidden">
      <DelayedLoading isLoading={isLoading}>
        <DashboardHeader
          greeting={greeting}
          userName={session?.user?.name}
          dateRange={dateRange}
          onDateRangeChange={handleDateRangeChange}
        />

        <div className="max-w-screen-2xl mx-auto space-y-8 px-4 py-8 lg:px-8">
          <UnreviewedTransactionsBanner
            count={session?.meta?.unreviewedTransactionCount ?? 0}
            onReviewClick={() =>
              navigate({
                to: "/transactions",
                search: { onlyUnreviewed: true },
              })
            }
          />

          <div className="grid grid-cols-1 gap-8 xl:grid-cols-[minmax(0,0.85fr)_minmax(0,1.65fr)] xl:items-start">
            <SectionPanel title="Cash flow overview">
              <Stats data={statsData} />
            </SectionPanel>

            <SectionPanel title="Spending breakdown">
              <DashboardCharts
                categoryData={categoryData}
                incomeCategoryData={incomeCategoryData}
                previousCategories={periodData?.categories ?? []}
              />
            </SectionPanel>

            <SectionPanel title="Period insights">
              <PeriodInsights
                data={statsData}
                previous={periodData?.totals ?? null}
              />
            </SectionPanel>

            <SectionPanel title="Income flow">
              <DashboardSankey sankeyData={sankeyData} />
            </SectionPanel>
          </div>

          <SectionPanel title="Cash flow trend">
            <DashboardTrend trendData={trendData} />
          </SectionPanel>

          <DashboardDetails
            merchantData={merchantData}
            transactionData={transactionData}
            previousMerchants={periodData?.merchants ?? []}
          />
        </div>
      </DelayedLoading>
    </div>
  );
}

function SectionTitle({ children }: { children: ReactNode }) {
  return (
    <h2 className="text-xs font-semibold tracking-[0.14em] uppercase text-muted-foreground">
      {children}
    </h2>
  );
}

function SectionPanel({
  title,
  className,
  children,
}: {
  title: string;
  className?: string;
  children: ReactNode;
}) {
  return (
    <div className={`flex h-full min-h-0 flex-col ${className ?? ""}`}>
      <div className="mb-3">
        <SectionTitle>{title}</SectionTitle>
      </div>
      <div className="flex-1">{children}</div>
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
    <PageHeader
      eyebrow={format(new Date(), "EEEE, MMM d, yyyy")}
      title={`Welcome back, ${userName?.split(" ")[0] ?? "there"}`}
      description={`${greeting}. Here's the financial picture for this period.`}
      actions={
        <div className="flex w-full flex-col items-stretch gap-2 sm:w-auto sm:flex-row sm:items-center">
          <div className="w-full sm:w-auto">
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
            className="w-full shrink-0 sm:w-auto"
          >
            <Plus className="w-4 h-4 sm:mr-1.5" />
            <span>Add transaction</span>
          </Button>
        </div>
      }
    />
  );
}

type PeriodComparison = Awaited<
  ReturnType<typeof orpc.dashboard.getPeriodComparison.call>
>;

function DashboardCharts({
  categoryData,
  incomeCategoryData,
  previousCategories,
}: {
  categoryData:
    | Awaited<ReturnType<typeof orpc.dashboard.getCategoryData.call>>
    | undefined;
  incomeCategoryData:
    | Awaited<ReturnType<typeof orpc.dashboard.getCategoryData.call>>
    | undefined;
  previousCategories: PeriodComparison["categories"];
}) {
  const [showIncome, setShowIncome] = useState(false);
  const data = showIncome ? incomeCategoryData : categoryData;

  return (
    <div className="flex h-full flex-col gap-3">
      <div className="flex w-fit items-center gap-1 rounded-lg bg-muted/60 p-0.5">
        <button
          type="button"
          onClick={() => setShowIncome(false)}
          className={cn(
            "px-2.5 py-1 rounded-md text-xs font-medium transition-colors cursor-pointer",
            !showIncome
              ? "bg-background text-foreground shadow-sm"
              : "text-muted-foreground hover:text-foreground",
          )}
        >
          Expenses
        </button>
        <button
          type="button"
          onClick={() => setShowIncome(true)}
          className={cn(
            "px-2.5 py-1 rounded-md text-xs font-medium transition-colors cursor-pointer",
            showIncome
              ? "bg-background text-foreground shadow-sm"
              : "text-muted-foreground hover:text-foreground",
          )}
        >
          Income
        </button>
      </div>

      {data && data.length > 0 ? (
        <CategoryPieChart data={data} previous={previousCategories} />
      ) : (
        <EmptyState
          compact
          bordered={false}
          title={showIncome ? "No income data" : "No category data"}
          description={
            showIncome
              ? "Add income transactions to see an income breakdown."
              : "Add transactions to see a spending breakdown."
          }
        />
      )}
    </div>
  );
}

function DashboardTrend({
  trendData,
}: {
  trendData:
    | Awaited<ReturnType<typeof orpc.dashboard.getCashFlowTrend.call>>
    | undefined;
}) {
  return (
    <>
      {trendData && trendData.buckets.length > 0 ? (
        <CashFlowTrend data={trendData} />
      ) : (
        <EmptyState
          compact
          bordered={false}
          title="No cash flow data"
          description="Add transactions to see income and expenses over time."
        />
      )}
    </>
  );
}

function DashboardSankey({
  sankeyData,
}: {
  sankeyData:
    | Awaited<ReturnType<typeof orpc.dashboard.getSankeyData.call>>
    | undefined;
}) {
  return (
    <>
      {sankeyData && sankeyData.totalIncome > 0 ? (
        <IncomeExpenseSankey data={sankeyData} />
      ) : (
        <EmptyState
          compact
          bordered={false}
          title="No income data"
          description="Add income transactions to see your income flow."
        />
      )}
    </>
  );
}

function DashboardDetails({
  merchantData,
  transactionData,
  previousMerchants,
}: {
  merchantData:
    | Awaited<ReturnType<typeof orpc.dashboard.getMerchantStats.call>>
    | undefined;
  transactionData:
    | Awaited<ReturnType<typeof orpc.dashboard.getTransactionStats.call>>
    | undefined;
  previousMerchants: PeriodComparison["merchants"];
}) {
  return (
    <div className="grid grid-cols-1 gap-8 lg:grid-cols-2">
      <div>
        <div className="mb-3">
          <SectionTitle>Top Merchants</SectionTitle>
        </div>
        {merchantData && merchantData.length > 0 ? (
          <MerchantStats data={merchantData} previous={previousMerchants} />
        ) : (
          <EmptyState
            compact
            bordered={false}
            icon={<StoreIcon className="h-10 w-10 text-muted-foreground" />}
            title="No merchant data"
          />
        )}
      </div>

      <div>
        <div className="mb-3">
          <SectionTitle>Largest Transactions</SectionTitle>
        </div>
        {transactionData && transactionData.length > 0 ? (
          <TransactionStats data={transactionData} />
        ) : (
          <EmptyState
            compact
            bordered={false}
            icon={
              <CreditCardIcon className="h-10 w-10 text-muted-foreground" />
            }
            title="No transaction data"
          />
        )}
      </div>
    </div>
  );
}
