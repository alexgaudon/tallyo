import { format, parseISO } from "date-fns";
import { Check, Trash } from "lucide-react";
import { memo, useEffect, useRef, useState } from "react";
import {
  CategorySelect,
  formatCategory,
} from "@/components/categories/category-select";
import { CreateCategoryDialog } from "@/components/categories/create-category-dialog";
import { EditCategoryDialog } from "@/components/categories/edit-category-dialog";
import { EditMerchantDialog } from "@/components/merchants/edit-merchant-dialog";
import { MerchantSelect } from "@/components/merchants/merchant-select";
import { Button } from "@/components/ui/button";
import { CurrencyAmount } from "@/components/ui/currency-amount";
import { type PaginationInfo, Paginator } from "@/components/ui/paginator";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { useSession } from "@/lib/auth-client";
import { cn } from "@/lib/utils";
import type { Transaction } from "../../../../server/src/routers/index";
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

interface TransactionsTableProps {
  transactions: Transaction[];
  pagination: PaginationInfo;
  onPageChange: (page: number) => void;
  onPageSizeChange: (pageSize: number) => void;
  updateCategory: (args: { id: string; categoryId: string | null }) => void;
  updateMerchant: (args: { id: string; merchantId: string | null }) => void;
  updateNotes: (args: { id: string; notes: string }) => void;
  toggleReviewed: (args: { id: string }) => void;
  deleteTransaction: (args: { id: string }) => void;
  onCategoryClick?: (categoryId: string) => void;
  onMerchantClick?: (merchantId: string) => void;
  isLoading?: boolean;
}

// Helper functions moved outside component
const parseTransactionDate = (dateValue: string | Date) => {
  let year: number;
  let month: number;
  let day: number;

  if (typeof dateValue === "string") {
    const dateMatch = dateValue.match(/^(\d{4})-(\d{2})-(\d{2})/);
    if (dateMatch) {
      year = Number.parseInt(dateMatch[1], 10);
      month = Number.parseInt(dateMatch[2], 10) - 1;
      day = Number.parseInt(dateMatch[3], 10);
    } else {
      const date = parseISO(dateValue);
      year = date.getFullYear();
      month = date.getMonth();
      day = date.getDate();
    }
  } else {
    year = dateValue.getFullYear();
    month = dateValue.getMonth();
    day = dateValue.getDate();
  }

  return new Date(year, month, day);
};

const isUpcomingTransaction = (dateValue: string | Date) => {
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const transactionDate = parseTransactionDate(dateValue);
  transactionDate.setHours(0, 0, 0, 0);

  const daysDifference =
    Math.floor(
      (transactionDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24),
    ) + 1;
  return daysDifference >= 2 && daysDifference <= 30;
};

const formatRelativeTime = (dateValue: string | Date) => {
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const transactionDate = parseTransactionDate(dateValue);
  transactionDate.setHours(0, 0, 0, 0);

  const daysDifference = Math.floor(
    (today.getTime() - transactionDate.getTime()) / (1000 * 60 * 60 * 24),
  );

  if (daysDifference === 0) {
    return "Today";
  } else if (daysDifference === 1) {
    return "Yesterday";
  } else if (daysDifference > 1 && daysDifference < 30) {
    return `${daysDifference} days ago`;
  } else if (daysDifference >= 30 && daysDifference < 365) {
    const months = Math.floor(daysDifference / 30);
    return `${months} ${months === 1 ? "month" : "months"} ago`;
  } else if (daysDifference >= 365) {
    const years = Math.floor(daysDifference / 365);
    return `${years} ${years === 1 ? "year" : "years"} ago`;
  } else if (daysDifference === -1) {
    return "Tomorrow";
  } else if (daysDifference < -1 && daysDifference > -30) {
    return `In ${Math.abs(daysDifference)} days`;
  } else if (daysDifference <= -30 && daysDifference > -365) {
    const months = Math.floor(Math.abs(daysDifference) / 30);
    return `In ${months} ${months === 1 ? "month" : "months"}`;
  } else {
    const years = Math.floor(Math.abs(daysDifference) / 365);
    return `In ${years} ${years === 1 ? "year" : "years"}`;
  }
};

// Memoized mobile card component
interface TransactionCardProps {
  transaction: Transaction;
  localNote: string;
  isLoading: boolean;
  isDevMode: boolean;
  onNoteChange: (id: string, value: string) => void;
  onNoteBlur: (id: string, value: string) => void;
  onToggleReviewed: (id: string) => void;
  onDelete: (id: string) => void;
  onCategoryChange: (id: string, categoryId: string | null) => void;
  onMerchantChange: (id: string, merchantId: string | null) => void;
  onMerchantClick?: (merchantId: string) => void;
  onCategoryClick?: (categoryId: string) => void;
  onEditMerchant: (merchantId: string) => void;
  onEditCategory: (categoryId: string) => void;
  onCreateCategory: () => void;
}

const TransactionCard = memo(function TransactionCard({
  transaction,
  localNote,
  isLoading,
  isDevMode,
  onNoteChange,
  onNoteBlur,
  onToggleReviewed,
  onDelete,
  onCategoryChange,
  onMerchantChange,
  onMerchantClick,
  onCategoryClick,
  onEditMerchant,
  onEditCategory,
  onCreateCategory,
}: TransactionCardProps) {
  const date = parseTransactionDate(transaction.date);
  const isUpcoming = isUpcomingTransaction(transaction.date);
  const needsReview = !transaction.reviewed;
  const needsCategory = !transaction.category && !transaction.reviewed;
  const needsMerchant = !transaction.merchant && !transaction.reviewed;

  const isReviewDisabled =
    !transaction.reviewed && (!transaction.category || !transaction.merchant);

  return (
    <div
      className={cn(
        "relative bg-card rounded-lg overflow-hidden",
        isLoading && "opacity-50",
      )}
    >
      {/* Status bar at top - orange for unreviewed, green for reviewed */}
      <div
        className={cn(
          "absolute top-0 left-0 right-0 h-1 z-10",
          transaction.reviewed ? "bg-income/30" : "bg-accent",
        )}
      />

      <div className="p-4">
        <div className="flex items-start justify-between gap-3">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <span className="text-sm text-muted-foreground whitespace-nowrap cursor-default">
                      {format(date, "MMM d, yyyy")}
                    </span>
                  </TooltipTrigger>
                  <TooltipContent>
                    <p>{formatRelativeTime(transaction.date)}</p>
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
              {isUpcoming && (
                <Badge
                  variant="secondary"
                  className="text-xs bg-accent/20 text-accent-foreground"
                >
                  Upcoming
                </Badge>
              )}
              {!transaction.reviewed && (
                <Badge
                  variant="secondary"
                  className="text-xs bg-accent/20 text-accent-foreground"
                >
                  Needs Review
                </Badge>
              )}
            </div>

            <div className="mt-2">
              <CurrencyAmount
                amount={transaction.amount}
                showColor
                className="text-lg font-semibold"
              />
            </div>
          </div>

          <div className="flex items-center gap-1 shrink-0">
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => onToggleReviewed(transaction.id)}
                    className={cn(
                      "rounded-full border border-transparent bg-background hover:border-muted-foreground/30 hover:bg-muted/60 transition-colors h-10 w-10",
                      transaction.reviewed
                        ? "text-income"
                        : "text-muted-foreground",
                    )}
                    disabled={isReviewDisabled || isLoading}
                    aria-label={
                      transaction.reviewed
                        ? "Mark as unreviewed"
                        : "Mark as reviewed"
                    }
                  >
                    <Check className="h-5 w-5" />
                  </Button>
                </TooltipTrigger>
                {isReviewDisabled && (
                  <TooltipContent>
                    <p>
                      {!transaction.category && !transaction.merchant
                        ? "Assign a category and merchant before reviewing"
                        : !transaction.category
                          ? "Assign a category before reviewing"
                          : "Assign a merchant before reviewing"}
                    </p>
                  </TooltipContent>
                )}
              </Tooltip>
            </TooltipProvider>

            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-10 w-10"
                  aria-label="Delete transaction"
                >
                  <Trash className="h-5 w-5" />
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
                  <AlertDialogAction onClick={() => onDelete(transaction.id)}>
                    Delete
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          </div>
        </div>

        {needsReview && (needsCategory || needsMerchant) && (
          <div className="mt-2 text-xs text-muted-foreground bg-muted/50 rounded px-2 py-1.5">
            {needsCategory && needsMerchant
              ? "Assign category and merchant to review"
              : needsCategory
                ? "Assign category to review"
                : "Assign merchant to review"}
          </div>
        )}
      </div>

      <div
        className={cn("px-4 pb-4 space-y-4", transaction.reviewed && "pt-0")}
      >
        {transaction.reviewed ? (
          // Compact view for reviewed transactions
          <div className="flex flex-col gap-2">
            <div className="flex items-center gap-2 text-sm flex-wrap">
              {transaction.merchant ? (
                <button
                  type="button"
                  onClick={() =>
                    transaction.merchant &&
                    onMerchantClick?.(transaction.merchant.id)
                  }
                  className="text-foreground hover:underline font-medium"
                >
                  {transaction.merchant.name}
                </button>
              ) : (
                <span className="text-muted-foreground">No merchant</span>
              )}
              <span className="text-muted-foreground">•</span>
              {transaction.category ? (
                <button
                  type="button"
                  onClick={() =>
                    transaction.category &&
                    onCategoryClick?.(transaction.category.id)
                  }
                  className="text-muted-foreground hover:text-foreground hover:underline"
                >
                  {formatCategory(transaction.category)}
                </button>
              ) : (
                <span className="text-muted-foreground">No category</span>
              )}
            </div>
            <input
              type="text"
              id={`notes-${transaction.id}`}
              value={localNote}
              onChange={(e) => onNoteChange(transaction.id, e.target.value)}
              onBlur={(e) => onNoteBlur(transaction.id, e.target.value)}
              placeholder="Add notes..."
              className="w-full border-input rounded-md border bg-background/80 px-2 focus:outline-none focus:ring-2 focus:ring-ring/70 focus:ring-offset-0 disabled:opacity-50 disabled:cursor-not-allowed transition-colors h-10 text-base py-2"
              disabled={isLoading}
              aria-label="Transaction notes"
            />
          </div>
        ) : (
          // Full editing view for unreviewed transactions
          <>
            <div className="space-y-1.5">
              <span className="text-xs font-medium text-muted-foreground uppercase tracking-wider block">
                Merchant
              </span>
              <div className="w-full">
                <MerchantSelect
                  value={transaction.merchant?.id}
                  onValueChange={(merchantId) =>
                    onMerchantChange(transaction.id, merchantId)
                  }
                  placeholder="Select merchant..."
                  className="w-full"
                  allowNull
                  disabled={isLoading}
                  transactionDetails={transaction.transactionDetails}
                  onEditMerchant={onEditMerchant}
                />
                {transaction.transactionDetails && (
                  <span className="block mt-1 text-[10px] text-muted-foreground truncate leading-none">
                    {transaction.transactionDetails}
                  </span>
                )}
              </div>
            </div>

            <div className="space-y-1.5">
              <span className="text-xs font-medium text-muted-foreground uppercase tracking-wider block">
                Category
              </span>
              <CategorySelect
                value={transaction.category?.id}
                onValueChange={(categoryId) =>
                  onCategoryChange(transaction.id, categoryId)
                }
                placeholder="Select category..."
                className="w-full"
                allowNull
                disabled={isLoading}
                onEditCategory={onEditCategory}
                onCreateCategory={onCreateCategory}
              />
            </div>

            <div className="space-y-1.5">
              <label
                htmlFor={`notes-${transaction.id}`}
                className="text-xs font-medium text-muted-foreground uppercase tracking-wider block"
              >
                Notes
              </label>
              <input
                type="text"
                id={`notes-${transaction.id}`}
                value={localNote}
                onChange={(e) => onNoteChange(transaction.id, e.target.value)}
                onBlur={(e) => onNoteBlur(transaction.id, e.target.value)}
                placeholder="Add notes..."
                className="w-full border-input rounded-md border bg-background/80 px-2 focus:outline-none focus:ring-2 focus:ring-ring/70 focus:ring-offset-0 disabled:opacity-50 disabled:cursor-not-allowed transition-colors h-10 text-base py-2"
                disabled={isLoading}
                aria-label="Transaction notes"
              />
            </div>
          </>
        )}

        {isDevMode && (
          <div className="pt-3 border-t border-border space-y-1">
            <div className="flex justify-between text-xs">
              <span className="text-muted-foreground">ID:</span>
              <span className="font-mono text-muted-foreground truncate max-w-[200px]">
                {transaction.id}
              </span>
            </div>
            {transaction.externalId && (
              <div className="flex justify-between text-xs">
                <span className="text-muted-foreground">External ID:</span>
                <span className="font-mono text-muted-foreground truncate max-w-[200px]">
                  {transaction.externalId}
                </span>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
});

export function TransactionsTable({
  transactions,
  pagination,
  onPageChange,
  onPageSizeChange,
  updateCategory,
  updateMerchant,
  updateNotes,
  toggleReviewed,
  deleteTransaction,
  onCategoryClick,
  onMerchantClick,
  isLoading = false,
}: TransactionsTableProps) {
  const { data: session } = useSession();
  const isDevMode = session?.settings?.isDevMode ?? false;

  const [localNotes, setLocalNotes] = useState<Record<string, string>>(() =>
    Object.fromEntries(transactions.map((t) => [t.id, t.notes ?? ""])),
  );

  const [editMerchantDialog, setEditMerchantDialog] = useState<{
    open: boolean;
    merchantId: string;
  }>({ open: false, merchantId: "" });

  const [editCategoryDialog, setEditCategoryDialog] = useState<{
    open: boolean;
    categoryId: string;
  }>({ open: false, categoryId: "" });

  const [createCategoryDialog, setCreateCategoryDialog] = useState(false);

  const unsavedChanges = useRef<Record<string, string>>({});
  const updateNotesRef = useRef(updateNotes);
  const transactionsRef = useRef(transactions);

  useEffect(() => {
    updateNotesRef.current = updateNotes;
    transactionsRef.current = transactions;
  }, [updateNotes, transactions]);

  useEffect(() => {
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      const hasUnsavedChanges = Object.keys(unsavedChanges.current).length > 0;
      if (hasUnsavedChanges) {
        e.preventDefault();
        for (const [id, value] of Object.entries(unsavedChanges.current)) {
          const transaction = transactionsRef.current.find((t) => t.id === id);
          if (transaction?.notes !== value) {
            updateNotesRef.current({ id, notes: value });
          }
        }
      }
    };

    window.addEventListener("beforeunload", handleBeforeUnload);
    return () => window.removeEventListener("beforeunload", handleBeforeUnload);
  }, []);

  useEffect(() => {
    const serverNotes = Object.fromEntries(
      transactions.map((t) => [t.id, t.notes ?? ""]),
    );
    setLocalNotes(serverNotes);
    unsavedChanges.current = {};
  }, [transactions]);

  const handleNoteChange = (id: string, value: string) => {
    setLocalNotes((prev) => ({ ...prev, [id]: value }));
    unsavedChanges.current[id] = value;
  };

  const handleNoteBlur = (id: string, value: string) => {
    const transaction = transactions.find((t) => t.id === id);
    if (transaction?.notes !== value) {
      updateNotes({ id, notes: value });
      delete unsavedChanges.current[id];
    }
  };

  const handleToggleReviewed = (id: string) => toggleReviewed({ id });
  const handleDelete = (id: string) => deleteTransaction({ id });
  const handleCategoryChange = (id: string, categoryId: string | null) =>
    updateCategory({ id, categoryId });
  const handleMerchantChange = (id: string, merchantId: string | null) =>
    updateMerchant({ id, merchantId });

  const renderReviewButton = (
    transaction: Transaction,
    size: "sm" | "lg" = "sm",
  ) => {
    const isDisabled =
      (!transaction.reviewed &&
        (!transaction.category || !transaction.merchant)) ||
      isLoading;
    const tooltipMessage =
      !transaction.reviewed && (!transaction.category || !transaction.merchant)
        ? !transaction.category && !transaction.merchant
          ? "Assign a category and merchant before reviewing"
          : !transaction.category
            ? "Assign a category before reviewing"
            : "Assign a merchant before reviewing"
        : undefined;

    const buttonSizeClass = size === "lg" ? "h-10 w-10" : "h-7 w-7";
    const iconSizeClass = size === "lg" ? "h-5 w-5" : "h-3.5 w-3.5";

    return (
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              variant="ghost"
              size="icon"
              onClick={() => toggleReviewed({ id: transaction.id })}
              className={cn(
                "rounded-full border border-transparent bg-background hover:border-muted-foreground/30 hover:bg-muted/60 transition-colors",
                buttonSizeClass,
                transaction.reviewed ? "text-income" : "text-muted-foreground",
              )}
              disabled={isDisabled}
              aria-label={
                transaction.reviewed ? "Mark as unreviewed" : "Mark as reviewed"
              }
            >
              <Check className={iconSizeClass} />
            </Button>
          </TooltipTrigger>
          {isDisabled && tooltipMessage && (
            <TooltipContent>
              <p>{tooltipMessage}</p>
            </TooltipContent>
          )}
        </Tooltip>
      </TooltipProvider>
    );
  };

  const renderDeleteButton = (
    transaction: Transaction,
    size: "sm" | "lg" = "sm",
  ) => {
    const buttonSizeClass = size === "lg" ? "h-10 w-10" : "h-8 w-8";
    const iconSizeClass = size === "lg" ? "h-5 w-5" : "h-4 w-4";

    return (
      <AlertDialog>
        <AlertDialogTrigger asChild>
          <Button
            variant="ghost"
            size="icon"
            className={buttonSizeClass}
            aria-label="Delete transaction"
          >
            <Trash className={iconSizeClass} />
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
              onClick={() => deleteTransaction({ id: transaction.id })}
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    );
  };

  const renderMerchantField = (
    transaction: Transaction,
    isMobileView: boolean,
  ) => {
    if (transaction.reviewed) {
      return transaction.merchant ? (
        <Button
          variant="ghost"
          size="sm"
          className="h-auto p-1 text-muted-foreground hover:text-foreground hover:bg-muted/50"
          onClick={() =>
            transaction.merchant && onMerchantClick?.(transaction.merchant.id)
          }
        >
          {transaction.merchant.name}
        </Button>
      ) : (
        <span className="text-muted-foreground truncate">No merchant</span>
      );
    }

    return (
      <div className={cn("relative", isMobileView && "w-full")}>
        <MerchantSelect
          value={transaction.merchant?.id}
          onValueChange={(merchantId) =>
            updateMerchant({ id: transaction.id, merchantId })
          }
          placeholder={isMobileView ? "Select merchant..." : "Select merchant"}
          className={isMobileView ? "w-full" : "min-w-[280px]"}
          allowNull
          disabled={isLoading}
          transactionDetails={transaction.transactionDetails}
          onEditMerchant={(merchantId) =>
            setEditMerchantDialog({ open: true, merchantId })
          }
        />
        {!transaction.reviewed && transaction.transactionDetails && (
          <span className="block mt-1 text-[10px] text-muted-foreground truncate leading-none">
            {transaction.transactionDetails}
          </span>
        )}
      </div>
    );
  };

  const renderCategoryField = (
    transaction: Transaction,
    isMobileView: boolean,
  ) => {
    if (transaction.reviewed) {
      return transaction.category ? (
        <Button
          variant="ghost"
          size="sm"
          className="h-auto p-1 text-muted-foreground hover:text-foreground hover:bg-muted/50"
          onClick={() =>
            transaction.category && onCategoryClick?.(transaction.category.id)
          }
        >
          {formatCategory(transaction.category)}
        </Button>
      ) : (
        <span className="text-muted-foreground truncate">No category</span>
      );
    }

    return (
      <CategorySelect
        value={transaction.category?.id}
        onValueChange={(categoryId) =>
          updateCategory({ id: transaction.id, categoryId })
        }
        placeholder={isMobileView ? "Select category..." : "Select category"}
        className={
          isMobileView ? "w-full" : "w-full min-w-[180px] sm:min-w-[200px]"
        }
        allowNull
        disabled={isLoading}
        onEditCategory={(categoryId) =>
          setEditCategoryDialog({ open: true, categoryId })
        }
        onCreateCategory={() => setCreateCategoryDialog(true)}
      />
    );
  };

  return (
    <div className="space-y-4">
      {/* Desktop Table View */}
      <div className="hidden md:block">
        <Table>
          <TableHeader>
            <TableRow className="hover:bg-transparent">
              {isDevMode && (
                <TableHead className="w-[80px] px-2 sm:px-4">ID</TableHead>
              )}
              <TableHead className="w-[80px] px-2 sm:px-3">Date</TableHead>
              <TableHead className="min-w-[130px] px-2 sm:px-3">
                Merchant
              </TableHead>
              <TableHead className="min-w-[130px] sm:min-w-[150px] px-2 sm:px-3">
                Category
              </TableHead>
              <TableHead className="px-2 sm:px-3 min-w-[200px]">
                Notes
              </TableHead>
              <TableHead className="w-[96px] px-2 sm:px-3 text-right">
                Amount
              </TableHead>
              {isDevMode && (
                <TableHead className="w-[100px] px-2 sm:px-4">
                  External ID
                </TableHead>
              )}
              <TableHead className="w-[72px] px-2 sm:px-3 text-center">
                Reviewed
              </TableHead>
              <TableHead className="w-[88px] px-2 sm:px-3 text-center">
                Actions
              </TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {transactions.map((transaction) => (
              <TableRow
                key={transaction.id}
                className={cn(
                  "hover:bg-muted/50 transition-colors border-l-2 border-l-transparent",
                  !transaction.reviewed && "border-l-accent",
                  isLoading && "opacity-50",
                )}
              >
                {isDevMode && (
                  <TableCell className="font-mono text-xs text-muted-foreground px-2 sm:px-4 h-10 align-middle">
                    {transaction.id}
                  </TableCell>
                )}
                <TableCell className="whitespace-nowrap px-2 sm:px-3 h-10 align-middle">
                  <div className="flex items-center gap-2">
                    <TooltipProvider>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <span className="cursor-default">
                            {format(
                              parseTransactionDate(transaction.date),
                              "MMM d, yyyy",
                            )}
                          </span>
                        </TooltipTrigger>
                        <TooltipContent>
                          <p>{formatRelativeTime(transaction.date)}</p>
                        </TooltipContent>
                      </Tooltip>
                    </TooltipProvider>
                    {isUpcomingTransaction(transaction.date) && (
                      <TooltipProvider>
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <div className="w-2 h-2 bg-accent rounded-full shrink-0" />
                          </TooltipTrigger>
                          <TooltipContent>
                            <p>Upcoming transaction</p>
                          </TooltipContent>
                        </Tooltip>
                      </TooltipProvider>
                    )}
                  </div>
                </TableCell>
                <TableCell className="px-2 sm:px-3 h-14 align-middle">
                  <div className="relative flex items-center h-full">
                    {renderMerchantField(transaction, false)}
                  </div>
                </TableCell>
                <TableCell className="px-2 sm:px-3 h-10 align-middle">
                  <div className="flex items-center h-full">
                    {renderCategoryField(transaction, false)}
                  </div>
                </TableCell>
                <TableCell className="px-2 sm:px-3 h-10 align-middle">
                  <input
                    type="text"
                    value={localNotes[transaction.id] ?? ""}
                    onChange={(e) =>
                      handleNoteChange(transaction.id, e.target.value)
                    }
                    onBlur={(e) =>
                      handleNoteBlur(transaction.id, e.target.value)
                    }
                    placeholder="Add notes..."
                    className="w-full border-input rounded-md border bg-background/80 px-2 h-8 text-base md:text-sm focus:outline-none focus:ring-2 focus:ring-ring/70 focus:ring-offset-0 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                    disabled={isLoading}
                    aria-label="Transaction notes"
                  />
                </TableCell>
                <TableCell className="text-right font-medium px-2 sm:px-3 h-10 align-middle">
                  <CurrencyAmount
                    amount={transaction.amount}
                    showColor
                    className="transition-colors"
                  />
                </TableCell>
                {isDevMode && (
                  <TableCell className="font-mono text-xs text-muted-foreground px-2 sm:px-4 h-10 align-middle">
                    {transaction.externalId &&
                    transaction.externalId.length > 30 ? (
                      <TooltipProvider>
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <span>{transaction.externalId.slice(0, 30)}…</span>
                          </TooltipTrigger>
                          <TooltipContent>
                            <span>{transaction.externalId}</span>
                          </TooltipContent>
                        </Tooltip>
                      </TooltipProvider>
                    ) : (
                      transaction.externalId
                    )}
                  </TableCell>
                )}
                <TableCell className="text-center px-2 sm:px-3 h-10 align-middle">
                  {renderReviewButton(transaction, "sm")}
                </TableCell>
                <TableCell className="text-center px-2 sm:px-3 h-10 align-middle">
                  <div className="flex items-center justify-center gap-1">
                    {renderDeleteButton(transaction, "sm")}
                  </div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      {/* Mobile Card View */}
      <div className="md:hidden space-y-3">
        {transactions.map((transaction) => (
          <TransactionCard
            key={transaction.id}
            transaction={transaction}
            localNote={localNotes[transaction.id] ?? ""}
            isLoading={isLoading}
            isDevMode={isDevMode}
            onNoteChange={handleNoteChange}
            onNoteBlur={handleNoteBlur}
            onToggleReviewed={handleToggleReviewed}
            onDelete={handleDelete}
            onCategoryChange={handleCategoryChange}
            onMerchantChange={handleMerchantChange}
            onMerchantClick={onMerchantClick}
            onCategoryClick={onCategoryClick}
            onEditMerchant={(merchantId) =>
              setEditMerchantDialog({ open: true, merchantId })
            }
            onEditCategory={(categoryId) =>
              setEditCategoryDialog({ open: true, categoryId })
            }
            onCreateCategory={() => setCreateCategoryDialog(true)}
          />
        ))}
      </div>

      <Paginator
        pagination={pagination}
        onPageChange={onPageChange}
        onPageSizeChange={onPageSizeChange}
        isLoading={isLoading}
      />

      <EditMerchantDialog
        open={editMerchantDialog.open}
        onOpenChange={(open) =>
          setEditMerchantDialog({
            open,
            merchantId: editMerchantDialog.merchantId,
          })
        }
        merchantId={editMerchantDialog.merchantId}
      />

      <EditCategoryDialog
        open={editCategoryDialog.open}
        onOpenChange={(open) =>
          setEditCategoryDialog({
            open,
            categoryId: editCategoryDialog.categoryId,
          })
        }
        categoryId={editCategoryDialog.categoryId}
      />

      <CreateCategoryDialog
        open={createCategoryDialog}
        onOpenChange={setCreateCategoryDialog}
        onSuccess={(categoryId) => console.log("Category created:", categoryId)}
      />
    </div>
  );
}
