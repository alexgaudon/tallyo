import { usePrivacyMode } from "@/components/toggle-privacy-mode";
import AdvancedSearch from "@/components/transactions/advanced-search";
import { CreateTransactionForm } from "@/components/transactions/create-transaction-form";
import { TransactionTable } from "@/components/transactions/table";
import { Button } from "@/components/ui/button";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { ensureQueryData } from "@/repositories";
import { CategoryRepository } from "@/repositories/categories";
import { TransactionRepository } from "@/repositories/transactions";
import { keepPreviousData, useQuery } from "@tanstack/react-query";
import { createFileRoute, redirect, useNavigate } from "@tanstack/react-router";
import { EyeIcon, EyeOffIcon } from "lucide-react";
import { z } from "zod";

const searchSchema = z.object({
  unreviewed: z.boolean().optional(),
  categoryName: z.string().optional(),
  filter: z.string().optional(),
  page: z.number().default(1),
});

const PAGE_SIZE = 10;

export const Route = createFileRoute("/transactions")({
  component: RouteComponent,
  validateSearch: searchSchema,
  beforeLoad: async (ctx) => {
    if (!ctx.context.auth.isAuthenticated) {
      throw redirect({
        to: "/signin",
      });
    }

    const search = ctx.search;

    await ensureQueryData(
      ctx.context.queryClient,
      TransactionRepository.getAllUserTransactionsQuery({
        ...search,
        pageSize: PAGE_SIZE,
      }),
      CategoryRepository.getAllUserCategoriesQuery()
    );
  },
});

function RouteComponent() {
  const search = Route.useSearch();

  const navigate = useNavigate();

  const { isPrivacyMode, togglePrivacyMode } = usePrivacyMode();

  const params = {
    page: search.page,
    pageSize: PAGE_SIZE,
    filter: search.filter ?? undefined,
    unreviewed: search.unreviewed ?? false,
    categoryName: search.categoryName,
  };

  const { data, isLoading } = useQuery({
    placeholderData: keepPreviousData,
    ...TransactionRepository.getAllUserTransactionsQuery(params),
  });

  // do this to cache the next page, just so it'll load faster
  useQuery({
    ...TransactionRepository.getAllUserTransactionsQuery({
      ...params,
      page: params.page + 1,
    }),
  });

  if (isLoading) {
    return null;
  }

  const tableControls = [
    <TooltipProvider key="tooltip">
      <Tooltip>
        <TooltipTrigger asChild>
          <CreateTransactionForm />
        </TooltipTrigger>
        <TooltipContent>
          <p>Create a new transaction</p>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>,
    <div className="float-right ml-2" key="privacyMode">
      <Button
        variant="ghost"
        onClick={() => {
          togglePrivacyMode();
        }}
      >
        {isPrivacyMode ? <EyeOffIcon /> : <EyeIcon />}
      </Button>
    </div>,
  ];

  return (
    <div className="w-full">
      <div className="sm:block md:flex items-center gap-x-2 mx-4 py-4">
        <AdvancedSearch
          selectedCategory={search.categoryName}
          onlyUnreviewed={search.unreviewed ?? false}
        />
      </div>
      <div className="mx-4">
        <div className="flex items-center space-x-2 py-2">
          {...tableControls}
        </div>
        <TransactionTable
          data={data!.data}
          totalPages={data!.totalPages}
          currentPage={search.page}
          onPageChange={(page) => {
            navigate({
              to: "/transactions",
              search: {
                ...search,
                page,
              },
            });
          }}
        />
      </div>
    </div>
  );
}
