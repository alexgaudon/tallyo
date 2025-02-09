import { TransactionTable } from "@/components/transactions/table";
import { ensureQueryData } from "@/repositories";
import { CategoryRepository } from "@/repositories/categories";
import { TransactionRepository } from "@/repositories/transactions";
import { useQuery } from "@tanstack/react-query";
import { createFileRoute, redirect, useNavigate } from "@tanstack/react-router";
import { z } from "zod";

const PAGE_SIZE = 10;

export const Route = createFileRoute("/categories/$category")({
  component: RouteComponent,
  validateSearch: z.object({
    page: z.number().default(1),
  }),
  beforeLoad: async (ctx) => {
    if (!ctx.context.auth.isAuthenticated) {
      throw redirect({ to: "/signin" });
    }

    await ensureQueryData(
      ctx.context.queryClient,
      CategoryRepository.getAllUserCategoriesQuery(),
      TransactionRepository.getAllUserTransactionsQuery({
        categoryName: ctx.params.category,
        pageSize: PAGE_SIZE,
        page: 1,
        unreviewed: false,
      }),
    );
  },
});

function RouteComponent() {
  const params = Route.useParams();
  const search = Route.useSearch();

  const { data } = useQuery(
    TransactionRepository.getAllUserTransactionsQuery({
      categoryName: params.category,
      pageSize: PAGE_SIZE,
      page: search.page,
      unreviewed: false,
    }),
  );

  const navigate = useNavigate();

  return (
    <div className="mx-4 w-full h-full">
      <TransactionTable
        data={data!.data}
        totalPages={data!.totalPages}
        currentPage={search.page}
        onPageChange={(page) => {
          navigate({
            to: "/categories/" + params.category,
            search: {
              ...search,
              page,
            },
          });
        }}
      />
    </div>
  );
}
