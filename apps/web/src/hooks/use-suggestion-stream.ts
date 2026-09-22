import { useQueryClient } from "@tanstack/react-query";
import { useEffect } from "react";
import type { LedgerTransaction } from "@/hooks/use-transaction-mutations";
import { orpc } from "@/utils/orpc";

interface SuggestionEvent {
  transactionId: string;
  suggestedCategoryId: string | null;
  suggestedCategoryConfidence: number | null;
  suggestedMerchantId: string | null;
  suggestedMerchantConfidence: number | null;
}

/** True for a `transactions.getView` query key: `[["transactions","getView"], input]`. */
function isGetViewKey(key: readonly unknown[]): boolean {
  const path = key[0];
  return (
    Array.isArray(path) && path[0] === "transactions" && path[1] === "getView"
  );
}

/**
 * Subscribes to the server's suggestion SSE stream (`/api/events`) and patches
 * the ledger view cache in place, so an AI suggestion appears the moment the
 * worker finishes — no refetch. Falls back to invalidation when the transaction
 * is not on the current page.
 */
export function useSuggestionStream(): void {
  const queryClient = useQueryClient();

  useEffect(() => {
    const source = new EventSource("/api/events");

    const onSuggestion = (event: MessageEvent) => {
      let payload: SuggestionEvent;
      try {
        payload = JSON.parse(event.data);
      } catch {
        return;
      }

      const categories =
        queryClient.getQueryData<{
          categories: { id: string; name: string }[];
        }>(orpc.categories.getUserCategories.queryOptions().queryKey)
          ?.categories ?? [];
      const category =
        categories.find((c) => c.id === payload.suggestedCategoryId) ?? null;

      const merchants =
        queryClient.getQueryData<{ id: string; name: string }[]>(
          orpc.merchants.getUserMerchants.queryOptions().queryKey,
        ) ?? [];
      const merchant =
        merchants.find((m) => m.id === payload.suggestedMerchantId) ?? null;

      let patched = false;
      const queries = queryClient
        .getQueryCache()
        .findAll({ predicate: (query) => isGetViewKey(query.queryKey) });

      for (const query of queries) {
        queryClient.setQueryData(query.queryKey, (old) => {
          const data = old as
            | { transactions?: LedgerTransaction[] }
            | undefined;
          if (
            !data?.transactions?.some((t) => t.id === payload.transactionId)
          ) {
            return old;
          }
          patched = true;
          return {
            ...data,
            transactions: data.transactions.map((t) =>
              t.id === payload.transactionId
                ? {
                    ...t,
                    suggestedCategoryId: payload.suggestedCategoryId,
                    suggestedCategoryConfidence:
                      payload.suggestedCategoryConfidence,
                    suggestedCategory: category,
                    suggestedMerchantId: payload.suggestedMerchantId,
                    suggestedMerchantConfidence:
                      payload.suggestedMerchantConfidence,
                    suggestedMerchant: merchant,
                  }
                : t,
            ),
          };
        });
      }

      if (!patched) {
        queryClient.invalidateQueries({
          predicate: (query) => isGetViewKey(query.queryKey),
        });
      }
    };

    source.addEventListener("suggestion", onSuggestion);
    return () => {
      source.removeEventListener("suggestion", onSuggestion);
      source.close();
    };
  }, [queryClient]);
}
