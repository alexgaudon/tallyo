import { format, parseISO } from "date-fns";
import { Check, Split, Trash } from "lucide-react";
import { memo, useEffect, useRef, useState } from "react";
import { formatCategory } from "@/components/categories/category-select";
import { Button } from "@/components/ui/button";
import { CurrencyAmount } from "@/components/ui/currency-amount";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { EntityPicker } from "@/components/ui/entity-picker";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import type {
  LedgerTransaction,
  TransactionMutations,
  TransactionPendingKind,
} from "@/hooks/use-transaction-mutations";
import { cn } from "@/lib/utils";
import type { MerchantWithKeywordsAndCategory } from "../../../../server/src/routers";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "../ui/alert-dialog";
import { Badge } from "../ui/badge";
import { CategorySuggestionButton } from "./suggestion-button";

/**
 * Shared column template: two columns on narrow screens, six aligned columns on
 * wide screens. The amount cell pins itself to the last-but-one column so the
 * rest of the DOM can stack naturally underneath on mobile.
 */
export const LEDGER_GRID_COLUMNS =
  "grid-cols-[minmax(0,1fr)_auto] sm:grid-cols-[7rem_minmax(0,1.4fr)_minmax(0,1fr)_minmax(9rem,1.3fr)_auto_auto]";

function parseTransactionDate(dateValue: string | Date) {
  if (typeof dateValue === "string") {
    const match = dateValue.match(/^(\d{4})-(\d{2})-(\d{2})/);
    if (match) {
      return new Date(
        Number.parseInt(match[1], 10),
        Number.parseInt(match[2], 10) - 1,
        Number.parseInt(match[3], 10),
      );
    }
    const parsed = parseISO(dateValue);
    return new Date(parsed.getFullYear(), parsed.getMonth(), parsed.getDate());
  }
  return new Date(
    dateValue.getFullYear(),
    dateValue.getMonth(),
    dateValue.getDate(),
  );
}

function isUpcomingTransaction(dateValue: string | Date) {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const transactionDate = parseTransactionDate(dateValue);
  transactionDate.setHours(0, 0, 0, 0);
  const daysDifference =
    Math.floor(
      (transactionDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24),
    ) + 1;
  return daysDifference >= 2 && daysDifference <= 30;
}

function formatRelativeTime(dateValue: string | Date) {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const transactionDate = parseTransactionDate(dateValue);
  transactionDate.setHours(0, 0, 0, 0);
  const daysDifference = Math.floor(
    (today.getTime() - transactionDate.getTime()) / (1000 * 60 * 60 * 24),
  );

  if (daysDifference === 0) return "Today";
  if (daysDifference === 1) return "Yesterday";
  if (daysDifference > 1 && daysDifference < 30)
    return `${daysDifference} days ago`;
  if (daysDifference >= 30 && daysDifference < 365) {
    const months = Math.floor(daysDifference / 30);
    return `${months} ${months === 1 ? "month" : "months"} ago`;
  }
  if (daysDifference >= 365) {
    const years = Math.floor(daysDifference / 365);
    return `${years} ${years === 1 ? "year" : "years"} ago`;
  }
  if (daysDifference === -1) return "Tomorrow";
  if (daysDifference < -1 && daysDifference > -30)
    return `In ${Math.abs(daysDifference)} days`;
  if (daysDifference <= -30 && daysDifference > -365) {
    const months = Math.floor(Math.abs(daysDifference) / 30);
    return `In ${months} ${months === 1 ? "month" : "months"}`;
  }
  const years = Math.floor(Math.abs(daysDifference) / 365);
  return `In ${years} ${years === 1 ? "year" : "years"}`;
}

interface TransactionRowProps {
  transaction: LedgerTransaction;
  suggestedMerchant?: MerchantWithKeywordsAndCategory | null;
  isDevMode?: boolean;
  /** Which action is currently in flight for this row, if any. */
  pendingKind?: TransactionPendingKind | null;
  mutations: TransactionMutations;
  onCustomSplit: (transaction: LedgerTransaction) => void;
  onEditMerchant: (merchantId: string) => void;
  onEditCategory: (categoryId: string) => void;
  onCreateMerchant: () => void;
  onCreateCategory: () => void;
  onMerchantClick?: (merchantId: string) => void;
  onCategoryClick?: (categoryId: string) => void;
}

export const TransactionRow = memo(function TransactionRow({
  transaction,
  suggestedMerchant,
  isDevMode = false,
  pendingKind = null,
  mutations,
  onCustomSplit,
  onEditMerchant,
  onEditCategory,
  onCreateMerchant,
  onCreateCategory,
  onMerchantClick,
  onCategoryClick,
}: TransactionRowProps) {
  const date = parseTransactionDate(transaction.date);
  const isUpcoming = isUpcomingTransaction(transaction.date);
  const isSplit = Boolean(transaction.splitGroupId);

  const [note, setNote] = useState(transaction.notes ?? "");
  const noteFocusedRef = useRef(false);

  useEffect(() => {
    if (!noteFocusedRef.current) {
      setNote(transaction.notes ?? "");
    }
  }, [transaction.notes]);

  const missingAssignment =
    !transaction.category || !transaction.merchant
      ? !transaction.category && !transaction.merchant
        ? "Choose a merchant and category to finish review"
        : !transaction.category
          ? "Choose a category to finish review"
          : "Choose a merchant to finish review"
      : null;
  const isReviewDisabled = !transaction.reviewed && Boolean(missingAssignment);

  const showSuggestedMerchant =
    Boolean(suggestedMerchant) &&
    !transaction.merchant &&
    !transaction.reviewed;

  const handleQuickSplit = () => {
    const absAmount = Math.abs(transaction.amount);
    const sign = transaction.amount < 0 ? -1 : 1;
    const firstHalf = Math.ceil(absAmount / 2);
    const secondHalf = absAmount - firstHalf;
    mutations.splitTransaction({
      id: transaction.id,
      splits: [
        { amount: firstHalf * sign, categoryId: null },
        { amount: secondHalf * sign, categoryId: null },
      ],
    });
  };

  return (
    <div
      className={cn(
        "grid items-start gap-x-3 gap-y-2 px-3 py-3 transition-soft hover:bg-muted/40 sm:items-center",
        LEDGER_GRID_COLUMNS,
        !transaction.reviewed && "border-l-2 border-l-accent",
      )}
    >
      {/* Date */}
      <div className="col-start-1 flex min-w-0 items-center gap-1.5 text-xs text-muted-foreground">
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger asChild>
              <span className="cursor-default whitespace-nowrap">
                {format(date, "MMM d, yyyy")}
              </span>
            </TooltipTrigger>
            <TooltipContent>
              <p>{formatRelativeTime(transaction.date)}</p>
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>
        {isUpcoming && (
          <span
            className="h-2 w-2 shrink-0 rounded-full bg-accent"
            title="Upcoming transaction"
          />
        )}
        {isSplit && (
          <Badge variant="outline" className="px-1 py-0 text-[10px]">
            Split
          </Badge>
        )}
      </div>

      {/* Amount */}
      <div className="col-start-2 row-start-1 justify-self-end sm:col-start-5 sm:row-start-1">
        <CurrencyAmount
          amount={transaction.amount}
          showColor
          className="text-base font-semibold"
        />
      </div>

      {/* Merchant */}
      <div className="col-span-2 min-w-0 sm:col-span-1">
        {showSuggestedMerchant && suggestedMerchant ? (
          <Button
            type="button"
            variant="secondary"
            size="sm"
            className="mb-1 h-7 w-full justify-start text-left text-xs font-normal"
            disabled={pendingKind === "merchant"}
            onClick={() =>
              mutations.updateMerchant({
                id: transaction.id,
                merchantId: suggestedMerchant.id,
              })
            }
          >
            <span className="truncate">
              Use suggested merchant:{" "}
              <span className="font-medium">{suggestedMerchant.name}</span>
            </span>
          </Button>
        ) : null}
        {transaction.reviewed ? (
          transaction.merchant ? (
            <Button
              variant="ghost"
              size="sm"
              className="h-auto p-1 text-muted-foreground transition-soft hover:bg-muted/50 hover:text-foreground"
              onClick={() =>
                transaction.merchant &&
                onMerchantClick?.(transaction.merchant.id)
              }
            >
              {transaction.merchant.name}
            </Button>
          ) : (
            <span className="text-sm text-muted-foreground">No merchant</span>
          )
        ) : (
          <EntityPicker
            kind="merchant"
            value={transaction.merchant?.id ?? null}
            onChange={(next) =>
              mutations.updateMerchant({
                id: transaction.id,
                merchantId: next as string | null,
              })
            }
            placeholder="Select merchant..."
            className="w-full"
            allowClear
            allowCreate
            allowEdit
            disabled={pendingKind === "merchant"}
            onCreate={onCreateMerchant}
            onEdit={onEditMerchant}
            transactionDetails={transaction.transactionDetails}
          />
        )}
        {isDevMode && transaction.externalId ? (
          <span className="mt-0.5 block truncate font-mono text-[10px] text-muted-foreground">
            {transaction.externalId}
          </span>
        ) : null}
      </div>

      {/* Category */}
      <div className="col-span-2 min-w-0 sm:col-span-1">
        {transaction.reviewed ? (
          <div className="flex items-center gap-2">
            {transaction.category ? (
              <Button
                variant="ghost"
                size="sm"
                className="h-auto p-1 text-muted-foreground transition-soft hover:bg-muted/50 hover:text-foreground"
                onClick={() =>
                  transaction.category &&
                  onCategoryClick?.(transaction.category.id)
                }
              >
                {formatCategory(transaction.category)}
              </Button>
            ) : (
              <span className="text-sm text-muted-foreground">No category</span>
            )}
          </div>
        ) : (
          <div className="flex flex-col gap-1">
            <CategorySuggestionButton
              transaction={transaction}
              disabled={pendingKind === "category"}
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
              placeholder="Select category..."
              className="w-full"
              allowClear
              allowCreate
              allowEdit
              disabled={pendingKind === "category"}
              onCreate={onCreateCategory}
              onEdit={onEditCategory}
            />
          </div>
        )}
      </div>

      {/* Notes */}
      <div className="col-span-2 min-w-0 sm:col-span-1">
        <input
          type="text"
          value={note}
          onFocus={() => {
            noteFocusedRef.current = true;
          }}
          onChange={(event) => setNote(event.target.value)}
          onBlur={() => {
            noteFocusedRef.current = false;
            const next = note === "" ? null : note;
            if ((transaction.notes ?? null) !== next) {
              mutations.updateNotes({ id: transaction.id, notes: next });
            }
          }}
          placeholder="Add notes..."
          aria-label="Transaction notes"
          className="h-9 w-full rounded-md border border-input bg-background/80 px-2 text-base transition-soft focus:outline-none focus:ring-2 focus:ring-ring/70 disabled:cursor-not-allowed disabled:opacity-50 sm:text-sm"
          disabled={pendingKind === "notes"}
        />
      </div>

      {/* Actions */}
      <div className="col-span-2 flex items-center justify-end gap-1 sm:col-span-1">
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                onClick={() => mutations.toggleReviewed({ id: transaction.id })}
                className={cn(
                  "size-9 rounded-full border border-transparent bg-background transition-soft hover:border-muted-foreground/30 hover:bg-muted/60 active:scale-95",
                  transaction.reviewed
                    ? "text-income"
                    : "text-muted-foreground",
                )}
                disabled={isReviewDisabled || pendingKind === "review"}
                aria-label={
                  transaction.reviewed
                    ? "Mark as unreviewed"
                    : "Mark as reviewed"
                }
              >
                <Check className="size-4" />
              </Button>
            </TooltipTrigger>
            {isReviewDisabled && missingAssignment ? (
              <TooltipContent>
                <p>{missingAssignment}</p>
              </TooltipContent>
            ) : null}
          </Tooltip>
        </TooltipProvider>

        {!isSplit && !transaction.reviewed ? (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                className="size-9 text-muted-foreground hover:bg-muted/60 hover:text-foreground"
                aria-label="Split transaction"
              >
                <Split className="size-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onSelect={handleQuickSplit}>
                Split in half
              </DropdownMenuItem>
              <DropdownMenuItem onSelect={() => onCustomSplit(transaction)}>
                Custom split...
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        ) : null}

        <AlertDialog>
          <AlertDialogTrigger asChild>
            <Button
              variant="ghost"
              size="icon"
              className="size-9"
              aria-label="Delete transaction"
            >
              <Trash className="size-4" />
            </Button>
          </AlertDialogTrigger>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Delete Transaction</AlertDialogTitle>
            </AlertDialogHeader>
            <AlertDialogDescription>
              Are you sure you want to delete this transaction?
            </AlertDialogDescription>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancel</AlertDialogCancel>
              <AlertDialogAction
                onClick={() =>
                  mutations.deleteTransaction({ id: transaction.id })
                }
              >
                Delete
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>
    </div>
  );
});
