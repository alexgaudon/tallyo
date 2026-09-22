import { Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { LedgerTransaction } from "@/hooks/use-transaction-mutations";

/**
 * Offers the AI (Jev) category suggestion for a transaction that is still
 * uncategorized and unreviewed. Applying it is a normal category update.
 */
export function CategorySuggestionButton({
  transaction,
  disabled,
  onApply,
}: {
  transaction: LedgerTransaction;
  disabled?: boolean;
  onApply: (categoryId: string) => void;
}) {
  if (
    transaction.reviewed ||
    transaction.category ||
    !transaction.suggestedCategory ||
    !transaction.suggestedCategoryId
  ) {
    return null;
  }

  const confidence = Math.round(
    (transaction.suggestedCategoryConfidence ?? 0) * 100,
  );

  return (
    <Button
      type="button"
      variant="secondary"
      size="sm"
      className="h-7 w-full justify-start text-left text-xs font-normal"
      disabled={disabled}
      onClick={() => onApply(transaction.suggestedCategoryId as string)}
    >
      <Sparkles className="h-3.5 w-3.5 shrink-0" />
      <span className="truncate">
        Suggested:{" "}
        <span className="font-medium">
          {transaction.suggestedCategory.name}
        </span>
        {confidence > 0 ? ` (${confidence}%)` : ""}
      </span>
    </Button>
  );
}

/**
 * Offers the AI (Jev) merchant suggestion for a transaction that is still
 * without a merchant and unreviewed. Used only when keyword matching did not
 * match one. Applying it is a normal merchant update.
 */
export function MerchantSuggestionButton({
  transaction,
  disabled,
  onApply,
}: {
  transaction: LedgerTransaction;
  disabled?: boolean;
  onApply: (merchantId: string) => void;
}) {
  if (
    transaction.reviewed ||
    transaction.merchant ||
    !transaction.suggestedMerchant ||
    !transaction.suggestedMerchantId
  ) {
    return null;
  }

  const confidence = Math.round(
    (transaction.suggestedMerchantConfidence ?? 0) * 100,
  );

  return (
    <Button
      type="button"
      variant="secondary"
      size="sm"
      className="h-7 w-full justify-start text-left text-xs font-normal"
      disabled={disabled}
      onClick={() => onApply(transaction.suggestedMerchantId as string)}
    >
      <Sparkles className="h-3.5 w-3.5 shrink-0" />
      <span className="truncate">
        Suggested merchant:{" "}
        <span className="font-medium">
          {transaction.suggestedMerchant.name}
        </span>
        {confidence > 0 ? ` (${confidence}%)` : ""}
      </span>
    </Button>
  );
}
