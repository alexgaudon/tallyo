import { CategorySelect } from "@/components/categories/category-select";
import {
	Table,
	TableBody,
	TableCell,
	TableHead,
	TableHeader,
	TableRow,
} from "@/components/ui/table";
import { ensureSession } from "@/lib/auth-client";
import { orpc, queryClient } from "@/utils/orpc";
import { useMutation, useQuery } from "@tanstack/react-query";
import { createFileRoute } from "@tanstack/react-router";
import { format } from "date-fns";

export const Route = createFileRoute("/transactions")({
	component: RouteComponent,
	beforeLoad: async ({ context }) => {
		ensureSession(context.isAuthenticated, "/transactions");
		await context.queryClient.ensureQueryData(
			orpc.categories.getUserCategories.queryOptions(),
		);

		await context.queryClient.ensureQueryData(
			orpc.transactions.getUserTransactions.queryOptions(),
		);
	},
});

function RouteComponent() {
	const { data: transactions } = useQuery(
		orpc.transactions.getUserTransactions.queryOptions(),
	);

	const { mutate: updateCategory } = useMutation({
		mutationFn: orpc.transactions.updateTransactionCategory.call,
		onSuccess: () => {
			queryClient.invalidateQueries({
				queryKey: orpc.transactions.getUserTransactions.queryOptions().queryKey,
			});
		},
	});

	if (!transactions) {
		return <div>Loading...</div>;
	}

	return (
		<div className="container mx-auto py-10">
			<h1 className="text-2xl font-bold mb-6">Transactions</h1>
			<div className="rounded-md border">
				<Table>
					<TableHeader>
						<TableRow>
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
			</div>
		</div>
	);
}
