import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  createFileRoute,
  useNavigate,
  useSearch,
} from "@tanstack/react-router";
import { CreditCardIcon, Plus } from "lucide-react";
import { useEffect, useState } from "react";
import { z } from "zod";
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
import { useLocalPageSize } from "@/hooks/use-local-page-size";
import { ensureSession } from "@/lib/auth-client";
import { orpc } from "@/utils/orpc";
import type {
  Category,
  MerchantWithKeywordsAndCategory,
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
});

type SearchParams = z.infer<typeof searchSchema>;

// Infer the query response type from the orpc query
type TransactionQueryResponse = Awaited<
  ReturnType<typeof orpc.transactions.getUserTransactions.call>
>;

const createTransactionQueryOptions = (
  search: SearchParams,
  options?: { keepPreviousData?: boolean },
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

export const Route = createFileRoute("/transactions")({
  validateSearch: searchSchema,
  beforeLoad: async ({
    context,
    search,
  }: {
    context: RouterAppContext & { isAuthenticated: boolean };
    search: any;
  }) => {
    ensureSession(context.isAuthenticated, "/transactions");

    // Get effective page size for prefetching
    let effectivePageSize = 10;
    try {
      const stored = localStorage.getItem("transactions-page-size");
      if (stored) {
        const parsed = Number.parseInt(stored, 10);
        if ([10, 25, 50, 100].includes(parsed)) {
          effectivePageSize = parsed;
        }
      }
    } catch (error) {
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

  // Use local page size if not in search params
  const effectivePageSize = search.pageSize ?? localPageSize;
  const effectiveSearch = { ...search, pageSize: effectivePageSize };

  // Ensure page size is always in URL and sync with local storage
  useEffect(() => {
    // If no page size in URL, set it from local storage
    if (!search.pageSize) {
      navigate({
        to: "/transactions",
        search: { ...search, pageSize: localPageSize },
        replace: true,
      });
    } else {
      // Sync local storage with URL
      savePageSize(search.pageSize);
    }
  }, [search.pageSize, localPageSize, navigate, search, savePageSize]);

  const { data: transactionsData } = useQuery(
    createTransactionQueryOptions(effectiveSearch, { keepPreviousData: true }),
  );

  // Prefetch next page
  useQuery({
    ...createTransactionQueryOptions({
      ...effectiveSearch,
      page: effectiveSearch.page + 1,
    }),
    staleTime: 1000 * 60, // Keep data fresh for 1 minute
  });

  const { mutateAsync: updateCategory } = useMutation(
    orpc.transactions.updateTransactionCategory.mutationOptions({
      onMutate: async ({ id, categoryId }) => {
        // Cancel any outgoing refetches
        await queryClient.cancelQueries(
          createTransactionQueryOptions(effectiveSearch),
        );

        // Snapshot the previous value
        const previousData = queryClient.getQueryData(
          createTransactionQueryOptions(effectiveSearch).queryKey,
        );

        // Get available categories for optimistic update
        const categoriesData = queryClient.getQueryData(
          orpc.categories.getUserCategories.queryOptions().queryKey,
        );

        // Optimistically update to the new value
        queryClient.setQueryData(
          createTransactionQueryOptions(effectiveSearch).queryKey,
          (old: TransactionQueryResponse | undefined) => {
            if (!old) return old;

            // Find the category object if categoryId is provided
            const selectedCategory =
              categoryId && categoriesData
                ? (
                    categoriesData as { categories: Category[] }
                  ).categories?.find((c) => c.id === categoryId)
                : null;

            return {
              ...old,
              transactions: old.transactions.map((transaction) =>
                transaction.id === id
                  ? {
                      ...transaction,
                      categoryId,
                      category: selectedCategory || null,
                    }
                  : transaction,
              ),
            };
          },
        );

        // Return a context object with the snapshotted value
        return { previousData };
      },
      onError: (_err, _variables, context) => {
        // If the mutation fails, use the context returned from onMutate to roll back
        if (context?.previousData) {
          queryClient.setQueryData(
            createTransactionQueryOptions(effectiveSearch).queryKey,
            context.previousData,
          );
        }
      },
      onSettled: async () => {
        await queryClient.invalidateQueries(
          createTransactionQueryOptions(effectiveSearch),
        );
      },
    }),
  );

  const { mutateAsync: updateMerchant } = useMutation(
    orpc.transactions.updateTransactionMerchant.mutationOptions({
      onMutate: async ({ id, merchantId }) => {
        await queryClient.cancelQueries(
          createTransactionQueryOptions(effectiveSearch),
        );

        const previousData = queryClient.getQueryData(
          createTransactionQueryOptions(effectiveSearch).queryKey,
        );

        // Get available merchants for optimistic update
        const merchantsData = queryClient.getQueryData(
          orpc.merchants.getUserMerchants.queryOptions().queryKey,
        );

        queryClient.setQueryData(
          createTransactionQueryOptions(effectiveSearch).queryKey,
          (old: TransactionQueryResponse | undefined) => {
            if (!old) return old;

            // Find the merchant object if merchantId is provided
            const selectedMerchant =
              merchantId && merchantsData
                ? (merchantsData as MerchantWithKeywordsAndCategory[]).find(
                    (m) => m.id === merchantId,
                  )
                : null;

            return {
              ...old,
              transactions: old.transactions.map((transaction) =>
                transaction.id === id
                  ? {
                      ...transaction,
                      merchantId,
                      merchant: selectedMerchant || null,
                    }
                  : transaction,
              ),
            };
          },
        );

        return { previousData };
      },
      onError: (_err, _variables, context) => {
        if (context?.previousData) {
          queryClient.setQueryData(
            createTransactionQueryOptions(effectiveSearch).queryKey,
            context.previousData,
          );
        }
      },
      onSettled: async () => {
        await queryClient.invalidateQueries(
          createTransactionQueryOptions(effectiveSearch),
        );
      },
    }),
  );

  const { mutateAsync: updateNotes } = useMutation(
    orpc.transactions.updateTransactionNotes.mutationOptions({
      onMutate: async ({ id, notes }) => {
        await queryClient.cancelQueries(
          createTransactionQueryOptions(effectiveSearch),
        );

        const previousData = queryClient.getQueryData(
          createTransactionQueryOptions(effectiveSearch).queryKey,
        );

        queryClient.setQueryData(
          createTransactionQueryOptions(effectiveSearch).queryKey,
          (old: TransactionQueryResponse | undefined) => {
            if (!old) return old;
            return {
              ...old,
              transactions: old.transactions.map((transaction) =>
                transaction.id === id ? { ...transaction, notes } : transaction,
              ),
            };
          },
        );

        return { previousData };
      },
      onError: (_err, _variables, context) => {
        if (context?.previousData) {
          queryClient.setQueryData(
            createTransactionQueryOptions(effectiveSearch).queryKey,
            context.previousData,
          );
        }
      },
      onSettled: async () => {
        await queryClient.invalidateQueries(
          createTransactionQueryOptions(effectiveSearch),
        );
      },
    }),
  );

  const { mutateAsync: toggleReviewed } = useMutation(
    orpc.transactions.toggleTransactionReviewed.mutationOptions({
      onMutate: async ({ id }) => {
        await queryClient.cancelQueries(
          createTransactionQueryOptions(effectiveSearch),
        );

        const previousData = queryClient.getQueryData(
          createTransactionQueryOptions(effectiveSearch).queryKey,
        );

        queryClient.setQueryData(
          createTransactionQueryOptions(effectiveSearch).queryKey,
          (old: TransactionQueryResponse | undefined) => {
            if (!old) return old;
            return {
              ...old,
              transactions: old.transactions.map((transaction) =>
                transaction.id === id
                  ? { ...transaction, reviewed: !transaction.reviewed }
                  : transaction,
              ),
            };
          },
        );

        return { previousData };
      },
      onError: (_err, _variables, context) => {
        if (context?.previousData) {
          queryClient.setQueryData(
            createTransactionQueryOptions(effectiveSearch).queryKey,
            context.previousData,
          );
        }
      },
      onSettled: async () => {
        await Promise.all([
          queryClient.invalidateQueries(
            createTransactionQueryOptions(effectiveSearch),
          ),
          queryClient.invalidateQueries({
            queryKey: ["session"],
          }),
        ]);
      },
    }),
  );

  const { mutateAsync: deleteTransaction } = useMutation(
    orpc.transactions.deleteTransaction.mutationOptions({
      onSuccess: () => {
        queryClient.invalidateQueries({
          queryKey: createTransactionQueryOptions(effectiveSearch).queryKey,
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
    <div className="min-h-screen">
      <div className="container mx-auto max-w-screen-2xl p-4 sm:p-6 lg:p-8 space-y-6">
        <div className="bg-card rounded-md border shadow-sm p-6">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="flex items-center justify-center w-10 h-10 rounded-lg bg-accent/10">
                <CreditCardIcon className="h-6 w-6 text-accent" />
              </div>
              <div>
                <h1 className="text-2xl font-bold">Transactions</h1>
                <p className="text-sm text-muted-foreground">
                  Manage and review your transactions
                </p>
              </div>
            </div>
            <div className="flex justify-center sm:justify-end">
              <Dialog
                open={isCreateFormOpen}
                onOpenChange={(open) => {
                  setIsCreateFormOpen(open);
                }}
              >
                <DialogTrigger asChild>
                  <Button
                    variant="default"
                    size="lg"
                    className="shadow w-full sm:w-auto"
                  >
                    <Plus className="h-4 w-4 mr-2" />
                    <span className="hidden sm:inline">New Transaction</span>
                    <span className="sm:hidden">New</span>
                  </Button>
                </DialogTrigger>
                <DialogContent className="sm:max-w-[600px]">
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
                          createTransactionQueryOptions(effectiveSearch)
                            .queryKey,
                      });
                      setIsCreateFormOpen(false);
                    }}
                  />
                </DialogContent>
              </Dialog>
            </div>
          </div>
        </div>
        <div className="bg-card rounded-md border shadow-sm p-6">
          <Search />
        </div>
        <div className="bg-card rounded-md border shadow-sm p-6 overflow-x-auto">
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
          />
        </div>
      </div>
    </div>
  );
}
