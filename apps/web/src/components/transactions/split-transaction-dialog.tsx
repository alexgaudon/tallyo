import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Minus, Plus, Split } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { CategorySelect } from "@/components/categories/category-select";
import { Button } from "@/components/ui/button";
import { CurrencyAmount } from "@/components/ui/currency-amount";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { orpc } from "@/utils/orpc";
import type { Transaction } from "../../../../server/src/routers";

interface SplitTransactionDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  transaction: Transaction | null;
  queryKey: readonly unknown[];
}

interface SplitItem {
  id: string;
  amount: string; // Store as string to avoid input issues
  categoryId: string | null;
}

function parseAmount(value: string): number {
  // Remove any non-numeric characters except decimal point
  const cleanValue = value.replace(/[^\d.]/g, "");
  const parsed = Number.parseFloat(cleanValue);
  return Number.isNaN(parsed) ? 0 : parsed;
}

function formatCents(value: string): number {
  const dollars = parseAmount(value);
  return Math.round(dollars * 100);
}

export function SplitTransactionDialog({
  open,
  onOpenChange,
  transaction,
  queryKey,
}: SplitTransactionDialogProps) {
  const queryClient = useQueryClient();
  const [splits, setSplits] = useState<SplitItem[]>([
    { id: "1", amount: "", categoryId: null },
    { id: "2", amount: "", categoryId: null },
  ]);
  const [error, setError] = useState<string | null>(null);

  const originalAmount = transaction?.amount ?? 0;
  const isExpense = originalAmount < 0;
  const displayAmount = Math.abs(originalAmount);

  // Reset splits when transaction changes or dialog opens
  useEffect(() => {
    if (open && transaction) {
      setSplits([
        { id: "1", amount: "", categoryId: null },
        { id: "2", amount: "", categoryId: null },
      ]);
      setError(null);
    }
  }, [open, transaction?.id, transaction]);

  const totalSplitCents = useMemo(
    () => splits.reduce((sum, split) => sum + formatCents(split.amount), 0),
    [splits],
  );

  const remainingCents = displayAmount - totalSplitCents;

  const isValid = useMemo(() => {
    if (splits.length < 2) return false;
    if (totalSplitCents !== displayAmount) return false;
    return splits.every((split) => formatCents(split.amount) > 0);
  }, [splits, totalSplitCents, displayAmount]);

  const { mutateAsync: splitTransaction, isPending } = useMutation(
    orpc.transactions.splitTransaction.mutationOptions({
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey });
        onOpenChange(false);
        resetSplits();
      },
      onError: (error) => {
        setError(error.message);
      },
    }),
  );

  const resetSplits = () => {
    setSplits([
      { id: "1", amount: "", categoryId: null },
      { id: "2", amount: "", categoryId: null },
    ]);
    setError(null);
  };

  const handleAddSplit = () => {
    setSplits((prev) => [
      ...prev,
      {
        id: crypto.randomUUID(),
        amount: "",
        categoryId: null,
      },
    ]);
  };

  const handleRemoveSplit = (id: string) => {
    if (splits.length <= 2) return;
    setSplits((prev) => prev.filter((split) => split.id !== id));
  };

  const handleAmountChange = (id: string, value: string) => {
    // Allow only digits and one decimal point
    const sanitized = value.replace(/[^\d.]/g, "");
    const parts = sanitized.split(".");
    // Limit to 2 decimal places
    const limited =
      parts.length > 2
        ? `${parts[0]}.${parts[1]}`
        : parts.length === 2
          ? `${parts[0]}.${parts[1].slice(0, 2)}`
          : sanitized;

    setSplits((prev) =>
      prev.map((split) =>
        split.id === id ? { ...split, amount: limited } : split,
      ),
    );
    setError(null);
  };

  const handleCategoryChange = (id: string, categoryId: string | null) => {
    setSplits((prev) =>
      prev.map((split) => (split.id === id ? { ...split, categoryId } : split)),
    );
  };

  const handleSubmit = async () => {
    if (!transaction || !isValid) return;

    // Apply the sign from the original transaction to all splits
    const sign = isExpense ? -1 : 1;

    await splitTransaction({
      id: transaction.id,
      splits: splits.map((split) => ({
        amount: formatCents(split.amount) * sign,
        categoryId: split.categoryId,
      })),
    });
  };

  return (
    <Dialog
      open={open}
      onOpenChange={(open) => {
        onOpenChange(open);
        if (!open) resetSplits();
      }}
    >
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Split className="h-5 w-5" />
            Split Transaction
          </DialogTitle>
          <DialogDescription>
            Split this {isExpense ? "expense" : "income"} into multiple parts
            with different categories. Enter positive amounts - the sign will be
            applied automatically.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {/* Original transaction summary */}
          <div className="bg-muted/50 rounded-lg p-3 space-y-1">
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">
                Original Amount
              </span>
              <CurrencyAmount
                amount={originalAmount}
                className="font-semibold"
              />
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">
                Remaining to Allocate
              </span>
              <CurrencyAmount
                amount={remainingCents * (isExpense ? -1 : 1)}
                className={`font-semibold ${remainingCents === 0 ? "text-[var(--income)]" : "text-[var(--expense)]"}`}
              />
            </div>
          </div>

          {/* Splits */}
          <div className="space-y-3">
            {splits.map((split, index) => (
              <div
                key={split.id}
                className="flex items-start gap-2 p-3 border rounded-lg"
              >
                <div className="flex-1 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
                      Split {index + 1}
                    </span>
                    {splits.length > 2 && (
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-6 w-6"
                        onClick={() => handleRemoveSplit(split.id)}
                      >
                        <Minus className="h-3 w-3" />
                      </Button>
                    )}
                  </div>

                  <div className="flex items-center gap-2">
                    <div className="relative flex-1">
                      <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground text-sm">
                        $
                      </span>
                      <input
                        type="text"
                        inputMode="decimal"
                        value={split.amount}
                        onChange={(e) =>
                          handleAmountChange(split.id, e.target.value)
                        }
                        placeholder="0.00"
                        className="w-full h-9 pl-6 pr-3 border rounded-md bg-background text-sm focus:outline-none focus:ring-2 focus:ring-ring/70"
                      />
                    </div>
                  </div>

                  <CategorySelect
                    value={split.categoryId}
                    onValueChange={(categoryId) =>
                      handleCategoryChange(split.id, categoryId)
                    }
                    placeholder="Select category..."
                    className="w-full"
                    allowNull
                  />
                </div>
              </div>
            ))}
          </div>

          {/* Add split button */}
          <Button
            variant="outline"
            size="sm"
            onClick={handleAddSplit}
            className="w-full"
          >
            <Plus className="h-4 w-4 mr-2" />
            Add Another Split
          </Button>

          {/* Error message */}
          {error && (
            <div className="text-sm text-[var(--expense)] bg-[var(--expense-muted)] rounded-md px-3 py-2">
              {error}
            </div>
          )}

          {/* Validation messages */}
          {!isValid && !error && (
            <div className="text-sm text-muted-foreground">
              {splits.length < 2 && "At least 2 splits are required."}
              {splits.length >= 2 && totalSplitCents !== displayAmount && (
                <>
                  Split amounts must sum to{" "}
                  <CurrencyAmount amount={originalAmount} /> (currently{" "}
                  <CurrencyAmount
                    amount={totalSplitCents * (isExpense ? -1 : 1)}
                  />
                  ).
                </>
              )}
            </div>
          )}
        </div>

        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={isPending}
          >
            Cancel
          </Button>
          <Button
            onClick={handleSubmit}
            disabled={!isValid || isPending}
            className="bg-accent hover:bg-accent/90 text-accent-foreground"
          >
            {isPending ? "Splitting..." : "Split Transaction"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
