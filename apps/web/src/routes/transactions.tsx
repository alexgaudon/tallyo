import { TransactionsTable } from "@/components/transactions/transactions-table";
import { ensureSession } from "@/lib/auth-client";
import { orpc, queryClient } from "@/utils/orpc";
import { useMutation, useQuery } from "@tanstack/react-query";
import { createFileRoute } from "@tanstack/react-router";

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

		await context.queryClient.ensureQueryData(
			orpc.merchants.getUserMerchants.queryOptions(),
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

	const { mutate: updateMerchant } = useMutation({
		mutationFn: orpc.transactions.updateTransactionMerchant.call,
		onSuccess: () => {
			queryClient.invalidateQueries({
				queryKey: orpc.transactions.getUserTransactions.queryOptions().queryKey,
			});
		},
	});

	const { mutate: toggleReviewed } = useMutation({
		mutationFn: orpc.transactions.toggleTransactionReviewed.call,
		onSuccess: () => {
			queryClient.invalidateQueries({
				queryKey: orpc.transactions.getUserTransactions.queryOptions().queryKey,
			});
		},
	});

	const { mutate: updateNotes } = useMutation({
		mutationFn: orpc.transactions.updateTransactionNotes.call,
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
				<TransactionsTable
					transactions={transactions}
					updateCategory={updateCategory}
					updateMerchant={updateMerchant}
					toggleReviewed={toggleReviewed}
					updateNotes={updateNotes}
				/>
			</div>
		</div>
	);
}
