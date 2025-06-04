import { TransactionsTable } from "@/components/transactions/transactions-table";
import { orpc } from "@/utils/orpc";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
	createFileRoute,
	useNavigate,
	useSearch,
} from "@tanstack/react-router";
import { z } from "zod";
import type { RouterAppContext } from "./__root";

const searchSchema = z.object({
	page: z.coerce.number().int().min(1).default(1),
	pageSize: z.coerce.number().int().min(1).max(100).default(25),
});

type SearchParams = z.infer<typeof searchSchema>;

export const Route = createFileRoute("/transactions")({
	validateSearch: searchSchema,
	beforeLoad: async ({
		context,
		search,
	}: {
		context: RouterAppContext & { isAuthenticated: boolean };
		search: SearchParams;
	}) => {
		const { isAuthenticated } = context;
		if (!isAuthenticated) {
			throw new Error("Not authenticated");
		}

		await Promise.all([
			context.queryClient.prefetchQuery(
				orpc.categories.getUserCategories.queryOptions(),
			),
			context.queryClient.prefetchQuery(
				orpc.merchants.getUserMerchants.queryOptions(),
			),
			context.queryClient.prefetchQuery(
				orpc.transactions.getUserTransactions.queryOptions({
					input: { page: search.page, pageSize: search.pageSize },
				}),
			),
		]);
	},
	component: RouteComponent,
});

function RouteComponent() {
	const navigate = useNavigate();
	const search = useSearch({ from: "/transactions" });
	const queryClient = useQueryClient();

	type TransactionData = Awaited<
		ReturnType<typeof orpc.transactions.getUserTransactions.call>
	>;

	type Transaction = TransactionData["transactions"][number];

	const { data: transactionsData, isLoading: isLoadingTransactions } =
		useQuery<TransactionData>(
			orpc.transactions.getUserTransactions.queryOptions({
				input: { page: search.page, pageSize: search.pageSize },
			}),
		);

	useQuery(
		orpc.transactions.getUserTransactions.queryOptions({
			input: {
				page: search.page + 1,
				pageSize: search.pageSize,
			},
		}),
	);

	const { mutateAsync: updateCategory } = useMutation({
		mutationFn: orpc.transactions.updateTransactionCategory.call,
		onSettled: async (data, error, input) => {
			await queryClient.invalidateQueries(
				orpc.transactions.getUserTransactions.queryOptions({
					input: { page: search.page, pageSize: search.pageSize },
				}),
			);
		},
	});

	const { mutateAsync: updateMerchant } = useMutation({
		mutationFn: orpc.transactions.updateTransactionMerchant.call,
		onSettled: async (data, error, input) => {
			await queryClient.invalidateQueries(
				orpc.transactions.getUserTransactions.queryOptions({
					input: { page: search.page, pageSize: search.pageSize },
				}),
			);
		},
	});

	const { mutateAsync: updateNotes } = useMutation({
		mutationFn: orpc.transactions.updateTransactionNotes.call,
		onSettled: async (data, error, input) => {
			await queryClient.invalidateQueries(
				orpc.transactions.getUserTransactions.queryOptions({
					input: { page: search.page, pageSize: search.pageSize },
				}),
			);
		},
	});

	const { mutateAsync: toggleReviewed } = useMutation({
		mutationFn: orpc.transactions.toggleTransactionReviewed.call,
		onSettled: async (data, error, input) => {
			await queryClient.invalidateQueries(
				orpc.transactions.getUserTransactions.queryOptions({
					input: { page: search.page, pageSize: search.pageSize },
				}),
			);
		},
	});

	const handlePageChange = (page: number) => {
		navigate({
			to: "/transactions",
			search: (prev) => ({ ...prev, page }),
		});
	};

	const handlePageSizeChange = (pageSize: number) => {
		navigate({
			to: "/transactions",
			search: { ...search, pageSize, page: 1 },
		});
	};

	return (
		<div className="container mx-auto p-6 space-y-6">
			<div className="flex items-center gap-2">
				<h1 className="text-2xl font-bold">Transactions</h1>
			</div>
			<TransactionsTable
				transactions={transactionsData?.transactions ?? []}
				pagination={{
					total: transactionsData?.pagination.total ?? 0,
					page: transactionsData?.pagination.page ?? 1,
					pageSize: transactionsData?.pagination.pageSize ?? 25,
					totalPages: transactionsData?.pagination.totalPages ?? 1,
				}}
				onPageChange={handlePageChange}
				onPageSizeChange={handlePageSizeChange}
				updateCategory={updateCategory}
				updateMerchant={updateMerchant}
				updateNotes={updateNotes}
				toggleReviewed={toggleReviewed}
				isLoading={false}
			/>
		</div>
	);
}
