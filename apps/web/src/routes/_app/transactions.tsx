import { useQueryClient } from "@tanstack/react-query";
import {
  createFileRoute,
  useNavigate,
  useRouter,
  useSearch,
} from "@tanstack/react-router";
import { Plus } from "lucide-react";
import { useEffect, useState } from "react";
import { z } from "zod";
import { PageHeader } from "@/components/layout/page-header";
import { CreateTransactionForm } from "@/components/transactions/create-transaction-form";
import { LedgerView } from "@/components/transactions/ledger-view";
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
import {
  type ViewSearch,
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

  const [isCreateFormOpen, setIsCreateFormOpen] = useState(false);

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

  const handleViewChange = (next: ViewSearch) => {
    navigate({
      to: "/transactions",
      search: (prev) => ({ ...prev, ...next }),
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

        <div className="max-w-screen-2xl mx-auto px-4 py-8 lg:px-8">
          <LedgerView view={search} onViewChange={handleViewChange} />
        </div>
      </div>
    </EntityPickerProvider>
  );
}
