import { useQuery, useQueryClient } from "@tanstack/react-query";
import {
  createFileRoute,
  useNavigate,
  useRouter,
  useSearch,
} from "@tanstack/react-router";
import { type ReactNode, useState } from "react";
import { z } from "zod";
import { CreateCategoryDialog } from "@/components/categories/create-category-dialog";
import { EditCategoryDialog } from "@/components/categories/edit-category-dialog";
import { PageHeader } from "@/components/layout/page-header";
import { CreateMerchantDialog } from "@/components/merchants/create-merchant-dialog";
import { EditMerchantDialog } from "@/components/merchants/edit-merchant-dialog";
import { SplitTransactionDialog } from "@/components/transactions/split-transaction-dialog";
import { TransactionList } from "@/components/transactions/transaction-list";
import { ViewControls } from "@/components/transactions/view-controls";
import { CurrencyAmount } from "@/components/ui/currency-amount";
import { EntityPickerProvider } from "@/components/ui/entity-picker-sheet";
import { type PaginationInfo, Paginator } from "@/components/ui/paginator";
import { Panel } from "@/components/ui/panel";
import {
  type LedgerTransaction,
  useTransactionMutations,
} from "@/hooks/use-transaction-mutations";
import {
  hasActiveViewFilters,
  viewQueryOptions,
  viewSearchSchema,
  viewSummaryQueryOptions,
} from "@/lib/transaction-view";
import { cn } from "@/lib/utils";
import { orpc } from "@/utils/orpc";

type ViewSummary = Awaited<
  ReturnType<typeof orpc.transactions.getViewSummary.call>
>;

/**
 * Reports is the ledger view with an expense-first default. Extending the
 * frozen view schema overrides only the `side` default: an absent `side` param
 * resolves to "expense", while any explicit `side` in the URL is preserved.
 * Resolving the default at validation time — rather than redirecting in the
 * loader — keeps the loader free of URL writes and avoids an update loop.
 */
const reportsSearchSchema = viewSearchSchema.extend({
  side: z.enum(["all", "income", "expense"]).default("expense"),
});

export const Route = createFileRoute("/_app/reports")({
  validateSearch: reportsSearchSchema,
  loaderDeps: ({ search }) => search,
  loader: ({ context: { queryClient }, deps }) =>
    Promise.all([
      queryClient.ensureQueryData(viewQueryOptions(deps)),
      queryClient.ensureQueryData(viewSummaryQueryOptions(deps)),
    ]),
  component: RouteComponent,
});

function RouteComponent() {
  const navigate = useNavigate();
  const router = useRouter();
  const queryClient = useQueryClient();
  const search = useSearch({ from: "/_app/reports" });

  const { data } = useQuery(viewQueryOptions(search));
  const { data: summary } = useQuery(viewSummaryQueryOptions(search));
  const mutations = useTransactionMutations(search);

  const [editMerchant, setEditMerchant] = useState<{
    open: boolean;
    merchantId: string;
  }>({ open: false, merchantId: "" });
  const [editCategory, setEditCategory] = useState<{
    open: boolean;
    categoryId: string;
  }>({ open: false, categoryId: "" });
  const [createCategoryOpen, setCreateCategoryOpen] = useState(false);
  const [createMerchantOpen, setCreateMerchantOpen] = useState(false);
  const [splitDialog, setSplitDialog] = useState<{
    open: boolean;
    transaction: LedgerTransaction | null;
  }>({ open: false, transaction: null });

  const transactions = data?.transactions ?? [];
  const pagination: PaginationInfo = data?.pagination ?? {
    total: 0,
    page: search.page,
    pageSize: search.pageSize,
    totalPages: 1,
  };

  const reviewing = search.review === "unreviewed";
  const viewKey = viewQueryOptions(search).queryKey;
  const summaryKey = viewSummaryQueryOptions(search).queryKey;

  const refreshView = () => {
    queryClient.invalidateQueries({ queryKey: viewKey });
    queryClient.invalidateQueries({ queryKey: summaryKey });
    queryClient.invalidateQueries({
      queryKey: orpc.categories.getUserCategories.queryOptions().queryKey,
    });
    router.invalidate();
  };

  const goToPage = (page: number) => {
    navigate({
      to: "/reports",
      search: (prev) => ({ ...prev, page }),
    });
  };

  const changePageSize = (pageSize: number) => {
    navigate({
      to: "/reports",
      search: (prev) => ({ ...prev, pageSize, page: 1 }),
    });
  };

  const handleCategoryClick = (categoryId: string) => {
    navigate({
      to: "/reports",
      search: (prev) => ({ ...prev, categories: [categoryId], page: 1 }),
    });
  };

  const handleMerchantClick = (merchantId: string) => {
    navigate({
      to: "/reports",
      search: (prev) => ({ ...prev, merchants: [merchantId], page: 1 }),
    });
  };

  return (
    <EntityPickerProvider>
      <div className="min-h-full">
        <PageHeader
          eyebrow="Analytics"
          title="Reports"
          description="Explore the patterns behind your spending with focused filters and summaries."
        />

        <div className="mx-auto max-w-screen-2xl space-y-6 px-4 py-8 lg:px-8">
          <Panel dense>
            <ViewControls route="reports" />
          </Panel>

          <SummaryPanel summary={summary} />

          <Panel className="gap-0 overflow-hidden p-0">
            <TransactionList
              transactions={transactions}
              hasActiveFilters={hasActiveViewFilters(search)}
              reviewOnly={reviewing}
              isMutating={mutations.isPending}
              mutations={mutations}
              onCustomSplit={(transaction) =>
                setSplitDialog({ open: true, transaction })
              }
              onEditMerchant={(merchantId) =>
                setEditMerchant({ open: true, merchantId })
              }
              onEditCategory={(categoryId) =>
                setEditCategory({ open: true, categoryId })
              }
              onCreateMerchant={() => setCreateMerchantOpen(true)}
              onCreateCategory={() => setCreateCategoryOpen(true)}
              onMerchantClick={handleMerchantClick}
              onCategoryClick={handleCategoryClick}
            />
          </Panel>

          <Paginator
            pagination={pagination}
            onPageChange={goToPage}
            onPageSizeChange={changePageSize}
          />
        </div>

        <EditMerchantDialog
          open={editMerchant.open}
          onOpenChange={(open) =>
            setEditMerchant({ open, merchantId: editMerchant.merchantId })
          }
          merchantId={editMerchant.merchantId}
          onSuccess={refreshView}
        />

        <EditCategoryDialog
          open={editCategory.open}
          onOpenChange={(open) =>
            setEditCategory({ open, categoryId: editCategory.categoryId })
          }
          categoryId={editCategory.categoryId}
          onSuccess={refreshView}
        />

        <CreateMerchantDialog
          open={createMerchantOpen}
          onOpenChange={setCreateMerchantOpen}
          onSuccess={() =>
            queryClient.invalidateQueries({
              queryKey: orpc.merchants.getUserMerchants.queryOptions().queryKey,
            })
          }
        />

        <CreateCategoryDialog
          open={createCategoryOpen}
          onOpenChange={setCreateCategoryOpen}
          onSuccess={() =>
            queryClient.invalidateQueries({
              queryKey:
                orpc.categories.getUserCategories.queryOptions().queryKey,
            })
          }
        />

        <SplitTransactionDialog
          open={splitDialog.open}
          onOpenChange={(open) =>
            setSplitDialog({
              open,
              transaction: open ? splitDialog.transaction : null,
            })
          }
          transaction={splitDialog.transaction}
          queryKey={viewKey}
        />
      </div>
    </EntityPickerProvider>
  );
}

function SummaryPanel({ summary }: { summary: ViewSummary | undefined }) {
  const hasMonthlyAverage = summary?.monthlyAverage !== undefined;

  return (
    <Panel title="Summary">
      <div
        className={cn(
          "grid grid-cols-2 gap-3",
          hasMonthlyAverage ? "sm:grid-cols-4" : "sm:grid-cols-3",
        )}
      >
        <SummaryStat label="Total transactions">
          {summary?.totalCount ?? 0}
        </SummaryStat>
        <SummaryStat label="Total amount">
          <CurrencyAmount amount={summary?.totalAmount ?? 0} animate />
        </SummaryStat>
        <SummaryStat label="Average amount">
          <CurrencyAmount amount={summary?.averageAmount ?? 0} animate />
        </SummaryStat>
        {hasMonthlyAverage ? (
          <SummaryStat label="Monthly average">
            <CurrencyAmount amount={summary?.monthlyAverage ?? 0} animate />
          </SummaryStat>
        ) : null}
      </div>
    </Panel>
  );
}

function SummaryStat({
  label,
  children,
}: {
  label: string;
  children: ReactNode;
}) {
  return (
    <div className="flex flex-col items-center justify-center gap-1 rounded-lg bg-muted/50 p-4 text-center">
      <div className="text-2xl font-semibold text-foreground">{children}</div>
      <div className="text-xs uppercase tracking-wider text-muted-foreground">
        {label}
      </div>
    </div>
  );
}
