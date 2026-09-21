import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useRouter } from "@tanstack/react-router";
import {
  type ViewScope,
  type ViewSearch,
  viewQueryOptions,
} from "@/lib/transaction-view";
import { orpc } from "@/utils/orpc";
import type {
  Category,
  MerchantWithKeywordsAndCategory,
} from "../../../server/src/routers";

export type LedgerViewData = Awaited<
  ReturnType<typeof orpc.transactions.getView.call>
>;

export type LedgerTransaction = LedgerViewData["transactions"][number];

/**
 * The single optimistic-mutation surface for the ledger. Every row and the
 * review card drive these; the shared flow cancels the view query, snapshots
 * it, patches the affected row, rolls back on error, then refreshes both the
 * cache and the loader-owned data.
 */
export function useTransactionMutations(
  search: ViewSearch,
  scope: ViewScope = "ledger",
) {
  const queryClient = useQueryClient();
  const router = useRouter();
  const view = viewQueryOptions(search, scope);

  const categoriesQueryKey =
    orpc.categories.getUserCategories.queryOptions().queryKey;
  const merchantsQueryKey =
    orpc.merchants.getUserMerchants.queryOptions().queryKey;

  const readCategories = (): Category[] =>
    queryClient.getQueryData<{ categories: Category[] }>(categoriesQueryKey)
      ?.categories ?? [];

  const readMerchants = (): MerchantWithKeywordsAndCategory[] =>
    queryClient.getQueryData<MerchantWithKeywordsAndCategory[]>(
      merchantsQueryKey,
    ) ?? [];

  const optimistic = <TVars>(
    transform: (data: LedgerViewData, vars: TVars) => LedgerViewData,
    options?: { invalidateSession?: boolean },
  ) => ({
    onMutate: async (vars: TVars) => {
      await queryClient.cancelQueries({ queryKey: view.queryKey });
      const previousData = queryClient.getQueryData<LedgerViewData>(
        view.queryKey,
      );
      queryClient.setQueryData<LedgerViewData>(view.queryKey, (old) =>
        old ? transform(old, vars) : old,
      );
      return { previousData };
    },
    onError: (
      _error: unknown,
      _vars: TVars,
      context?: { previousData?: LedgerViewData },
    ) => {
      if (context?.previousData !== undefined) {
        queryClient.setQueryData(view.queryKey, context.previousData);
      }
    },
    onSettled: async () => {
      await queryClient.invalidateQueries({ queryKey: view.queryKey });
      if (options?.invalidateSession) {
        await queryClient.invalidateQueries({ queryKey: ["session"] });
      }
      await router.invalidate();
    },
  });

  const updateCategory = useMutation(
    orpc.transactions.updateTransactionCategory.mutationOptions(
      optimistic<{ id: string; categoryId: string | null }>((data, vars) => {
        const category = vars.categoryId
          ? (readCategories().find((c) => c.id === vars.categoryId) ?? null)
          : null;
        return {
          ...data,
          transactions: data.transactions.map((tx) =>
            tx.id === vars.id
              ? { ...tx, categoryId: vars.categoryId, category }
              : tx,
          ),
        };
      }),
    ),
  );

  const updateMerchant = useMutation(
    orpc.transactions.updateTransactionMerchant.mutationOptions(
      optimistic<{ id: string; merchantId: string | null }>((data, vars) => {
        const merchant = vars.merchantId
          ? (readMerchants().find((m) => m.id === vars.merchantId) ?? null)
          : null;
        const autoCategoryId = merchant?.recommendedCategoryId ?? null;
        const category = autoCategoryId
          ? (readCategories().find((c) => c.id === autoCategoryId) ?? null)
          : null;
        return {
          ...data,
          transactions: data.transactions.map((tx) =>
            tx.id === vars.id
              ? {
                  ...tx,
                  merchantId: vars.merchantId,
                  merchant,
                  categoryId: autoCategoryId,
                  category,
                }
              : tx,
          ),
        };
      }),
    ),
  );

  const updateNotes = useMutation(
    orpc.transactions.updateTransactionNotes.mutationOptions(
      optimistic<{ id: string; notes: string | null }>((data, vars) => ({
        ...data,
        transactions: data.transactions.map((tx) =>
          tx.id === vars.id ? { ...tx, notes: vars.notes } : tx,
        ),
      })),
    ),
  );

  const toggleReviewed = useMutation(
    orpc.transactions.toggleTransactionReviewed.mutationOptions(
      optimistic<{ id: string }>(
        (data, vars) => ({
          ...data,
          transactions: data.transactions.map((tx) =>
            tx.id === vars.id ? { ...tx, reviewed: !tx.reviewed } : tx,
          ),
        }),
        { invalidateSession: true },
      ),
    ),
  );

  const removeTransaction = (
    data: LedgerViewData,
    id: string,
  ): LedgerViewData => {
    const total = Math.max(0, data.pagination.total - 1);
    return {
      transactions: data.transactions.filter((tx) => tx.id !== id),
      pagination: {
        ...data.pagination,
        total,
        totalPages: Math.max(1, Math.ceil(total / data.pagination.pageSize)),
      },
    };
  };

  const deleteTransaction = useMutation(
    orpc.transactions.deleteTransaction.mutationOptions({
      ...optimistic<{ id: string }>((data, vars) =>
        removeTransaction(data, vars.id),
      ),
    }),
  );

  const splitTransaction = useMutation(
    orpc.transactions.splitTransaction.mutationOptions(
      optimistic<{
        id: string;
        splits: { amount: number; categoryId: string | null }[];
      }>((data, vars) => removeTransaction(data, vars.id)),
    ),
  );

  const isPending =
    updateCategory.isPending ||
    updateMerchant.isPending ||
    updateNotes.isPending ||
    toggleReviewed.isPending ||
    deleteTransaction.isPending ||
    splitTransaction.isPending;

  return {
    updateCategory: updateCategory.mutate,
    updateMerchant: updateMerchant.mutate,
    updateNotes: updateNotes.mutate,
    toggleReviewed: toggleReviewed.mutate,
    deleteTransaction: deleteTransaction.mutate,
    splitTransaction: splitTransaction.mutateAsync,
    isPending,
  };
}

export type TransactionMutations = ReturnType<typeof useTransactionMutations>;
