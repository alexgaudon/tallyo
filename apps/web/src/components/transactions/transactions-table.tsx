import { useQuery } from "@tanstack/react-query";
import { format, parseISO } from "date-fns";
import { Check, Split, Trash } from "lucide-react";
import {
  memo,
  type ReactNode,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
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
import { findMerchantsMatchingDetails } from "@/lib/merchant-suggestions";
import { cn } from "@/lib/utils";
import { orpc } from "@/utils/orpc";
import type { MerchantWithKeywordsAndCategory } from "../../../../server/src/routers";
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
import { SplitTransactionDialog } from "./split-transaction-dialog";

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
  queryKey?: readonly unknown[];
  hasActiveFilters?: boolean;
  onlyUnreviewed?: boolean;
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

const isSplitTransaction = (transaction: Transaction) => {
  return !!transaction.splitFromId;
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
  onEditMerchant: (merchantId: string) => void;
  onEditCategory: (categoryId: string) => void;
  onCreateCategory: () => void;
  onSplit?: () => void;
  isSplit?: boolean;
  suggestedMerchant?: MerchantWithKeywordsAndCategory | null;
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
  onEditMerchant,
  onEditCategory,
  onCreateCategory,
  onSplit,
  isSplit,
  suggestedMerchant,
}: TransactionCardProps) {
  const date = parseTransactionDate(transaction.date);
  const isUpcoming = isUpcomingTransaction(transaction.date);

  const isReviewDisabled =
    !transaction.reviewed && (!transaction.category || !transaction.merchant);

  const reviewHint =
    !transaction.category && !transaction.merchant
      ? "Choose a merchant and category to finish review"
      : !transaction.category
        ? "Choose a category to finish review"
        : !transaction.merchant
          ? "Choose a merchant to finish review"
          : null;

  const showSuggestedMerchant =
    suggestedMerchant && !transaction.merchant && !transaction.reviewed;

  return (
    <div
      className={cn(
        "relative bg-card rounded-lg overflow-hidden border border-border/60",
        isLoading && "opacity-50",
        !transaction.reviewed && "border-l-2 border-l-accent",
      )}
    >
      <div className="p-4 space-y-4">
        <div className="flex items-start justify-between gap-3">
          <div className="flex-1 min-w-0 space-y-1">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-xs text-muted-foreground whitespace-nowrap">
                {format(date, "MMM d, yyyy")}
              </span>
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
                  To review
                </Badge>
              )}
              {isSplit && (
                <Badge variant="outline" className="text-xs">
                  Split
                </Badge>
              )}
            </div>

            {transaction.transactionDetails ? (
              <p className="text-sm font-medium text-foreground leading-snug line-clamp-2">
                {transaction.transactionDetails}
              </p>
            ) : null}

            <CurrencyAmount
              amount={transaction.amount}
              showColor
              className="text-xl font-semibold"
            />
          </div>

          <div className="flex items-center gap-1 shrink-0">
            {!isSplit && !transaction.reviewed && onSplit && (
              <Button
                variant="ghost"
                size="icon"
                onClick={onSplit}
                className="h-10 w-10 text-muted-foreground hover:text-foreground"
                aria-label="Split transaction"
              >
                <Split className="h-5 w-5" />
              </Button>
            )}

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

        {showSuggestedMerchant && (
          <Button
            type="button"
            variant="secondary"
            className="w-full h-11 justify-start text-left font-normal"
            disabled={isLoading}
            onClick={() =>
              onMerchantChange(transaction.id, suggestedMerchant.id)
            }
          >
            <span className="truncate">
              Use suggested merchant:{" "}
              <span className="font-medium">{suggestedMerchant.name}</span>
            </span>
          </Button>
        )}

        <div className="space-y-3">
          <MobileAssignmentField
            label="Merchant"
            complete={!!transaction.merchant}
          >
            <MerchantSelect
              value={transaction.merchant?.id}
              onValueChange={(merchantId) =>
                onMerchantChange(transaction.id, merchantId)
              }
              placeholder="Tap to choose merchant"
              className="w-full min-h-11"
              allowNull
              disabled={isLoading || transaction.reviewed}
              transactionDetails={transaction.transactionDetails}
              onEditMerchant={transaction.reviewed ? undefined : onEditMerchant}
            />
          </MobileAssignmentField>

          <MobileAssignmentField
            label="Category"
            complete={!!transaction.category}
          >
            <div className="flex items-center gap-2">
              <CategorySelect
                value={transaction.category?.id}
                onValueChange={(categoryId) =>
                  onCategoryChange(transaction.id, categoryId)
                }
                placeholder="Tap to choose category"
                className="w-full min-h-11"
                allowNull
                disabled={isLoading || transaction.reviewed}
                onEditCategory={
                  transaction.reviewed ? undefined : onEditCategory
                }
                onCreateCategory={
                  transaction.reviewed ? undefined : onCreateCategory
                }
              />
            </div>
          </MobileAssignmentField>

          <div className="space-y-1.5">
            <label
              htmlFor={`notes-${transaction.id}`}
              className="text-xs font-medium text-muted-foreground"
            >
              Notes
            </label>
            <input
              type="text"
              id={`notes-${transaction.id}`}
              value={localNote}
              onChange={(e) => onNoteChange(transaction.id, e.target.value)}
              onBlur={(e) => onNoteBlur(transaction.id, e.target.value)}
              placeholder="Optional note"
              className="w-full border-input rounded-md border bg-background/80 px-3 focus:outline-none focus:ring-2 focus:ring-ring/70 focus:ring-offset-0 disabled:opacity-50 disabled:cursor-not-allowed transition-colors h-11 text-base"
              disabled={isLoading}
              aria-label="Transaction notes"
            />
          </div>
        </div>

        {transaction.reviewed ? (
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="w-full h-8 text-xs text-muted-foreground font-normal hover:text-foreground"
            disabled={isLoading}
            onClick={() => onToggleReviewed(transaction.id)}
          >
            Mark as needs review
          </Button>
        ) : (
          <div className="space-y-2">
            {reviewHint && (
              <p className="text-xs text-muted-foreground text-center px-1">
                {reviewHint}
              </p>
            )}
            <Button
              type="button"
              className="w-full h-12 text-base font-medium"
              disabled={isReviewDisabled || isLoading}
              onClick={() => onToggleReviewed(transaction.id)}
            >
              <Check className="h-5 w-5 mr-2" />
              Mark as reviewed
            </Button>
          </div>
        )}

        {isDevMode ? (
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
        ) : null}
      </div>
    </div>
  );
});

function MobileAssignmentField({
  label,
  complete,
  children,
}: {
  label: string;
  complete: boolean;
  children: ReactNode;
}) {
  return (
    <div className="space-y-1.5">
      <div className="flex items-center justify-between gap-2">
        <span className="text-xs font-medium text-muted-foreground">
          {label}
        </span>
        {complete ? (
          <Check className="h-3.5 w-3.5 text-income shrink-0" aria-hidden />
        ) : null}
      </div>
      {children}
    </div>
  );
}

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
  queryKey = [],
  hasActiveFilters = false,
  onlyUnreviewed = false,
}: TransactionsTableProps) {
  const { data: session } = useSession();
  const isDevMode = session?.settings?.isDevMode ?? false;

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

  const [splitDialog, setSplitDialog] = useState<{
    open: boolean;
    transaction: Transaction | null;
  }>({ open: false, transaction: null });

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

  const renderSplitButton = (
    transaction: Transaction,
    size: "sm" | "lg" = "sm",
  ) => {
    const buttonSizeClass = size === "lg" ? "h-10 w-10" : "h-8 w-8";
    const iconSizeClass = size === "lg" ? "h-5 w-5" : "h-4 w-4";

    // Hide split button for already split or reviewed transactions
    if (isSplitTransaction(transaction) || transaction.reviewed) {
      return null;
    }

    return (
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setSplitDialog({ open: true, transaction })}
              className={cn(
                "text-muted-foreground hover:text-foreground hover:bg-muted/60 transition-colors",
                buttonSizeClass,
              )}
              aria-label="Split transaction"
            >
              <Split className={iconSizeClass} />
            </Button>
          </TooltipTrigger>
          <TooltipContent>
            <p>Split transaction</p>
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>
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
          <span className="block mt-1 text-xs text-muted-foreground truncate leading-none">
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
    const splitIndicator = isSplitTransaction(transaction) ? (
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger asChild>
            <div className="w-2 h-2 bg-accent rounded-full shrink-0" />
          </TooltipTrigger>
          <TooltipContent>
            <p>Split transaction</p>
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>
    ) : null;

    if (transaction.reviewed) {
      return (
        <div className="flex items-center gap-2">
          {transaction.category ? (
            <Button
              variant="ghost"
              size="sm"
              className="h-auto p-1 text-muted-foreground hover:text-foreground hover:bg-muted/50"
              onClick={() =>
                transaction.category &&
                onCategoryClick?.(transaction.category.id)
              }
            >
              {formatCategory(transaction.category)}
            </Button>
          ) : (
            <span className="text-muted-foreground truncate">No category</span>
          )}
          {splitIndicator}
        </div>
      );
    }

    return (
      <div className={cn("flex items-center gap-2", isMobileView && "w-full")}>
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
        {splitIndicator}
      </div>
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
            {transactions.length === 0 ? (
              <TableRow>
                <TableCell
                  colSpan={isDevMode ? 9 : 7}
                  className="h-32 text-center"
                >
                  <div className="flex flex-col items-center justify-center gap-2 text-muted-foreground">
                    <p className="text-sm font-medium">
                      {onlyUnreviewed
                        ? "All caught up"
                        : hasActiveFilters
                          ? "No transactions match your filters"
                          : "No transactions yet"}
                    </p>
                    <p className="text-xs">
                      {onlyUnreviewed
                        ? "Every transaction has been reviewed."
                        : hasActiveFilters
                          ? "Try adjusting or clearing your search criteria."
                          : "Import or add a transaction to get started."}
                    </p>
                  </div>
                </TableCell>
              </TableRow>
            ) : (
              transactions.map((transaction) => (
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
                  <TableCell className="px-2 sm:px-3 align-middle">
                    <div className="relative flex flex-col gap-1 py-1">
                      {suggestedMerchantByTransactionId.get(transaction.id) &&
                        !transaction.merchant &&
                        !transaction.reviewed && (
                          <Button
                            type="button"
                            variant="secondary"
                            size="sm"
                            className="w-full justify-start text-left font-normal text-xs h-7"
                            disabled={isLoading}
                            onClick={() =>
                              handleMerchantChange(
                                transaction.id,
                                suggestedMerchantByTransactionId.get(
                                  transaction.id,
                                )!.id,
                              )
                            }
                          >
                            <span className="truncate">
                              Use suggested merchant:{" "}
                              <span className="font-medium">
                                {
                                  suggestedMerchantByTransactionId.get(
                                    transaction.id,
                                  )!.name
                                }
                              </span>
                            </span>
                          </Button>
                        )}
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
                              <span>
                                {transaction.externalId.slice(0, 30)}…
                              </span>
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
                      {renderSplitButton(transaction, "sm")}
                      {renderDeleteButton(transaction, "sm")}
                    </div>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      {/* Mobile Card View */}
      <div className="md:hidden space-y-3">
        {transactions.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
            <p className="text-sm font-medium">
              {onlyUnreviewed
                ? "All caught up"
                : hasActiveFilters
                  ? "No transactions match your filters"
                  : "No transactions yet"}
            </p>
            <p className="text-xs mt-1">
              {onlyUnreviewed
                ? "Every transaction has been reviewed."
                : hasActiveFilters
                  ? "Try adjusting or clearing your search criteria."
                  : "Import or add a transaction to get started."}
            </p>
          </div>
        ) : (
          transactions.map((transaction) => (
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
              onEditMerchant={(merchantId) =>
                setEditMerchantDialog({ open: true, merchantId })
              }
              onEditCategory={(categoryId) =>
                setEditCategoryDialog({ open: true, categoryId })
              }
              onCreateCategory={() => setCreateCategoryDialog(true)}
              onSplit={() => setSplitDialog({ open: true, transaction })}
              isSplit={isSplitTransaction(transaction)}
              suggestedMerchant={
                suggestedMerchantByTransactionId.get(transaction.id) ?? null
              }
            />
          ))
        )}
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

      <SplitTransactionDialog
        open={splitDialog.open}
        onOpenChange={(open) => setSplitDialog({ open, transaction: null })}
        transaction={splitDialog.transaction}
        queryKey={queryKey}
      />
    </div>
  );
}
