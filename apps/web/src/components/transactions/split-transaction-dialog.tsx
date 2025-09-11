import { useId, useState } from "react";
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
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
	Tooltip,
	TooltipContent,
	TooltipProvider,
	TooltipTrigger,
} from "@/components/ui/tooltip";

interface SplitTransactionDialogProps {
	open: boolean;
	onOpenChange: (open: boolean) => void;
	transaction: {
		id: string;
		amount: number;
		transactionDetails: string;
		merchant: { id: string; name: string } | null;
		category: { id: string; name: string } | null;
	} | null;
	onSplit: (transactionId: string, months: number) => void;
	isLoading?: boolean;
}

export function SplitTransactionDialog({
	open,
	onOpenChange,
	transaction,
	onSplit,
	isLoading = false,
}: SplitTransactionDialogProps) {
	const [months, setMonths] = useState(3);

	const monthsId = useId();

	const handleSubmit = (e: React.FormEvent) => {
		e.preventDefault();
		if (transaction && months >= 2 && months <= 60) {
			onSplit(transaction.id, months);
		}
	};

	const canSplit = transaction?.merchant && transaction?.category;

	const calculateSplitAmounts = (totalAmount: number, splitMonths: number) => {
		const absAmount = Math.abs(totalAmount);
		const baseAmount = Math.floor(absAmount / splitMonths);
		const remainder = absAmount % splitMonths;

		const amounts: number[] = [];
		for (let i = 0; i < splitMonths; i++) {
			const amount = baseAmount + (i < remainder ? 1 : 0);
			amounts.push(totalAmount < 0 ? -amount : amount);
		}
		return amounts;
	};

	if (!transaction) return null;

	const splitAmounts = calculateSplitAmounts(transaction.amount, months);

	return (
		<Dialog open={open} onOpenChange={onOpenChange}>
			<DialogContent className="sm:max-w-[500px]">
				<DialogHeader>
					<DialogTitle>Split Transaction</DialogTitle>
					<DialogDescription>
						Split this transaction across multiple months. Each split will be
						created on the 1st of each month.
					</DialogDescription>
				</DialogHeader>

				<form onSubmit={handleSubmit} className="space-y-4">
					<div className="space-y-2">
						<Label>Original Transaction</Label>
						<div className="p-3 bg-muted rounded-md">
							<div className="flex justify-between items-center">
								<span className="text-sm text-muted-foreground">
									{transaction.transactionDetails}
								</span>
								<CurrencyAmount amount={transaction.amount} showColor />
							</div>
						</div>
					</div>

					<div className="space-y-2">
						<Label htmlFor={monthsId}>Number of Months</Label>
						<Input
							id={monthsId}
							type="number"
							min="2"
							max="60"
							value={months}
							onChange={(e) => setMonths(Number(e.target.value))}
							disabled={isLoading}
						/>
						<p className="text-xs text-muted-foreground">
							Split between 2 and 60 months
						</p>
					</div>

					{months >= 2 && months <= 60 && (
						<div className="space-y-2">
							<Label>Split Preview</Label>
							<div className="space-y-1 max-h-40 overflow-y-auto">
								{splitAmounts.map((amount, index) => (
									<div
										key={`split-${index}-${amount}`}
										className="flex justify-between items-center p-2 bg-muted/50 rounded text-sm"
									>
										<span>Month {index + 1}</span>
										<CurrencyAmount amount={amount} showColor />
									</div>
								))}
							</div>
							<p className="text-xs text-muted-foreground">
								Total: <CurrencyAmount amount={transaction.amount} showColor />
							</p>
						</div>
					)}

					<DialogFooter>
						<Button
							type="button"
							variant="outline"
							onClick={() => onOpenChange(false)}
							disabled={isLoading}
						>
							Cancel
						</Button>
						<TooltipProvider>
							<Tooltip>
								<TooltipTrigger asChild>
									<Button
										type="submit"
										disabled={
											isLoading || months < 2 || months > 60 || !canSplit
										}
									>
										{isLoading ? "Splitting..." : "Split Transaction"}
									</Button>
								</TooltipTrigger>
								{!canSplit && (
									<TooltipContent>
										<p>
											Merchant and category must be assigned before splitting
										</p>
									</TooltipContent>
								)}
							</Tooltip>
						</TooltipProvider>
					</DialogFooter>
				</form>
			</DialogContent>
		</Dialog>
	);
}
