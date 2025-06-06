import Search, { type SearchParams } from "@/components/transactions/search";
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
	category: z.string().optional(),
	filter: z.string().optional(),
	onlyUnreviewed: z.coerce.boolean().optional(),
	onlyWithoutPayee: z.coerce.boolean().optional(),
	onlyWithoutCategory: z.coerce.boolean().optional(),
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
						category: search.category,
						filter: search.filter,
						onlyUnreviewed: search.onlyUnreviewed,
						onlyWithoutPayee: search.onlyWithoutPayee,
						onlyWithoutCategory: search.onlyWithoutCategory,
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

	type TransactionData = Awaited<
		ReturnType<typeof orpc.transactions.getUserTransactions.call>
	>;

	const { data: transactionsData } = useQuery<TransactionData>(
		orpc.transactions.getUserTransactions.queryOptions({
			input: {
				page: search.page,
				pageSize: search.pageSize,
				category: search.category,
				filter: search.filter,
				onlyUnreviewed: search.onlyUnreviewed,
				onlyWithoutPayee: search.onlyWithoutPayee,
				onlyWithoutCategory: search.onlyWithoutCategory,
			},
		}),
	);

	// Prefetch next page
	useQuery(
		orpc.transactions.getUserTransactions.queryOptions({
			input: {
				page: search.page + 1,
				pageSize: search.pageSize,
				category: search.category,
				filter: search.filter,
				onlyUnreviewed: search.onlyUnreviewed,
				onlyWithoutPayee: search.onlyWithoutPayee,
				onlyWithoutCategory: search.onlyWithoutCategory,
			},
		}),
	);

	const { mutateAsync: updateCategory } = useMutation({
		mutationFn: orpc.transactions.updateTransactionCategory.call,
		onSettled: async () => {
			await queryClient.invalidateQueries(
				orpc.transactions.getUserTransactions.queryOptions({
					input: {
						page: search.page,
						pageSize: search.pageSize,
						category: search.category,
						filter: search.filter,
						onlyUnreviewed: search.onlyUnreviewed,
						onlyWithoutPayee: search.onlyWithoutPayee,
						onlyWithoutCategory: search.onlyWithoutCategory,
					},
				}),
			);
		},
	});

	const { mutateAsync: updateMerchant } = useMutation({
		mutationFn: orpc.transactions.updateTransactionMerchant.call,
		onSettled: async () => {
			await queryClient.invalidateQueries(
				orpc.transactions.getUserTransactions.queryOptions({
					input: {
						page: search.page,
						pageSize: search.pageSize,
						category: search.category,
						filter: search.filter,
						onlyUnreviewed: search.onlyUnreviewed,
						onlyWithoutPayee: search.onlyWithoutPayee,
						onlyWithoutCategory: search.onlyWithoutCategory,
					},
				}),
			);
		},
	});

	const { mutateAsync: updateNotes } = useMutation({
		mutationFn: orpc.transactions.updateTransactionNotes.call,
		onSettled: async () => {
			await queryClient.invalidateQueries(
				orpc.transactions.getUserTransactions.queryOptions({
					input: {
						page: search.page,
						pageSize: search.pageSize,
						category: search.category,
						filter: search.filter,
						onlyUnreviewed: search.onlyUnreviewed,
						onlyWithoutPayee: search.onlyWithoutPayee,
						onlyWithoutCategory: search.onlyWithoutCategory,
					},
				}),
			);
		},
	});

	const { mutateAsync: toggleReviewed } = useMutation({
		mutationFn: orpc.transactions.toggleTransactionReviewed.call,
		onSettled: async () => {
			await queryClient.invalidateQueries(
				orpc.transactions.getUserTransactions.queryOptions({
					input: {
						page: search.page,
						pageSize: search.pageSize,
						category: search.category,
						filter: search.filter,
						onlyUnreviewed: search.onlyUnreviewed,
						onlyWithoutPayee: search.onlyWithoutPayee,
						onlyWithoutCategory: search.onlyWithoutCategory,
					},
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

	const handleSearch = (searchParams: SearchParams) => {
		navigate({
			to: "/transactions",
			search: {
				page: 1,
				pageSize: search.pageSize,
				category: searchParams.category?.id,
				filter: searchParams.filter || undefined,
				onlyUnreviewed: searchParams.onlyUnreviewed || undefined,
				onlyWithoutPayee: searchParams.onlyWithoutPayee || undefined,
				onlyWithoutCategory: searchParams.onlyWithoutCategory || undefined,
			},
		});
	};

	return (
		<div className="container mx-auto p-6 space-y-6">
			<div className="flex items-center gap-2">
				<h1 className="text-2xl font-bold">Transactions</h1>
			</div>
			<Search
				searchFn={handleSearch}
				initialSearch={{
					filter: search.filter || "",
					category: search.category ? { id: search.category, name: "" } : null,
					onlyUnreviewed: search.onlyUnreviewed || false,
					onlyWithoutPayee: search.onlyWithoutPayee || false,
					onlyWithoutCategory: search.onlyWithoutCategory || false,
				}}
			/>
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
