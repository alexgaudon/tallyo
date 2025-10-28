import { useMutation, useQuery } from "@tanstack/react-query";
import { createFileRoute } from "@tanstack/react-router";
import { Building2Icon, PlusIcon, SearchIcon } from "lucide-react";
import { useMemo, useState } from "react";
import { toast } from "sonner";
import { CreateMerchantForm } from "@/components/merchants/create-merchant-form";
import { MerchantList } from "@/components/merchants/merchant-list";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { ensureSession } from "@/lib/auth-client";
import { orpc, queryClient } from "@/utils/orpc";

export const Route = createFileRoute("/merchants")({
  component: RouteComponent,
  beforeLoad: async ({ context }) => {
    ensureSession(context.isAuthenticated, "/merchants");

    await context.queryClient.ensureQueryData(
      orpc.merchants.getUserMerchants.queryOptions(),
    );
  },
});

function RouteComponent() {
  const [open, setOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const { data: merchants, isLoading } = useQuery(
    orpc.merchants.getUserMerchants.queryOptions(),
  );

  const { mutateAsync: deleteMerchant } = useMutation(
    orpc.merchants.deleteMerchant.mutationOptions({
      onSuccess: () => {
        queryClient.invalidateQueries({
          queryKey: orpc.merchants.getUserMerchants.queryOptions().queryKey,
        });
      },
    }),
  );

  // Filter merchants based on search query
  const filteredMerchants = useMemo(() => {
    if (!merchants || !searchQuery.trim()) {
      return merchants ?? [];
    }

    const query = searchQuery.toLowerCase().trim();
    return merchants.filter((merchant) => {
      // Search in merchant name
      if (merchant.name.toLowerCase().includes(query)) {
        return true;
      }

      // Search in keywords
      if (
        merchant.keywords?.some((keyword) =>
          keyword.keyword.toLowerCase().includes(query),
        )
      ) {
        return true;
      }

      // Search in recommended category name
      if (merchant.recommendedCategory?.name.toLowerCase().includes(query)) {
        return true;
      }

      return false;
    });
  }, [merchants, searchQuery]);

  async function handleDelete(id: string) {
    const result = await deleteMerchant({ id });
    toast.success(result.message);
  }

  return (
    <div className="container mx-auto max-w-screen-2xl p-4 sm:p-6 lg:p-8 space-y-6">
      <div className="bg-card rounded-md border shadow-sm p-6">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="flex items-center justify-center w-10 h-10 rounded-lg bg-accent/10">
              <Building2Icon className="h-6 w-6 text-accent" />
            </div>
            <div>
              <h1 className="text-2xl font-bold">Merchants</h1>
              <p className="text-sm text-muted-foreground">
                Manage your merchants and their categories
              </p>
            </div>
          </div>
          <div className="flex justify-center sm:justify-end">
            <Dialog open={open} onOpenChange={setOpen}>
              <DialogTrigger asChild>
                <Button
                  variant="outline"
                  size="lg"
                  className="shadow w-full sm:w-auto"
                >
                  <PlusIcon className="h-4 w-4 mr-2" />
                  <span className="hidden sm:inline">New Merchant</span>
                  <span className="sm:hidden">New</span>
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle className="flex items-center gap-2 text-lg">
                    <PlusIcon className="h-4 w-4" />
                    New Merchant
                  </DialogTitle>
                </DialogHeader>
                <CreateMerchantForm callback={() => setOpen(false)} />
              </DialogContent>
            </Dialog>
          </div>
        </div>
      </div>

      {/* Search Bar */}
      <div className="bg-card rounded-md border shadow-sm p-6">
        <div className="relative">
          <SearchIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search merchants by name, keywords, or category..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10 h-12 text-sm placeholder:text-sm"
          />
        </div>
      </div>

      <div className="bg-card rounded-md border shadow-sm p-6">
        <div className="w-full">
          <MerchantList
            merchants={filteredMerchants}
            isLoading={isLoading}
            onDelete={handleDelete}
          />
        </div>
      </div>
    </div>
  );
}
