import { useMutation, useQuery } from "@tanstack/react-query";
import { createFileRoute } from "@tanstack/react-router";
import { Building2Icon, PlusIcon, SearchIcon, ZapIcon } from "lucide-react";
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

  const { mutateAsync: applyAllMerchants, isPending: isApplyingAll } =
    useMutation(orpc.merchants.applyAllMerchants.mutationOptions());

  const handleApplyAllMerchants = async () => {
    try {
      const result = await applyAllMerchants({});
      toast.success(result.message);
    } catch (error) {
      toast.error(
        `Failed to apply all merchants: ${
          error instanceof Error ? error.message : "Unknown error"
        }`,
      );
    }
  };

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
    <div className="mx-auto max-w-6xl px-4 py-4 sm:px-6 sm:py-6 lg:px-8 lg:py-8 space-y-4 sm:space-y-5 lg:space-y-6">
      <div className="bg-card/80 backdrop-blur-sm rounded-lg border shadow-xs sm:shadow-sm px-4 py-3 sm:px-5 sm:py-4 lg:px-6 lg:py-5">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div className="flex items-center gap-3 min-w-0">
            <div className="flex items-center justify-center w-9 h-9 sm:w-10 sm:h-10 rounded-lg bg-accent/10">
              <Building2Icon className="h-5 w-5 sm:h-6 sm:w-6 text-accent" />
            </div>
            <div className="min-w-0">
              <h1 className="text-lg sm:text-xl lg:text-2xl font-semibold tracking-tight">
                Merchants
              </h1>
              <p className="text-xs sm:text-sm text-muted-foreground truncate">
                Manage your merchants and their categories
              </p>
            </div>
          </div>
          <div className="flex justify-center sm:justify-end gap-2">
            <Button
              variant="outline"
              size="sm"
              className="w-1/2 sm:w-auto shadow-sm"
              onClick={handleApplyAllMerchants}
              disabled={
                isApplyingAll || isLoading || (merchants?.length ?? 0) === 0
              }
            >
              <ZapIcon className="h-4 w-4 mr-2" />
              <span className="hidden sm:inline">Apply All Merchants</span>
              <span className="sm:hidden">Apply All</span>
            </Button>
            <Dialog open={open} onOpenChange={setOpen}>
              <DialogTrigger asChild>
                <Button
                  variant="default"
                  size="sm"
                  className="w-1/2 sm:w-auto shadow-sm"
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
      <div className="bg-card/80 backdrop-blur-sm rounded-lg border shadow-xs sm:shadow-sm px-4 py-3 sm:px-5 sm:py-4">
        <div className="relative">
          <SearchIcon className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search merchants by name, keywords, or category..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9 h-9 text-sm placeholder:text-xs sm:placeholder:text-sm"
          />
        </div>
      </div>

      <div className="bg-card/80 backdrop-blur-sm rounded-lg border shadow-xs sm:shadow-sm px-2 py-2 sm:px-4 sm:py-4">
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
