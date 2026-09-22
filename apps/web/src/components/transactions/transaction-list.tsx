import { useQuery } from "@tanstack/react-query";
import { useMemo } from "react";
import { EmptyState } from "@/components/ui/empty-state";
import type {
  LedgerTransaction,
  TransactionMutations,
  TransactionPendingKind,
} from "@/hooks/use-transaction-mutations";
import { findMerchantsMatchingDetails } from "@/lib/merchant-suggestions";
import { cn } from "@/lib/utils";
import { orpc } from "@/utils/orpc";
import type { MerchantWithKeywordsAndCategory } from "../../../../server/src/routers";
import { LEDGER_GRID_COLUMNS, TransactionRow } from "./transaction-row";

interface TransactionListProps {
  transactions: LedgerTransaction[];
  hasActiveFilters: boolean;
  reviewOnly: boolean;
  mutations: TransactionMutations;
  onCustomSplit: (transaction: LedgerTransaction) => void;
  onEditMerchant: (merchantId: string) => void;
  onEditCategory: (categoryId: string) => void;
  onCreateMerchant: () => void;
  onCreateCategory: () => void;
  onMerchantClick?: (merchantId: string) => void;
  onCategoryClick?: (categoryId: string) => void;
}

/** Which action (if any) is in flight for a given row. */
function pendingKindForRow(
  id: string,
  pending: TransactionMutations["pending"],
): TransactionPendingKind | null {
  for (const kind of Object.keys(pending) as TransactionPendingKind[]) {
    if (pending[kind] === id) return kind;
  }
  return null;
}

export function TransactionList({
  transactions,
  hasActiveFilters,
  reviewOnly,
  mutations,
  onCustomSplit,
  onEditMerchant,
  onEditCategory,
  onCreateMerchant,
  onCreateCategory,
  onMerchantClick,
  onCategoryClick,
}: TransactionListProps) {
  const { data: merchantsData } = useQuery(
    orpc.merchants.getUserMerchants.queryOptions(),
  );
  const merchants = merchantsData ?? [];

  const suggestedMerchantByTransactionId = useMemo(() => {
    const map = new Map<string, MerchantWithKeywordsAndCategory>();
    for (const transaction of transactions) {
      const matches = findMerchantsMatchingDetails(
        merchants,
        transaction.transactionDetails,
      );
      if (matches[0]) {
        map.set(transaction.id, matches[0]);
      }
    }
    return map;
  }, [transactions, merchants]);

  if (transactions.length === 0) {
    return (
      <EmptyState
        compact
        bordered={false}
        title={
          reviewOnly
            ? "All caught up"
            : hasActiveFilters
              ? "No transactions match your filters"
              : "No transactions yet"
        }
        description={
          reviewOnly
            ? "Every transaction has been reviewed."
            : hasActiveFilters
              ? "Try adjusting or clearing your search criteria."
              : "Import or add a transaction to get started."
        }
      />
    );
  }

  return (
    <div className="divide-y divide-border">
      <div
        className={cn(
          "hidden bg-muted/40 px-3 py-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground sm:grid sm:items-center",
          LEDGER_GRID_COLUMNS,
        )}
      >
        <span>Date</span>
        <span>Merchant</span>
        <span>Category</span>
        <span>Notes</span>
        <span className="text-right">Amount</span>
        <span className="text-right">Actions</span>
      </div>
      {transactions.map((transaction) => (
        <TransactionRow
          key={transaction.id}
          transaction={transaction}
          suggestedMerchant={
            suggestedMerchantByTransactionId.get(transaction.id) ?? null
          }
          pendingKind={pendingKindForRow(transaction.id, mutations.pending)}
          mutations={mutations}
          onCustomSplit={onCustomSplit}
          onEditMerchant={onEditMerchant}
          onEditCategory={onEditCategory}
          onCreateMerchant={onCreateMerchant}
          onCreateCategory={onCreateCategory}
          onMerchantClick={onMerchantClick}
          onCategoryClick={onCategoryClick}
        />
      ))}
    </div>
  );
}
