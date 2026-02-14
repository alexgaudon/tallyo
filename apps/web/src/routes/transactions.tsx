import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  createFileRoute,
  useNavigate,
  useSearch,
} from "@tanstack/react-router";
import { Plus } from "lucide-react";
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

export const Route = createFileRoute("/transactions")({
  validateSearch: searchSchema,
  beforeLoad: async ({
    context,
    search,
  }: {
    context: RouterAppContext & { isAuthenticated: boolean };
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
      onMutate: async ({ id, categoryId }) => {
        await queryClient.cancelQueries(
          createTransactionQueryOptions(effectiveSearch),
        );

        const previousData = queryClient.getQueryData(
          createTransactionQueryOptions(effectiveSearch).queryKey,
        );

        const categoriesData = queryClient.getQueryData(
          orpc.categories.getUserCategories.queryOptions().queryKey,
        );

        queryClient.setQueryData(
          createTransactionQueryOptions(effectiveSearch).queryKey,
          (old: TransactionQueryResponse | undefined) => {
            if (!old) return old;

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

  const { mutateAsync: updateMerchant } = useMutation(
    orpc.transactions.updateTransactionMerchant.mutationOptions({
      onMutate: async ({ id, merchantId }) => {
        await queryClient.cancelQueries(
          createTransactionQueryOptions(effectiveSearch),
        );

        const previousData = queryClient.getQueryData(
          createTransactionQueryOptions(effectiveSearch).queryKey,
        );

        const merchantsData = queryClient.getQueryData(
          orpc.merchants.getUserMerchants.queryOptions().queryKey,
        );

        queryClient.setQueryData(
          createTransactionQueryOptions(effectiveSearch).queryKey,
          (old: TransactionQueryResponse | undefined) => {
            if (!old) return old;

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
    <div className="min-h-full">
      <div className="max-w-screen-2xl mx-auto px-4 py-6 lg:px-8 space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold font-sans">Transactions</h1>
            <p className="text-sm text-muted-foreground">
              Manage and review your transactions
            </p>
          </div>
          <Dialog
            open={isCreateFormOpen}
            onOpenChange={(open) => {
              setIsCreateFormOpen(open);
            }}
          >
            <DialogTrigger asChild>
              <Button>
                <Plus className="w-4 h-4 mr-2" />
                Add Transaction
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
        </div>

        {/* Search */}
        <div className="rounded-xl border border-border/60 shadow-soft p-4">
          <Search />
        </div>

        {/* Table */}
        <div className="rounded-xl border border-border/60 shadow-soft overflow-hidden">
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
