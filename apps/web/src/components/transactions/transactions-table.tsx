import { CategorySelect } from "@/components/categories/category-select";
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
import { format } from "date-fns";
import { Check } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import type { Transaction } from "../../../../server/src/routers/index";

interface TransactionsTableProps {
	transactions: Transaction[];
	pagination: PaginationInfo;
	onPageChange: (page: number) => void;
	onPageSizeChange: (pageSize: number) => void;
	updateCategory: (args: { id: string; categoryId: string | null }) => void;
	updateMerchant: (args: { id: string; merchantId: string | null }) => void;
	updateNotes: (args: { id: string; notes: string }) => void;
	toggleReviewed: (args: { id: string }) => void;
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
	isLoading = false,
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
							(!transaction.reviewed &&
								(!transaction.category || !transaction.merchant)) ||
							isLoading
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
		<div className="rounded-md border">
			<Table>
				<TableHeader>
					<TableRow className="hover:bg-muted/50">
						{isDevMode && <TableHead className="w-[100px] px-4">ID</TableHead>}
						<TableHead className="w-[120px] px-4">Date</TableHead>
						<TableHead className="min-w-[250px] px-4">Merchant</TableHead>
						<TableHead className="min-w-[200px] px-4">Category</TableHead>
						<TableHead className="px-4">Notes</TableHead>
						<TableHead className="w-[120px] px-4 text-right">Amount</TableHead>
						<TableHead className="w-[100px] px-4 text-center">
							Reviewed
						</TableHead>
					</TableRow>
				</TableHeader>
				<TableBody>
					{transactions.map((transaction) => (
						<TableRow
							key={transaction.id}
							className="hover:bg-muted/50 transition-colors"
						>
							{isDevMode && (
								<TableCell className="font-mono text-xs text-muted-foreground px-4 py-3">
									{transaction.id}
								</TableCell>
							)}
							<TableCell className="whitespace-nowrap px-4 py-3">
								{format(new Date(transaction.date), "MMM d, yyyy")}
							</TableCell>
							<TableCell className="px-4 py-3">
								<div className="flex flex-col gap-1.5">
									{transaction.reviewed ? (
										<span className="text-muted-foreground">
											{transaction.merchant?.name ?? "No merchant"}
										</span>
									) : (
										<>
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
												className="w-[200px]"
												allowNull
												disabled={isLoading}
											/>
											<span className="text-sm text-muted-foreground">
												{transaction.transactionDetails}
											</span>
										</>
									)}
								</div>
							</TableCell>
							<TableCell className="px-4 py-3">
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
												categoryId:
													categoryId === "__null__" ? null : categoryId,
											})
										}
										placeholder="Select category"
										className="w-[200px]"
										allowNull
										disabled={isLoading}
									/>
								)}
							</TableCell>
							<TableCell className="px-4 py-3">
								<input
									type="text"
									value={localNotes[transaction.id] ?? ""}
									onChange={(e) =>
										handleNoteChange(transaction.id, e.target.value)
									}
									onBlur={(e) => handleNoteBlur(transaction.id, e.target.value)}
									placeholder="Add notes..."
									className="w-full border rounded px-2 py-1.5 text-sm bg-background focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed"
									disabled={isLoading}
								/>
							</TableCell>
							<TableCell className="text-right font-medium px-4 py-3">
								<span
									className={
										transaction.amount < 0 ? "text-red-600" : "text-green-600"
									}
								>
									${Math.abs(transaction.amount / 100).toFixed(2)}
								</span>
							</TableCell>
							<TableCell className="text-center px-4 py-3">
								{renderReviewButton(transaction)}
							</TableCell>
						</TableRow>
					))}
				</TableBody>
			</Table>
			<div className="border-t px-4">
				<Paginator
					pagination={pagination}
					onPageChange={onPageChange}
					onPageSizeChange={onPageSizeChange}
					isLoading={isLoading}
				/>
			</div>
		</div>
	);
}
