import { ChevronLeft, ChevronRight, Trash } from "lucide-react";
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { CurrencyAmount } from "@/components/ui/currency-amount";
import { EntityPicker } from "@/components/ui/entity-picker";
import { Panel } from "@/components/ui/panel";
import type {
  LedgerTransaction,
  TransactionMutations,
} from "@/hooks/use-transaction-mutations";
import {
  CategorySuggestionButton,
  MerchantSuggestionButton,
} from "./suggestion-button";

interface ReviewCardProps {
  transactions: LedgerTransaction[];
  mutations: TransactionMutations;
  onEditMerchant: (merchantId: string) => void;
  onEditCategory: (categoryId: string) => void;
  onCreateMerchant: () => void;
  onCreateCategory: () => void;
}

/**
 * Focused, mobile-first review queue for stepping through unreviewed
 * transactions. It is a single layout at every width and drives exactly the
 * same mutations as the ledger rows.
 */
export function ReviewCard({
  transactions,
  mutations,
  onEditMerchant,
  onEditCategory,
  onCreateMerchant,
  onCreateCategory,
}: ReviewCardProps) {
  const count = transactions.length;
  const [index, setIndex] = useState(0);

  useEffect(() => {
    if (index > count - 1) {
      setIndex(Math.max(0, count - 1));
    }
  }, [count, index]);

  const transaction = transactions[index];
  const [note, setNote] = useState(transaction?.notes ?? "");

  useEffect(() => {
    setNote(transaction?.notes ?? "");
  }, [transaction?.id, transaction?.notes]);

  if (!transaction) return null;

  const missingAssignment =
    !transaction.category && !transaction.merchant
      ? "Choose a merchant and category to finish review"
      : !transaction.category
        ? "Choose a category to finish review"
        : !transaction.merchant
          ? "Choose a merchant to finish review"
          : null;
  const isReviewDisabled = Boolean(missingAssignment);

  return (
    <Panel
      title="Review queue"
      description={`${count - index} of ${count} remaining`}
      actions={
        <div className="flex items-center gap-1">
          <Button
            variant="outline"
            size="icon"
            className="size-9"
            disabled={index === 0}
            onClick={() => setIndex((prev) => Math.max(0, prev - 1))}
            aria-label="Previous transaction"
          >
            <ChevronLeft className="size-4" />
          </Button>
          <Button
            variant="outline"
            size="icon"
            className="size-9"
            disabled={index >= count - 1}
            onClick={() => setIndex((prev) => Math.min(count - 1, prev + 1))}
            aria-label="Next transaction"
          >
            <ChevronRight className="size-4" />
          </Button>
        </div>
      }
    >
      <div className="flex flex-col gap-4">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <p className="truncate text-sm font-medium">
              {transaction.transactionDetails ?? "Transaction"}
            </p>
            <p className="text-xs text-muted-foreground">
              {new Date(transaction.date).toLocaleDateString(undefined, {
                month: "short",
                day: "numeric",
                year: "numeric",
              })}
            </p>
          </div>
          <CurrencyAmount
            amount={transaction.amount}
            showColor
            className="text-lg font-semibold"
          />
        </div>

        <div className="grid grid-cols-1 gap-3">
          <div className="space-y-1.5">
            <span className="text-xs font-medium text-muted-foreground">
              Merchant
            </span>
            <MerchantSuggestionButton
              transaction={transaction}
              onApply={(merchantId) =>
                mutations.updateMerchant({ id: transaction.id, merchantId })
              }
            />
            <EntityPicker
              kind="merchant"
              value={transaction.merchant?.id ?? null}
              onChange={(next) =>
                mutations.updateMerchant({
                  id: transaction.id,
                  merchantId: next as string | null,
                })
              }
              placeholder="Choose merchant..."
              className="w-full"
              allowClear
              allowCreate
              allowEdit
              onCreate={onCreateMerchant}
              onEdit={onEditMerchant}
              transactionDetails={transaction.transactionDetails}
            />
          </div>

          <div className="space-y-1.5">
            <span className="text-xs font-medium text-muted-foreground">
              Category
            </span>
            <CategorySuggestionButton
              transaction={transaction}
              onApply={(categoryId) =>
                mutations.updateCategory({ id: transaction.id, categoryId })
              }
            />
            <EntityPicker
              kind="category"
              value={transaction.category?.id ?? null}
              onChange={(next) =>
                mutations.updateCategory({
                  id: transaction.id,
                  categoryId: next as string | null,
                })
              }
              placeholder="Choose category..."
              className="w-full"
              allowClear
              allowCreate
              allowEdit
              onCreate={onCreateCategory}
              onEdit={onEditCategory}
            />
          </div>

          <div className="space-y-1.5">
            <span className="text-xs font-medium text-muted-foreground">
              Notes
            </span>
            <input
              type="text"
              value={note}
              onChange={(event) => setNote(event.target.value)}
              onBlur={() => {
                const next = note === "" ? null : note;
                if ((transaction.notes ?? null) !== next) {
                  mutations.updateNotes({ id: transaction.id, notes: next });
                }
              }}
              placeholder="Optional note"
              aria-label="Transaction notes"
              className="h-10 w-full rounded-md border border-input bg-background/80 px-3 text-base focus:outline-none focus:ring-2 focus:ring-ring/70"
            />
          </div>
        </div>

        {missingAssignment ? (
          <p className="text-xs text-muted-foreground">{missingAssignment}</p>
        ) : null}

        <div className="flex items-center gap-2">
          <Button
            className="h-11 flex-1"
            disabled={isReviewDisabled}
            onClick={() => mutations.toggleReviewed({ id: transaction.id })}
          >
            Mark as reviewed
          </Button>
          <Button
            variant="outline"
            className="h-11 flex-1"
            onClick={() => setIndex((prev) => Math.min(count - 1, prev + 1))}
            disabled={index >= count - 1}
          >
            Skip
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className="size-11 shrink-0"
            onClick={() => mutations.deleteTransaction({ id: transaction.id })}
            aria-label="Delete transaction"
          >
            <Trash className="size-4" />
          </Button>
        </div>
      </div>
    </Panel>
  );
}
