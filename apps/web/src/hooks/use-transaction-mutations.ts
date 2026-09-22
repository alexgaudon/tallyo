import { useMutation, useQueryClient } from "@tanstack/react-query";
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

/** The ledger actions that can be in flight for a single row. */
export type TransactionPendingKind =
  | "review"
  | "category"
  | "merchant"
  | "notes"
  | "remove"
  | "split";

/**
 * The single optimistic-mutation surface for the ledger. Every row and the
 * review card drive these; the shared flow cancels the view query, snapshots
 * it, patches the affected row, rolls back on error, then refreshes the cache.
 * It deliberately does NOT call `router.invalidate()`: the route loader only
 * primes this same query, and re-running it would flip the route into its
 * pending state (and scroll to top) on every single row edit.
 */
export function useTransactionMutations(
  search: ViewSearch,
  scope: ViewScope = "ledger",
) {
  const queryClient = useQueryClient();
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

  const sessionQueryKey = ["session"] as const;

  /**
   * Reviewing a row changes the unreviewed count in the session cache. Patch it
   * directly instead of invalidating `["session"]`, which would refetch the
   * session, meta, and settings on every toggle.
   */
  const patchUnreviewedCount = (delta: number) => {
    queryClient.setQueryData<{
      meta?: { unreviewedTransactionCount?: number };
    }>(sessionQueryKey, (old) => {
      if (typeof old?.meta?.unreviewedTransactionCount !== "number") return old;
      return {
        ...old,
        meta: {
          ...old.meta,
          unreviewedTransactionCount: Math.max(
            0,
            old.meta.unreviewedTransactionCount + delta,
          ),
        },
      };
    });
  };

  const toggleReviewed = useMutation(
    orpc.transactions.toggleTransactionReviewed.mutationOptions({
      onMutate: async ({ id }) => {
        await queryClient.cancelQueries({ queryKey: view.queryKey });
        const previousData = queryClient.getQueryData<LedgerViewData>(
          view.queryKey,
        );
        const previousSession = queryClient.getQueryData(sessionQueryKey);
        const wasReviewed = previousData?.transactions.find(
          (tx) => tx.id === id,
        )?.reviewed;

        queryClient.setQueryData<LedgerViewData>(view.queryKey, (old) =>
          old
            ? {
                ...old,
                transactions: old.transactions.map((tx) =>
                  tx.id === id ? { ...tx, reviewed: !tx.reviewed } : tx,
                ),
              }
            : old,
        );
        if (wasReviewed !== undefined) {
          patchUnreviewedCount(wasReviewed ? 1 : -1);
        }

        return { previousData, previousSession };
      },
      onError: (_error, _vars, context) => {
        if (context?.previousData !== undefined) {
          queryClient.setQueryData(view.queryKey, context.previousData);
        }
        if (context?.previousSession !== undefined) {
          queryClient.setQueryData(sessionQueryKey, context.previousSession);
        }
      },
      onSettled: async () => {
        await queryClient.invalidateQueries({ queryKey: view.queryKey });
      },
    }),
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

  /**
   * The transaction currently in flight for each action, so a row can disable
   * only its own control instead of dimming the whole list. `null` when idle.
   */
  const pending: Record<TransactionPendingKind, string | null> = {
    review: toggleReviewed.isPending
      ? (toggleReviewed.variables?.id ?? null)
      : null,
    category: updateCategory.isPending
      ? (updateCategory.variables?.id ?? null)
      : null,
    merchant: updateMerchant.isPending
      ? (updateMerchant.variables?.id ?? null)
      : null,
    notes: updateNotes.isPending ? (updateNotes.variables?.id ?? null) : null,
    remove: deleteTransaction.isPending
      ? (deleteTransaction.variables?.id ?? null)
      : null,
    split: splitTransaction.isPending
      ? (splitTransaction.variables?.id ?? null)
      : null,
  };

  return {
    updateCategory: updateCategory.mutate,
    updateMerchant: updateMerchant.mutate,
    updateNotes: updateNotes.mutate,
    toggleReviewed: toggleReviewed.mutate,
    deleteTransaction: deleteTransaction.mutate,
    splitTransaction: splitTransaction.mutateAsync,
    isPending,
    pending,
  };
}

export type TransactionMutations = ReturnType<typeof useTransactionMutations>;
