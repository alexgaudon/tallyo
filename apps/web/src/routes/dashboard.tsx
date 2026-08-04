import { useQuery } from "@tanstack/react-query";
import {
  createFileRoute,
  useNavigate,
  useSearch,
} from "@tanstack/react-router";
import { format, parseISO, startOfMonth } from "date-fns";
import { Plus } from "lucide-react";
import { type ReactNode, useMemo } from "react";
import type { DateRange } from "react-day-picker";
import { z } from "zod";
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
      context.queryClient.prefetchQuery(
        orpc.dashboard.getSankeyData.queryOptions({
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

  const { data: sankeyData, isLoading: isSankeyLoading } = useQuery(
    orpc.dashboard.getSankeyData.queryOptions({
      placeholderData: (previousData) => previousData,
      input: dateRangeToApiFormat(dateRange),
    }),
  );

  const isLoading =
    isStatsLoading ||
    isCategoryLoading ||
    isMerchantLoading ||
    isTransactionLoading ||
    isSankeyLoading;

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
              <DashboardCharts categoryData={categoryData} />
            </SectionPanel>

            <SectionPanel title="Period insights">
              <PeriodInsights data={statsData} />
            </SectionPanel>

            <SectionPanel title="Income flow">
              <DashboardSankey sankeyData={sankeyData} />
            </SectionPanel>
          </div>

          <DashboardDetails
            merchantData={merchantData}
            transactionData={transactionData}
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

function DashboardCharts({
  categoryData,
}: {
  categoryData:
    | Awaited<ReturnType<typeof orpc.dashboard.getCategoryData.call>>
    | undefined;
}) {
  return (
    <>
      {categoryData && categoryData.length > 0 ? (
        <CategoryPieChart data={categoryData} />
      ) : (
        <div className="min-h-[250px] sm:min-h-[300px] flex items-center justify-center text-muted-foreground text-sm rounded-xl bg-muted/40">
          No category data
        </div>
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
        <div className="min-h-[250px] sm:min-h-[300px] flex items-center justify-center text-muted-foreground text-sm rounded-xl bg-muted/40">
          No income data
        </div>
      )}
    </>
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
    <div className="grid grid-cols-1 gap-8 lg:grid-cols-2">
      <div>
        <div className="mb-3">
          <SectionTitle>Top Merchants</SectionTitle>
        </div>
        {merchantData && merchantData.length > 0 ? (
          <MerchantStats data={merchantData} />
        ) : (
          <div className="p-6 sm:p-8 text-center text-muted-foreground text-sm rounded-xl bg-muted/40">
            No merchant data
          </div>
        )}
      </div>

      <div>
        <div className="mb-3">
          <SectionTitle>Largest Transactions</SectionTitle>
        </div>
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
