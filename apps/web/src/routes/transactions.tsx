import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  createFileRoute,
  useNavigate,
  useSearch,
} from "@tanstack/react-router";
import { Plus } from "lucide-react";
import { useEffect, useState } from "react";
import { z } from "zod";
import { PageHeader } from "@/components/layout/page-header";
import { CreateTransactionForm } from "@/components/transactions/create-transaction-form";
import { Search } from "@/components/transactions/search";
import { TransactionsTable } from "@/components/transactions/transactions-table";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { EntityPickerProvider } from "@/components/ui/entity-picker-sheet";
import { useLocalPageSize } from "@/hooks/use-local-page-size";
import { ensureSession } from "@/lib/auth-client";
import { orpc } from "@/utils/orpc";
import type {
  Category,
  MerchantWithKeywordsAndCategory,
  Transaction,
} from "../../../server/src/routers";
import type { RouterAppContext } from "./__root";

const searchSchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(100).optional(),
  filter: z.string().optional(),
  category: z.string().optional(),
  merchant: z.string().optional(),
  onlyUnreviewed: z.boolean().optional(),
  onlyWithoutMerchant: z.boolean().optional(),
  create: z.boolean().optional(),
});

type SearchParams = z.infer<typeof searchSchema>;

type TransactionQueryResponse = Awaited<
  ReturnType<typeof orpc.transactions.getUserTransactions.call>
>;

const createTransactionQueryOptions = (
  search: SearchParams,
  options?: Record<string, unknown>,
) => {
  return orpc.transactions.getUserTransactions.queryOptions({
    ...options,
    input: {
      page: search.page,
      pageSize: search.pageSize,
      filter: search.filter,
      category: search.category,
      merchant: search.merchant,
      onlyUnreviewed: search.onlyUnreviewed,
      onlyWithoutMerchant: search.onlyWithoutMerchant,
    },
  });
};

type QueryClient = ReturnType<typeof useQueryClient>;

/**
 * Shared optimistic-update flow for the transactions list: cancel in-flight
 * queries, snapshot, patch the matching row, roll back on error, invalidate
 * on settle. Each mutation supplies only the per-row transform.
 */
function optimisticTransactionMutation<TVars>(
  queryClient: QueryClient,
  search: SearchParams,
  patch: (tx: Transaction, vars: TVars) => Transaction,
  settled?: () => Promise<void> | void,
) {
  const options = createTransactionQueryOptions(search);
  return {
    onMutate: async (vars: TVars) => {
      await queryClient.cancelQueries(options);
      const previousData = queryClient.getQueryData<TransactionQueryResponse>(
        options.queryKey,
      );
      queryClient.setQueryData<TransactionQueryResponse>(
        options.queryKey,
        (old) => {
          if (!old) return old;
          return {
            ...old,
            transactions: old.transactions.map((tx) =>
              tx.id === (vars as { id: string }).id ? patch(tx, vars) : tx,
            ),
          };
        },
      );
      return { previousData };
    },
    onError: (
      _err: unknown,
      _vars: TVars,
      context?: { previousData?: TransactionQueryResponse },
    ) => {
      if (context?.previousData) {
        queryClient.setQueryData(options.queryKey, context.previousData);
      }
    },
    onSettled: async () => {
      await queryClient.invalidateQueries(options);
      await settled?.();
    },
  };
}

export const Route = createFileRoute("/transactions")({
  validateSearch: searchSchema,
  beforeLoad: async ({
    context,
    search,
  }: {
    context: RouterAppContext;
    search: SearchParams;
  }) => {
    ensureSession(context.isAuthenticated, "/transactions");

    let effectivePageSize = 10;
    try {
      const stored = localStorage.getItem("transactions-page-size");
      if (stored) {
        const parsed = Number.parseInt(stored, 10);
        if ([10, 25, 50, 100].includes(parsed)) {
          effectivePageSize = parsed;
        }
      }
    } catch (_error) {
      // Ignore local storage errors
    }

    const effectiveSearch = {
      ...search,
      pageSize: search.pageSize ?? effectivePageSize,
    };

    await Promise.all([
      context.queryClient.prefetchQuery(
        orpc.categories.getUserCategories.queryOptions(),
      ),
      context.queryClient.prefetchQuery(
        orpc.merchants.getUserMerchants.queryOptions(),
      ),
      context.queryClient.prefetchQuery(
        createTransactionQueryOptions(effectiveSearch),
      ),
    ]);
  },
  component: RouteComponent,
});

function RouteComponent() {
  const navigate = useNavigate();
  const search = useSearch({ from: "/transactions" });
  const queryClient = useQueryClient();
  const [isCreateFormOpen, setIsCreateFormOpen] = useState(false);
  const { pageSize: localPageSize, savePageSize } = useLocalPageSize();

  const effectivePageSize = search.pageSize ?? localPageSize;
  const effectiveSearch = { ...search, pageSize: effectivePageSize };

  useEffect(() => {
    if (!search.pageSize) {
      navigate({
        to: "/transactions",
        search: { ...search, pageSize: localPageSize },
        replace: true,
      });
    } else {
      savePageSize(search.pageSize);
    }
  }, [search.pageSize, localPageSize, navigate, search, savePageSize]);

  // Open create modal when navigating with ?create=true
  useEffect(() => {
    if (search.create) {
      setIsCreateFormOpen(true);
      // Clear the create param from URL
      navigate({
        to: "/transactions",
        search: { ...search, create: undefined },
        replace: true,
      });
    }
  }, [search.create, navigate, search]);

  const hasActiveFilters = !!(
    search.filter ||
    search.category ||
    search.merchant ||
    search.onlyUnreviewed ||
    search.onlyWithoutMerchant
  );

  const { data } = useQuery(
    createTransactionQueryOptions(effectiveSearch, {
      keepPreviousData: true,
      refetchInterval: 30000,
    }),
  );
  const transactionsData = data as TransactionQueryResponse | undefined;

  useQuery({
    ...createTransactionQueryOptions({
      ...effectiveSearch,
      page: effectiveSearch.page + 1,
    }),
    staleTime: 1000 * 60,
  });

  const { mutateAsync: updateCategory } = useMutation(
    orpc.transactions.updateTransactionCategory.mutationOptions({
      ...optimisticTransactionMutation(
        queryClient,
        effectiveSearch,
        (tx, { categoryId }: { categoryId: string | null }) => {
          const categoriesData = queryClient.getQueryData(
            orpc.categories.getUserCategories.queryOptions().queryKey,
          );
          const selectedCategory =
            categoryId && categoriesData
              ? (categoriesData as { categories: Category[] }).categories?.find(
                  (c) => c.id === categoryId,
                )
              : null;
          return { ...tx, categoryId, category: selectedCategory || null };
        },
      ),
    }),
  );

  const { mutateAsync: updateMerchant } = useMutation(
    orpc.transactions.updateTransactionMerchant.mutationOptions({
      ...optimisticTransactionMutation(
        queryClient,
        effectiveSearch,
        (tx, { merchantId }: { merchantId: string | null }) => {
          const merchantsData = queryClient.getQueryData(
            orpc.merchants.getUserMerchants.queryOptions().queryKey,
          );
          const categoriesData = queryClient.getQueryData(
            orpc.categories.getUserCategories.queryOptions().queryKey,
          );
          const selectedMerchant =
            merchantId && merchantsData
              ? (merchantsData as MerchantWithKeywordsAndCategory[]).find(
                  (m) => m.id === merchantId,
                )
              : null;
          const autoCategoryId =
            selectedMerchant?.recommendedCategoryId ?? null;
          const autoCategory =
            autoCategoryId && categoriesData
              ? ((
                  categoriesData as { categories: Category[] }
                ).categories?.find((c) => c.id === autoCategoryId) ?? null)
              : null;
          return {
            ...tx,
            merchantId,
            merchant: selectedMerchant || null,
            categoryId: autoCategoryId,
            category: autoCategory,
          };
        },
      ),
    }),
  );

  const { mutateAsync: updateNotes } = useMutation(
    orpc.transactions.updateTransactionNotes.mutationOptions({
      ...optimisticTransactionMutation(
        queryClient,
        effectiveSearch,
        (tx, { notes }: { notes: string | null }) => ({ ...tx, notes }),
      ),
    }),
  );

  const { mutateAsync: toggleReviewed } = useMutation(
    orpc.transactions.toggleTransactionReviewed.mutationOptions({
      ...optimisticTransactionMutation(
        queryClient,
        effectiveSearch,
        (tx) => ({ ...tx, reviewed: !tx.reviewed }),
        () =>
          queryClient.invalidateQueries({
            queryKey: ["session"],
          }),
      ),
    }),
  );

  const { mutateAsync: deleteTransaction } = useMutation(
    orpc.transactions.deleteTransaction.mutationOptions({
      onSuccess: () => {
        queryClient.invalidateQueries({
          queryKey: createTransactionQueryOptions(effectiveSearch).queryKey,
        });
        queryClient.invalidateQueries({
          queryKey: ["transactions", "getUserTransactions", "session"],
        });
      },
    }),
  );

  const handlePageChange = (page: number) => {
    navigate({
      to: "/transactions",
      search: (prev) => ({ ...prev, page }),
    });
  };

  const handlePageSizeChange = (pageSize: number) => {
    savePageSize(pageSize);
    navigate({
      to: "/transactions",
      search: { ...search, pageSize, page: 1 },
    });
  };

  const handleCategoryClick = (categoryId: string) => {
    navigate({
      to: "/transactions",
      search: { ...search, category: categoryId, page: 1 },
    });
  };

  const handleMerchantClick = (merchantId: string) => {
    navigate({
      to: "/transactions",
      search: { ...search, merchant: merchantId, page: 1 },
    });
  };

  return (
    <EntityPickerProvider>
      <div className="min-h-full">
        <PageHeader
          eyebrow="Your activity"
          title="Transactions"
          description="Review, categorize, and keep every movement of money in order."
          actions={
            <Dialog
              open={isCreateFormOpen}
              onOpenChange={(open) => {
                setIsCreateFormOpen(open);
              }}
            >
              <DialogTrigger asChild>
                <Button>
                  <Plus className="w-4 h-4 mr-2" />
                  Add transaction
                </Button>
              </DialogTrigger>
              <DialogContent className="sm:max-w-[620px]">
                <DialogHeader>
                  <DialogTitle>Create New Transaction</DialogTitle>
                  <DialogDescription>
                    Add a new transaction to your records.
                  </DialogDescription>
                </DialogHeader>
                <CreateTransactionForm
                  callback={() => {
                    queryClient.invalidateQueries({
                      queryKey:
                        createTransactionQueryOptions(effectiveSearch).queryKey,
                    });
                    setIsCreateFormOpen(false);
                  }}
                />
              </DialogContent>
            </Dialog>
          }
        />

        <div className="max-w-screen-2xl mx-auto space-y-6 px-4 py-8 lg:px-8">
          {/* Search */}
          <div className="rounded-xl border border-border bg-card p-3 shadow-soft">
            <Search />
          </div>

          {/* Table */}
          <div className="overflow-hidden rounded-xl border border-border bg-card shadow-soft">
            <TransactionsTable
              transactions={transactionsData?.transactions ?? []}
              pagination={{
                total: transactionsData?.pagination.total ?? 0,
                page: transactionsData?.pagination.page ?? 1,
                pageSize: search.pageSize ?? localPageSize,
                totalPages: transactionsData?.pagination.totalPages ?? 1,
              }}
              onPageChange={handlePageChange}
              onPageSizeChange={handlePageSizeChange}
              updateCategory={updateCategory}
              updateMerchant={updateMerchant}
              updateNotes={updateNotes}
              toggleReviewed={toggleReviewed}
              deleteTransaction={deleteTransaction}
              onCategoryClick={handleCategoryClick}
              onMerchantClick={handleMerchantClick}
              isLoading={false}
              queryKey={[
                ...createTransactionQueryOptions(effectiveSearch).queryKey,
              ]}
              hasActiveFilters={hasActiveFilters}
              onlyUnreviewed={!!search.onlyUnreviewed}
            />
          </div>
        </div>
      </div>
    </EntityPickerProvider>
  );
}
