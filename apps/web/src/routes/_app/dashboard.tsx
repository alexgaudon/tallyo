import { useQuery } from "@tanstack/react-query";
import {
  createFileRoute,
  useNavigate,
  useSearch,
} from "@tanstack/react-router";
import { format, parseISO, startOfMonth } from "date-fns";
import { Plus } from "lucide-react";
import { useMemo, useState } from "react";
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
import { TransactionsLens } from "@/components/layout/lens";
import { PageHeader } from "@/components/layout/page-header";
import { Button } from "@/components/ui/button";
import { ChartFrame } from "@/components/ui/chart-frame";
import { Panel } from "@/components/ui/panel";
import { useSession } from "@/lib/auth-client";
import { canvasOverviewQueryOptions } from "@/lib/canvas";
import { type ViewSearch, viewSearchSchema } from "@/lib/transaction-view";
import { cn, dateRangeToApiFormat } from "@/lib/utils";

const lensFilterSchema = {
  categories: z.array(z.string()).optional(),
  merchants: z.array(z.string()).optional(),
  q: z.string().optional(),
  review: z.enum(["all", "reviewed", "unreviewed"]).optional(),
  noMerchant: z.boolean().optional(),
  side: z.enum(["all", "income", "expense"]).optional(),
  min: z.coerce.number().optional(),
  max: z.coerce.number().optional(),
  sort: z.enum(["date", "amount"]).optional(),
  page: z.coerce.number().int().min(1).optional(),
  pageSize: z.coerce.number().int().min(1).max(100).optional(),
};

const searchSchema = z.object({
  from: z.string().optional(),
  to: z.string().optional(),
  // A drill-down lens lives in the URL so it can be shared, and so the browser
  // Back button dismisses it.
  lens: z.enum(["transactions"]).optional(),
  lensTitle: z.string().optional(),
  ...lensFilterSchema,
});

type SearchParams = z.infer<typeof searchSchema>;

/**
 * The canvas range is URL-owned: an explicit `from` + `to` pair when present,
 * otherwise the current month-to-date — the classic dashboard default.
 */
function toDateRange(search: SearchParams): DateRange {
  if (search.from && search.to) {
    return { from: parseISO(search.from), to: parseISO(search.to) };
  }
  return { from: startOfMonth(new Date()), to: new Date() };
}

export const Route = createFileRoute("/_app/dashboard")({
  validateSearch: searchSchema,
  // Only the range feeds the canvas query; lens params must not refetch it.
  loaderDeps: ({ search }) => ({ from: search.from, to: search.to }),
  loader: ({ context: { queryClient }, deps }) =>
    queryClient.ensureQueryData(
      canvasOverviewQueryOptions(dateRangeToApiFormat(toDateRange(deps))),
    ),
  component: RouteComponent,
});

function RouteComponent() {
  const { data: session } = useSession();
  const navigate = useNavigate();
  const search = useSearch({ from: "/_app/dashboard" });
  const [showIncome, setShowIncome] = useState(false);

  const dateRange = useMemo(
    () => toDateRange(search),
    [search.from, search.to],
  );
  const range = useMemo(() => dateRangeToApiFormat(dateRange), [dateRange]);

  // The loader primes this exact key, so the first render is already warm.
  const { data, isLoading } = useQuery(canvasOverviewQueryOptions(range));

  const stats = data?.stats;
  const categoryData = showIncome
    ? data?.incomeCategoryData
    : data?.categoryData;
  const previousCategories = data?.periodComparison?.categories ?? [];
  const previousMerchants = data?.periodComparison?.merchants ?? [];
  const previousTotals = data?.periodComparison?.totals ?? null;

  /**
   * Drill-downs open a lens over the canvas. The lens is URL state — opening,
   * filtering, and paging all write search params — so it is deep-linkable and
   * Back dismisses it. The view is scoped to the canvas range by default.
   */
  const openTransactionsLens = (
    title: string,
    view: Partial<ViewSearch>,
    opts?: { withRange?: boolean },
  ) => {
    const withRange = opts?.withRange ?? true;
    navigate({
      to: "/dashboard",
      search: {
        from: withRange ? range.from : undefined,
        to: withRange ? range.to : undefined,
        lens: "transactions" as const,
        lensTitle: title,
        ...view,
      },
    });
  };

  const closeLens = () => {
    navigate({
      to: "/dashboard",
      search: { from: search.from, to: search.to },
      replace: true,
    });
  };

  const handleLensViewChange = (next: ViewSearch) => {
    navigate({
      to: "/dashboard",
      search: (prev) => ({
        ...prev,
        categories: next.categories,
        merchants: next.merchants,
        q: next.q,
        review: next.review,
        noMerchant: next.noMerchant,
        side: next.side,
        min: next.min,
        max: next.max,
        sort: next.sort,
        page: next.page,
        pageSize: next.pageSize,
      }),
      replace: true,
    });
  };

  const lensView: ViewSearch = viewSearchSchema.parse({
    from: search.from,
    to: search.to,
    categories: search.categories,
    merchants: search.merchants,
    q: search.q,
    review: search.review,
    noMerchant: search.noMerchant,
    side: search.side,
    min: search.min,
    max: search.max,
    sort: search.sort,
    page: search.page,
    pageSize: search.pageSize,
  });

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

  return (
    <div className="min-h-full overflow-x-hidden">
      <PageHeader
        eyebrow={format(new Date(), "EEEE, MMM d, yyyy")}
        title={
          <>
            Welcome back,{" "}
            <span className="text-accent">
              {session?.settings?.displayName?.split(" ")[0] ??
                session?.user?.name?.split(" ")[0] ??
                "there"}
            </span>{" "}
            👋
          </>
        }
        description="Here's your financial picture for this period."
        stackOnMobile
        actions={
          <div className="flex w-full flex-col items-stretch gap-2 sm:w-auto sm:flex-row sm:items-center">
            <div className="w-full sm:w-auto">
              <DateRangePicker
                value={dateRange}
                onRangeChange={handleDateRangeChange}
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

      <div className="mx-auto max-w-screen-2xl space-y-6 px-4 py-8 lg:px-8">
        <UnreviewedTransactionsBanner
          count={session?.meta?.unreviewedTransactionCount ?? 0}
          onReviewClick={() =>
            openTransactionsLens(
              "Transactions to review",
              { review: "unreviewed" },
              { withRange: false },
            )
          }
        />

        <div className="grid grid-cols-1 gap-8 xl:grid-cols-[minmax(0,0.85fr)_minmax(0,1.65fr)] xl:items-start">
          <Panel title="Cash flow overview">
            <ChartFrame
              isLoading={isLoading}
              isEmpty={!stats?.stats.totalTransactions}
              emptyTitle="No activity yet"
              emptyDescription="Add transactions to see your income and spending."
            >
              <Stats data={stats} embedded />
            </ChartFrame>
          </Panel>

          <Panel
            title="Spending breakdown"
            actions={
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
            }
          >
            <ChartFrame
              isLoading={isLoading}
              isEmpty={!categoryData?.length}
              emptyTitle={showIncome ? "No income data" : "No category data"}
              emptyDescription={
                showIncome
                  ? "Add income transactions to see an income breakdown."
                  : "Add transactions to see a spending breakdown."
              }
            >
              {categoryData ? (
                <CategoryPieChart
                  data={categoryData}
                  previous={previousCategories}
                  from={range.from}
                  to={range.to}
                  embedded
                  onCategorySelect={(categoryId, label) =>
                    openTransactionsLens(label, { categories: [categoryId] })
                  }
                />
              ) : null}
            </ChartFrame>
          </Panel>

          <Panel title="Period insights">
            <ChartFrame
              isLoading={isLoading}
              isEmpty={!stats?.stats.totalTransactions}
              emptyTitle="No insights yet"
              emptyDescription="Add more history to see how this period compares."
            >
              <PeriodInsights data={stats} previous={previousTotals} embedded />
            </ChartFrame>
          </Panel>

          <Panel title="Income flow">
            <ChartFrame
              isLoading={isLoading}
              isEmpty={!data?.sankeyData.totalIncome}
              emptyTitle="No income data"
              emptyDescription="Add income transactions to see your income flow."
            >
              {data ? (
                <IncomeExpenseSankey
                  data={data.sankeyData}
                  from={range.from}
                  to={range.to}
                  embedded
                />
              ) : null}
            </ChartFrame>
          </Panel>
        </div>

        <div className="grid grid-cols-1 gap-8 lg:grid-cols-2">
          <Panel title="Top Merchants">
            <ChartFrame
              isLoading={isLoading}
              isEmpty={!data?.merchantStats.length}
              emptyTitle="No merchant data"
              emptyDescription="Merchant breakdown will appear once you have transactions with merchants."
            >
              <MerchantStats
                data={data?.merchantStats}
                previous={previousMerchants}
                from={range.from}
                to={range.to}
                onMerchantSelect={(merchantId, title) =>
                  openTransactionsLens(title, { merchants: [merchantId] })
                }
              />
            </ChartFrame>
          </Panel>

          <Panel title="Largest Transactions">
            <ChartFrame
              isLoading={isLoading}
              isEmpty={!data?.transactionStats.length}
              emptyTitle="No transaction data"
              emptyDescription="Largest transactions will appear once you have reviewed transactions."
            >
              <TransactionStats
                data={data?.transactionStats}
                from={range.from}
                to={range.to}
                onTransactionSelect={(transactionId, title) =>
                  openTransactionsLens(title, { q: transactionId })
                }
              />
            </ChartFrame>
          </Panel>
        </div>
      </div>

      {search.lens === "transactions" ? (
        <TransactionsLens
          title={search.lensTitle ?? "Transactions"}
          view={lensView}
          onViewChange={handleLensViewChange}
          onClose={closeLens}
        />
      ) : null}
    </div>
  );
}
