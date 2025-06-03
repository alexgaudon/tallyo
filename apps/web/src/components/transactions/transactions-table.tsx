import { CategorySelect } from "@/components/categories/category-select";
import {
	Table,
	TableBody,
	TableCell,
	TableHead,
	TableHeader,
	TableRow,
} from "@/components/ui/table";
import { useSession } from "@/lib/auth-client";
import { format } from "date-fns";
import type { Transaction } from "../../../../server/src/routers/index";

interface TransactionsTableProps {
	transactions: Transaction[];
	updateCategory: (args: { id: string; categoryId: string | null }) => void;
}

export function TransactionsTable({
	transactions,
	updateCategory,
}: TransactionsTableProps) {
	const { data: session } = useSession();
	const isDevMode = session?.settings?.isDevMode;

	return (
		<Table>
			<TableHeader>
				<TableRow>
					{isDevMode && <TableHead>ID</TableHead>}
					<TableHead>Date</TableHead>
					<TableHead>Merchant</TableHead>
					<TableHead>Category</TableHead>
					<TableHead>Details</TableHead>
					<TableHead className="text-right">Amount</TableHead>
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
						<TableCell>{transaction.merchant?.name || "Unknown"}</TableCell>
						<TableCell>
							<CategorySelect
								value={transaction.category?.id}
								onValueChange={(categoryId) =>
									updateCategory({
										id: transaction.id,
										categoryId: categoryId || null,
									})
								}
								placeholder="Select category"
								className="w-[200px]"
								allowNull
							/>
						</TableCell>
						<TableCell>{transaction.transactionDetails}</TableCell>
						<TableCell className="text-right">
							<span
								className={
									transaction.amount < 0 ? "text-red-600" : "text-green-600"
								}
							>
								${Math.abs(transaction.amount / 100).toFixed(2)}
							</span>
						</TableCell>
					</TableRow>
				))}
			</TableBody>
		</Table>
	);
}
