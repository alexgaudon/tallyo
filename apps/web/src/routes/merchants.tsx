import { useMutation, useQuery } from "@tanstack/react-query";
import { createFileRoute } from "@tanstack/react-router";
import { Plus, Search, Zap } from "lucide-react";
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

  const filteredMerchants = useMemo(() => {
    if (!merchants || !searchQuery.trim()) {
      return merchants ?? [];
    }

    const query = searchQuery.toLowerCase().trim();
    return merchants.filter((merchant) => {
      if (merchant.name.toLowerCase().includes(query)) {
        return true;
      }
      if (
        merchant.keywords?.some((keyword) =>
          keyword.keyword.toLowerCase().includes(query),
        )
      ) {
        return true;
      }
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
    <div className="min-h-[calc(100vh-4rem)]">
      <div className="max-w-screen-2xl mx-auto px-4 py-6 lg:px-8 space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold font-sans">Merchants</h1>
            <p className="text-sm text-muted-foreground">
              Manage your merchants and their categories
            </p>
          </div>
          <div className="flex gap-2">
            <Button
              variant="outline"
              onClick={handleApplyAllMerchants}
              disabled={
                isApplyingAll || isLoading || (merchants?.length ?? 0) === 0
              }
            >
              <Zap className="w-4 h-4 mr-2" />
              Apply All
            </Button>
            <Dialog open={open} onOpenChange={setOpen}>
              <DialogTrigger asChild>
                <Button>
                  <Plus className="w-4 h-4 mr-2" />
                  New Merchant
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>New Merchant</DialogTitle>
                </DialogHeader>
                <CreateMerchantForm callback={() => setOpen(false)} />
              </DialogContent>
            </Dialog>
          </div>
        </div>

        {/* Search */}
        <div className="border border-border p-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search merchants by name, keywords, or category..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9 h-10"
            />
          </div>
        </div>

        {/* List */}
        <div className="border border-border">
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
