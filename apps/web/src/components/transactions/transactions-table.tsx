import {
	CategorySelect,
	formatCategory,
} from "@/components/categories/category-select";
import { MerchantSelect } from "@/components/merchants/merchant-select";
import { Button } from "@/components/ui/button";
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
import { format } from "date-fns";
import { Check, Trash } from "lucide-react";
import { useEffect, useRef, useState } from "react";
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
	isLoading?: boolean;
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
	isLoading = false,
}: TransactionsTableProps) {
	const { data: session } = useSession();
	const isDevMode = session?.settings?.isDevMode ?? false;

	const [localNotes, setLocalNotes] = useState<Record<string, string>>(() =>
		Object.fromEntries(transactions.map((t) => [t.id, t.notes ?? ""])),
	);

	const unsavedChanges = useRef<Record<string, string>>({});
	const updateNotesRef = useRef(updateNotes);
	const transactionsRef = useRef(transactions);

	// Update refs when props change
	useEffect(() => {
		updateNotesRef.current = updateNotes;
		transactionsRef.current = transactions;
	}, [updateNotes, transactions]);

	// Handle unsaved changes before unload
	useEffect(() => {
		const handleBeforeUnload = (e: BeforeUnloadEvent) => {
			const hasUnsavedChanges = Object.keys(unsavedChanges.current).length > 0;
			if (hasUnsavedChanges) {
				e.preventDefault();

				// Try to save changes before unload
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

	// Sync notes with server data
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

	const renderReviewButton = (transaction: Transaction) => {
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

		return (
			<TooltipProvider>
				<Tooltip>
					<TooltipTrigger asChild>
						<Button
							variant="ghost"
							size="icon"
							onClick={() => toggleReviewed({ id: transaction.id })}
							className={cn(
								"transition-colors",
								transaction.reviewed
									? "text-green-600"
									: "text-muted-foreground",
							)}
							disabled={isDisabled}
						>
							<Check className="h-4 w-4" />
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

	return (
		<div>
			<Table>
				<TableHeader>
					<TableRow className="hover:bg-muted/50">
						{isDevMode && (
							<TableHead className="w-[80px] px-2 sm:px-4">ID</TableHead>
						)}
						<TableHead className="w-[100px] px-2 sm:px-4">Date</TableHead>
						<TableHead className="min-w-fit px-2 sm:px-4">Merchant</TableHead>
						<TableHead className="min-w-[120px] sm:min-w-[150px] px-2 sm:px-4">
							Category
						</TableHead>
						<TableHead className="px-2 sm:px-4 min-w-[200px]">Notes</TableHead>
						<TableHead className="w-[100px] px-2 sm:px-4 text-right">
							Amount
						</TableHead>
						<TableHead className="w-[80px] px-2 sm:px-4 text-center">
							Reviewed
						</TableHead>
						<TableHead className="w-[80px] px-2 sm:px-4 text-center">
							Actions
						</TableHead>
					</TableRow>
				</TableHeader>
				<TableBody>
					{transactions.map((transaction) => (
						<TableRow
							key={transaction.id}
							className={cn(
								"hover:bg-muted/50 transition-colors",
								isLoading && "opacity-50",
							)}
						>
							{isDevMode && (
								<TableCell className="font-mono text-xs text-muted-foreground px-2 sm:px-4 h-10 align-middle">
									{transaction.id}
								</TableCell>
							)}
							<TableCell className="whitespace-nowrap px-2 sm:px-4 h-10 align-middle">
								{format(new Date(transaction.date), "MMM d, yyyy")}
							</TableCell>
							<TableCell className="px-2 sm:px-4 h-10 align-middle">
								<div className="flex items-center h-full">
									{transaction.reviewed ? (
										<span className="text-muted-foreground truncate">
											{transaction.merchant?.name ?? "No merchant"}
										</span>
									) : (
										<div className="flex flex-col justify-center w-full">
											<MerchantSelect
												value={transaction.merchant?.id}
												onValueChange={(merchantId) =>
													updateMerchant({
														id: transaction.id,
														merchantId:
															merchantId === "__null__" ? null : merchantId,
													})
												}
												placeholder="Select merchant"
												className="min-w-[280px]"
												allowNull
												disabled={isLoading}
												transactionDetails={transaction.transactionDetails}
											/>
											<p className="text-xs text-muted-foreground truncate">
												{transaction.transactionDetails}
											</p>
										</div>
									)}
								</div>
							</TableCell>
							<TableCell className="px-2 sm:px-4 h-10 align-middle">
								<div className="flex items-center h-full">
									{transaction.reviewed ? (
										<span className="text-muted-foreground truncate">
											{transaction.category
												? formatCategory(transaction.category)
												: "No category"}
										</span>
									) : (
										<CategorySelect
											value={transaction.category?.id}
											onValueChange={(categoryId) =>
												updateCategory({
													id: transaction.id,
													categoryId:
														categoryId === "__null__" ? null : categoryId,
												})
											}
											placeholder="Select category"
											className="w-full min-w-[180px] sm:min-w-[200px]"
											allowNull
											disabled={isLoading}
										/>
									)}
								</div>
							</TableCell>
							<TableCell className="px-2 sm:px-4 h-10 align-middle">
								<input
									type="text"
									value={localNotes[transaction.id] ?? ""}
									onChange={(e) =>
										handleNoteChange(transaction.id, e.target.value)
									}
									onBlur={(e) => handleNoteBlur(transaction.id, e.target.value)}
									placeholder="Add notes..."
									className={cn(
										"w-full border rounded px-2 h-7 text-sm bg-background",
										"focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2",
										"disabled:opacity-50 disabled:cursor-not-allowed",
										"transition-colors",
									)}
									disabled={isLoading}
								/>
							</TableCell>
							<TableCell className="text-right font-medium px-2 sm:px-4 h-10 align-middle">
								<span
									className={cn(
										"transition-colors",
										transaction.amount < 0 ? "text-red-600" : "text-green-600",
									)}
								>
									${Math.abs(transaction.amount / 100).toFixed(2)}
								</span>
							</TableCell>
							<TableCell className="text-center px-2 sm:px-4 h-10 align-middle">
								{renderReviewButton(transaction)}
							</TableCell>
							<TableCell className="text-center px-2 sm:px-4 h-10 align-middle">
								<AlertDialog>
									<AlertDialogTrigger asChild>
										<Button variant="ghost" size="icon">
											<Trash className="h-4 w-4" />
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
													deleteTransaction({ id: transaction.id })
												}
											>
												Delete
											</AlertDialogAction>
										</AlertDialogFooter>
									</AlertDialogContent>
								</AlertDialog>
							</TableCell>
						</TableRow>
					))}
				</TableBody>
			</Table>
			<Paginator
				pagination={pagination}
				onPageChange={onPageChange}
				onPageSizeChange={onPageSizeChange}
				isLoading={isLoading}
			/>
		</div>
	);
}
