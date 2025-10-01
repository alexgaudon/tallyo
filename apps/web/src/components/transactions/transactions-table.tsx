import { format, parseISO } from "date-fns";
import { Check, Split, Trash } from "lucide-react";
import { useEffect, useRef, useState } from "react";
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
	splitTransaction: (args: { id: string; months: number }) => void;
	onCategoryClick?: (categoryId: string) => void;
	onMerchantClick?: (merchantId: string) => void;
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
	splitTransaction,
	onCategoryClick,
	onMerchantClick,
	isLoading = false,
}: TransactionsTableProps) {
	const { data: session } = useSession();
	const isDevMode = session?.settings?.isDevMode ?? false;

	const [localNotes, setLocalNotes] = useState<Record<string, string>>(() =>
		Object.fromEntries(transactions.map((t) => [t.id, t.notes ?? ""])),
	);

	// Dialog state
	const [editMerchantDialog, setEditMerchantDialog] = useState<{
		open: boolean;
		merchantId: string;
	}>({ open: false, merchantId: "" });

	const [editCategoryDialog, setEditCategoryDialog] = useState<{
		open: boolean;
		categoryId: string;
	}>({ open: false, categoryId: "" });

	const [createCategoryDialog, setCreateCategoryDialog] = useState(false);

	const [splitTransactionDialog, setSplitTransactionDialog] = useState<{
		open: boolean;
		transaction: {
			id: string;
			amount: number;
			transactionDetails: string;
			merchant: { id: string; name: string } | null;
			category: { id: string; name: string } | null;
		} | null;
	}>({ open: false, transaction: null });

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

	// Helper function to parse date and ensure correct local display
	// Helper function to check if transaction is upcoming (1-10 days in future)
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

	const parseTransactionDate = (dateValue: string | Date) => {
		let year: number;
		let month: number;
		let day: number;

		if (typeof dateValue === "string") {
			// Extract just the date part (YYYY-MM-DD) from any date string
			const dateMatch = dateValue.match(/^(\d{4})-(\d{2})-(\d{2})/);
			if (dateMatch) {
				year = Number.parseInt(dateMatch[1], 10);
				month = Number.parseInt(dateMatch[2], 10) - 1; // Month is 0-indexed
				day = Number.parseInt(dateMatch[3], 10);
			} else {
				// Fallback to parsing as ISO
				const date = parseISO(dateValue);
				year = date.getFullYear();
				month = date.getMonth();
				day = date.getDate();
			}
		} else {
			// If it's a Date object, extract the components
			year = dateValue.getFullYear();
			month = dateValue.getMonth();
			day = dateValue.getDate();
		}

		// Create a new date using the local date constructor (this ensures local time)
		const finalDate = new Date(year, month, day);

		return finalDate;
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
						<TableHead className="w-[120px] px-2 sm:px-4 text-center">
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
								<div className="flex items-center gap-2">
									{format(
										parseTransactionDate(transaction.date),
										"MMM d, yyyy",
									)}
									{isUpcomingTransaction(transaction.date) && (
										<TooltipProvider>
											<Tooltip>
												<TooltipTrigger asChild>
													<div className="w-2 h-2 bg-blue-500 rounded-full flex-shrink-0" />
												</TooltipTrigger>
												<TooltipContent>
													<p>Upcoming transaction</p>
												</TooltipContent>
											</Tooltip>
										</TooltipProvider>
									)}
								</div>
							</TableCell>
							<TableCell className="px-2 sm:px-4 h-10 align-middle">
								<div className="flex items-center h-full">
									{transaction.reviewed ? (
										transaction.merchant ? (
											<Button
												variant="ghost"
												size="sm"
												className="h-auto p-1 text-muted-foreground hover:text-foreground hover:bg-muted/50"
												onClick={() => {
													if (transaction.merchant) {
														onMerchantClick?.(transaction.merchant.id);
													}
												}}
											>
												{transaction.merchant.name}
											</Button>
										) : (
											<span className="text-muted-foreground truncate">
												No merchant
											</span>
										)
									) : (
										<div className="flex flex-col justify-center w-full">
											<MerchantSelect
												value={transaction.merchant?.id}
												onValueChange={(merchantId) =>
													updateMerchant({
														id: transaction.id,
														merchantId: merchantId,
													})
												}
												placeholder="Select merchant"
												className="min-w-[280px]"
												allowNull
												disabled={isLoading}
												transactionDetails={transaction.transactionDetails}
												onEditMerchant={(merchantId) => {
													setEditMerchantDialog({ open: true, merchantId });
												}}
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
										transaction.category ? (
											<Button
												variant="ghost"
												size="sm"
												className="h-auto p-1 text-muted-foreground hover:text-foreground hover:bg-muted/50"
												onClick={() => {
													if (transaction.category) {
														onCategoryClick?.(transaction.category.id);
													}
												}}
											>
												{formatCategory(transaction.category)}
											</Button>
										) : (
											<span className="text-muted-foreground truncate">
												No category
											</span>
										)
									) : (
										<CategorySelect
											value={transaction.category?.id}
											onValueChange={(categoryId) =>
												updateCategory({
													id: transaction.id,
													categoryId: categoryId,
												})
											}
											placeholder="Select category"
											className="w-full min-w-[180px] sm:min-w-[200px]"
											allowNull
											disabled={isLoading}
											onEditCategory={(categoryId) => {
												setEditCategoryDialog({ open: true, categoryId });
											}}
											onCreateCategory={() => {
												setCreateCategoryDialog(true);
											}}
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
								<CurrencyAmount
									amount={transaction.amount}
									showColor
									className="transition-colors"
								/>
							</TableCell>
							<TableCell className="text-center px-2 sm:px-4 h-10 align-middle">
								{renderReviewButton(transaction)}
							</TableCell>
							<TableCell className="text-center px-2 sm:px-4 h-10 align-middle">
								<div className="flex items-center justify-center gap-1">
									<TooltipProvider>
										<Tooltip>
											<TooltipTrigger asChild>
												<Button
													variant="ghost"
													size="icon"
													onClick={() =>
														setSplitTransactionDialog({
															open: true,
															transaction: {
																id: transaction.id,
																amount: transaction.amount,
																transactionDetails:
																	transaction.transactionDetails,
																merchant: transaction.merchant,
																category: transaction.category,
															},
														})
													}
													disabled={isLoading}
												>
													<Split className="h-4 w-4" />
												</Button>
											</TooltipTrigger>
											<TooltipContent>
												<p>Split transaction across months</p>
											</TooltipContent>
										</Tooltip>
									</TooltipProvider>

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
								</div>
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

			{/* Edit Merchant Dialog */}
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

			{/* Edit Category Dialog */}
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

			{/* Create Category Dialog */}
			<CreateCategoryDialog
				open={createCategoryDialog}
				onOpenChange={setCreateCategoryDialog}
				onSuccess={(categoryId) => {
					console.log("Category created:", categoryId);
				}}
			/>

			{/* Split Transaction Dialog */}
			<SplitTransactionDialog
				open={splitTransactionDialog.open}
				onOpenChange={(open) =>
					setSplitTransactionDialog({
						open,
						transaction: splitTransactionDialog.transaction,
					})
				}
				transaction={splitTransactionDialog.transaction}
				onSplit={(transactionId, months) => {
					splitTransaction({ id: transactionId, months });
					setSplitTransactionDialog({ open: false, transaction: null });
				}}
				isLoading={isLoading}
			/>
		</div>
	);
}
