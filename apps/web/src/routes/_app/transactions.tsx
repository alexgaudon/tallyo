import { useQuery, useQueryClient } from "@tanstack/react-query";
import {
  createFileRoute,
  useNavigate,
  useRouter,
  useSearch,
} from "@tanstack/react-router";
import { Plus } from "lucide-react";
import { useEffect, useState } from "react";
import { z } from "zod";
import { CreateCategoryDialog } from "@/components/categories/create-category-dialog";
import { EditCategoryDialog } from "@/components/categories/edit-category-dialog";
import { PageHeader } from "@/components/layout/page-header";
import { EditMerchantDialog } from "@/components/merchants/edit-merchant-dialog";
import { CreateTransactionForm } from "@/components/transactions/create-transaction-form";
import { ReviewCard } from "@/components/transactions/review-card";
import { SplitTransactionDialog } from "@/components/transactions/split-transaction-dialog";
import { TransactionList } from "@/components/transactions/transaction-list";
import { ViewControls } from "@/components/transactions/view-controls";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { EntityPickerProvider } from "@/components/ui/entity-picker-sheet";
import { type PaginationInfo, Paginator } from "@/components/ui/paginator";
import { Panel } from "@/components/ui/panel";
import {
  type LedgerTransaction,
  useTransactionMutations,
} from "@/hooks/use-transaction-mutations";
import {
  hasActiveViewFilters,
  viewQueryOptions,
  viewSearchSchema,
} from "@/lib/transaction-view";
import { orpc } from "@/utils/orpc";

const ledgerSearchSchema = viewSearchSchema.extend({
  // UI-only affordance that opens the create dialog. It is not part of the
  // transaction view, so it is excluded from the loader deps below.
  create: z.boolean().optional(),
});

export const Route = createFileRoute("/_app/transactions")({
  validateSearch: ledgerSearchSchema,
  loaderDeps: ({ search }) => {
    const { create: _create, ...view } = search;
    return view;
  },
  loader: ({ context: { queryClient }, deps }) =>
    queryClient.ensureQueryData(viewQueryOptions(deps)),
  component: RouteComponent,
});

function RouteComponent() {
  const navigate = useNavigate();
  const router = useRouter();
  const queryClient = useQueryClient();
  const search = useSearch({ from: "/_app/transactions" });

  const { data } = useQuery(viewQueryOptions(search));
  const mutations = useTransactionMutations(search);

  const [isCreateFormOpen, setIsCreateFormOpen] = useState(false);
  const [editMerchant, setEditMerchant] = useState<{
    open: boolean;
    merchantId: string;
  }>({ open: false, merchantId: "" });
  const [editCategory, setEditCategory] = useState<{
    open: boolean;
    categoryId: string;
  }>({ open: false, categoryId: "" });
  const [createCategoryOpen, setCreateCategoryOpen] = useState(false);
  const [splitDialog, setSplitDialog] = useState<{
    open: boolean;
    transaction: LedgerTransaction | null;
  }>({ open: false, transaction: null });

  const transactions = data?.transactions ?? [];
  const pagination: PaginationInfo = data?.pagination ?? {
    total: 0,
    page: search.page,
    pageSize: search.pageSize,
    totalPages: 1,
  };

  const reviewing = search.review === "unreviewed";
  const viewKey = viewQueryOptions(search).queryKey;

  useEffect(() => {
    if (search.create) {
      setIsCreateFormOpen(true);
      navigate({
        to: "/transactions",
        search: (prev) => ({ ...prev, create: undefined }),
        replace: true,
      });
    }
  }, [search.create, navigate]);

  const goToPage = (page: number) => {
    navigate({
      to: "/transactions",
      search: (prev) => ({ ...prev, page }),
    });
  };

  const changePageSize = (pageSize: number) => {
    navigate({
      to: "/transactions",
      search: (prev) => ({ ...prev, pageSize, page: 1 }),
    });
  };

  const handleCategoryClick = (categoryId: string) => {
    navigate({
      to: "/transactions",
      search: (prev) => ({ ...prev, categories: [categoryId], page: 1 }),
    });
  };

  const handleMerchantClick = (merchantId: string) => {
    navigate({
      to: "/transactions",
      search: (prev) => ({ ...prev, merchants: [merchantId], page: 1 }),
    });
  };

  const handleCreateSuccess = () => {
    queryClient.invalidateQueries({ queryKey: viewKey });
    queryClient.invalidateQueries({
      queryKey: orpc.categories.getUserCategories.queryOptions().queryKey,
    });
    router.invalidate();
    setIsCreateFormOpen(false);
  };

  return (
    <EntityPickerProvider>
      <div className="min-h-full">
        <PageHeader
          eyebrow="Your activity"
          title="Transactions"
          description="Review, categorize, and keep every movement of money in order."
          actions={
            <Dialog open={isCreateFormOpen} onOpenChange={setIsCreateFormOpen}>
              <DialogTrigger asChild>
                <Button>
                  <Plus className="mr-2 h-4 w-4" />
                  Add transaction
                </Button>
              </DialogTrigger>
              <DialogContent className="sm:max-w-[620px]">
                <DialogHeader>
                  <DialogTitle>Create New Transaction</DialogTitle>
                  <DialogDescription>
                    Add a new transaction to your records.
                  </DialogDescription>
                </DialogHeader>
                <CreateTransactionForm callback={handleCreateSuccess} />
              </DialogContent>
            </Dialog>
          }
        />

        <div className="max-w-screen-2xl mx-auto space-y-6 px-4 py-8 lg:px-8">
          <Panel dense>
            <ViewControls />
          </Panel>

          {reviewing && transactions.length > 0 ? (
            <ReviewCard
              transactions={transactions}
              mutations={mutations}
              onEditMerchant={(merchantId) =>
                setEditMerchant({ open: true, merchantId })
              }
              onEditCategory={(categoryId) =>
                setEditCategory({ open: true, categoryId })
              }
              onCreateCategory={() => setCreateCategoryOpen(true)}
            />
          ) : null}

          <Panel className="gap-0 overflow-hidden p-0">
            <TransactionList
              transactions={transactions}
              hasActiveFilters={hasActiveViewFilters(search)}
              reviewOnly={reviewing}
              isMutating={mutations.isPending}
              mutations={mutations}
              onCustomSplit={(transaction) =>
                setSplitDialog({ open: true, transaction })
              }
              onEditMerchant={(merchantId) =>
                setEditMerchant({ open: true, merchantId })
              }
              onEditCategory={(categoryId) =>
                setEditCategory({ open: true, categoryId })
              }
              onCreateCategory={() => setCreateCategoryOpen(true)}
              onMerchantClick={handleMerchantClick}
              onCategoryClick={handleCategoryClick}
            />
          </Panel>

          <Paginator
            pagination={pagination}
            onPageChange={goToPage}
            onPageSizeChange={changePageSize}
          />
        </div>

        <EditMerchantDialog
          open={editMerchant.open}
          onOpenChange={(open) =>
            setEditMerchant({ open, merchantId: editMerchant.merchantId })
          }
          merchantId={editMerchant.merchantId}
          onSuccess={handleCreateSuccess}
        />

        <EditCategoryDialog
          open={editCategory.open}
          onOpenChange={(open) =>
            setEditCategory({ open, categoryId: editCategory.categoryId })
          }
          categoryId={editCategory.categoryId}
          onSuccess={handleCreateSuccess}
        />

        <CreateCategoryDialog
          open={createCategoryOpen}
          onOpenChange={setCreateCategoryOpen}
          onSuccess={() =>
            queryClient.invalidateQueries({
              queryKey:
                orpc.categories.getUserCategories.queryOptions().queryKey,
            })
          }
        />

        <SplitTransactionDialog
          open={splitDialog.open}
          onOpenChange={(open) =>
            setSplitDialog({
              open,
              transaction: open ? splitDialog.transaction : null,
            })
          }
          transaction={splitDialog.transaction}
          queryKey={viewKey}
        />
      </div>
    </EntityPickerProvider>
  );
}
