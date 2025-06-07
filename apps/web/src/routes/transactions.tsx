import { Search } from "@/components/transactions/search";
import { TransactionsTable } from "@/components/transactions/transactions-table";
import { ensureSession } from "@/lib/auth-client";
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
	pageSize: z.coerce.number().int().min(1).max(100).default(10),
	filter: z.string().optional(),
	category: z.string().optional(),
});

export const Route = createFileRoute("/transactions")({
	validateSearch: searchSchema,
	beforeLoad: async ({
		context,
		search,
	}: {
		context: RouterAppContext & { isAuthenticated: boolean };
		search: z.infer<typeof searchSchema>;
	}) => {
		ensureSession(context.isAuthenticated, "/transactions");

		await Promise.all([
			context.queryClient.prefetchQuery(
				orpc.categories.getUserCategories.queryOptions(),
			),
			context.queryClient.prefetchQuery(
				orpc.merchants.getUserMerchants.queryOptions(),
			),
			context.queryClient.prefetchQuery(
				orpc.transactions.getUserTransactions.queryOptions({
					input: {
						page: search.page,
						pageSize: search.pageSize,
						filter: search.filter,
						category: search.category,
					},
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

	const { data: transactionsData } = useQuery(
		orpc.transactions.getUserTransactions.queryOptions({
			keepPreviousData: true,
			input: {
				page: search.page,
				pageSize: search.pageSize,
				filter: search.filter,
				category: search.category,
			},
		}),
	);

	// Prefetch next page
	useQuery({
		...orpc.transactions.getUserTransactions.queryOptions({
			input: {
				page: search.page + 1,
				pageSize: search.pageSize,
				category: search.category,
				filter: search.filter,
			},
		}),
		staleTime: 1000 * 60, // Keep data fresh for 1 minute
	});

	const { mutateAsync: updateCategory } = useMutation(
		orpc.transactions.updateTransactionCategory.mutationOptions({
			onSettled: async () => {
				await queryClient.invalidateQueries(
					orpc.transactions.getUserTransactions.queryOptions({
						input: {
							page: search.page,
							pageSize: search.pageSize,
							category: search.category,
							filter: search.filter,
						},
					}),
				);
			},
		}),
	);

	const { mutateAsync: updateMerchant } = useMutation(
		orpc.transactions.updateTransactionMerchant.mutationOptions({
			onSettled: async () => {
				await queryClient.invalidateQueries(
					orpc.transactions.getUserTransactions.queryOptions({
						input: {
							page: search.page,
							pageSize: search.pageSize,
							category: search.category,
							filter: search.filter,
						},
					}),
				);
			},
		}),
	);

	const { mutateAsync: updateNotes } = useMutation(
		orpc.transactions.updateTransactionNotes.mutationOptions({
			onSettled: async () => {
				await queryClient.invalidateQueries(
					orpc.transactions.getUserTransactions.queryOptions({
						input: {
							page: search.page,
							pageSize: search.pageSize,
							category: search.category,
							filter: search.filter,
						},
					}),
				);
			},
		}),
	);

	const { mutateAsync: toggleReviewed } = useMutation(
		orpc.transactions.toggleTransactionReviewed.mutationOptions({
			onSettled: async () => {
				await queryClient.invalidateQueries(
					orpc.transactions.getUserTransactions.queryOptions({
						input: {
							page: search.page,
							pageSize: search.pageSize,
							category: search.category,
							filter: search.filter,
						},
					}),
				);
			},
		}),
	);

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
			<Search />
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
