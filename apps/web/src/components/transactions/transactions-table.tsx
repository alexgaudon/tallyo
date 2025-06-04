import { CategorySelect } from "@/components/categories/category-select";
import { MerchantSelect } from "@/components/merchants/merchant-select";
import { Button } from "@/components/ui/button";
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
import { format } from "date-fns";
import { Check } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import type { Transaction } from "../../../../server/src/routers/index";

interface TransactionsTableProps {
	transactions: Transaction[];
	updateCategory: (args: { id: string; categoryId: string | null }) => void;
	updateMerchant: (args: { id: string; merchantId: string | null }) => void;
	updateNotes: (args: { id: string; notes: string }) => void;
	toggleReviewed: (args: { id: string }) => void;
}

export function TransactionsTable({
	transactions,
	updateCategory,
	updateMerchant,
	updateNotes,
	toggleReviewed,
}: TransactionsTableProps) {
	const { data: session } = useSession();
	const isDevMode = session?.settings?.isDevMode;

	const [localNotes, setLocalNotes] = useState<Record<string, string>>(() =>
		Object.fromEntries(transactions.map((t) => [t.id, t.notes ?? ""])),
	);

	const unsavedChanges = useRef<Record<string, string>>({});
	const updateNotesRef = useRef(updateNotes);
	const transactionsRef = useRef(transactions);

	useEffect(() => {
		updateNotesRef.current = updateNotes;
		transactionsRef.current = transactions;
	}, [updateNotes, transactions]);

	useEffect(() => {
		const handleBeforeUnload = (e: BeforeUnloadEvent) => {
			for (const [id, value] of Object.entries(unsavedChanges.current)) {
				const transaction = transactionsRef.current.find((t) => t.id === id);
				if (transaction?.notes !== value) {
					updateNotesRef.current({ id, notes: value });
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

	const renderReviewButton = (transaction: Transaction) => (
		<TooltipProvider>
			<Tooltip>
				<TooltipTrigger asChild>
					<Button
						variant="ghost"
						size="icon"
						onClick={() => toggleReviewed({ id: transaction.id })}
						className={
							transaction.reviewed ? "text-green-600" : "text-muted-foreground"
						}
						disabled={
							!transaction.reviewed &&
							(!transaction.category || !transaction.merchant)
						}
					>
						<Check className="h-4 w-4" />
					</Button>
				</TooltipTrigger>
				{!transaction.reviewed &&
					(!transaction.category || !transaction.merchant) && (
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
	);

	return (
		<Table>
			<TableHeader>
				<TableRow>
					{isDevMode && <TableHead>ID</TableHead>}
					<TableHead>Date</TableHead>
					<TableHead>Merchant</TableHead>
					<TableHead>Category</TableHead>
					<TableHead>Details</TableHead>
					<TableHead>Notes</TableHead>
					<TableHead className="text-right">Amount</TableHead>
					<TableHead className="text-center">Reviewed</TableHead>
				</TableRow>
			</TableHeader>
			<TableBody>
				{transactions.map((transaction) => (
					<TableRow key={transaction.id}>
						{isDevMode && (
							<TableCell className="font-mono text-xs text-muted-foreground">
								{transaction.id}
							</TableCell>
						)}
						<TableCell>
							{format(new Date(transaction.date), "MMM d, yyyy")}
						</TableCell>
						<TableCell>
							{transaction.reviewed ? (
								<span className="text-muted-foreground">
									{transaction.merchant?.name ?? "No merchant"}
								</span>
							) : (
								<MerchantSelect
									value={transaction.merchant?.id}
									onValueChange={(merchantId) =>
										updateMerchant({
											id: transaction.id,
											merchantId: merchantId === "__null__" ? null : merchantId,
										})
									}
									placeholder="Select merchant"
									className="w-[200px]"
									allowNull
								/>
							)}
						</TableCell>
						<TableCell>
							{transaction.reviewed ? (
								<span className="text-muted-foreground">
									{transaction.category?.name ?? "No category"}
								</span>
							) : (
								<CategorySelect
									value={transaction.category?.id}
									onValueChange={(categoryId) =>
										updateCategory({
											id: transaction.id,
											categoryId: categoryId === "__null__" ? null : categoryId,
										})
									}
									placeholder="Select category"
									className="w-[200px]"
									allowNull
								/>
							)}
						</TableCell>
						<TableCell>
							{transaction.reviewed ? (
								<span className="text-muted-foreground italic">
									Hidden after review
								</span>
							) : (
								<span>{transaction.transactionDetails}</span>
							)}
						</TableCell>
						<TableCell>
							<input
								type="text"
								value={localNotes[transaction.id] ?? ""}
								onChange={(e) =>
									handleNoteChange(transaction.id, e.target.value)
								}
								onBlur={(e) => handleNoteBlur(transaction.id, e.target.value)}
								placeholder="Add notes..."
								className="w-full border rounded px-2 py-1 text-sm bg-background"
							/>
						</TableCell>
						<TableCell className="text-right">
							<span
								className={
									transaction.amount < 0 ? "text-red-600" : "text-green-600"
								}
							>
								${Math.abs(transaction.amount / 100).toFixed(2)}
							</span>
						</TableCell>
						<TableCell className="text-center">
							{renderReviewButton(transaction)}
						</TableCell>
					</TableRow>
				))}
			</TableBody>
		</Table>
	);
}
