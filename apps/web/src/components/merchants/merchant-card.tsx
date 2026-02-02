import { useMutation } from "@tanstack/react-query";
import {
  GitMergeIcon,
  PencilIcon,
  StoreIcon,
  TagIcon,
  XIcon,
  ZapIcon,
} from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { orpc } from "@/utils/orpc";
import type { MerchantWithKeywordsAndCategory } from "../../../../server/src/routers";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "../ui/alert-dialog";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "../ui/dialog";
import { EditMerchantForm } from "./edit-merchant-form";
import { MergeMerchantForm } from "./merge-merchant-form";

interface MerchantCardProps {
  merchant: MerchantWithKeywordsAndCategory;
  onDelete: (id: string) => Promise<void>;
}

export function MerchantCard({ merchant, onDelete }: MerchantCardProps) {
  const [editOpen, setEditOpen] = useState(false);
  const [mergeOpen, setMergeOpen] = useState(false);

  const { mutateAsync: applyMerchant, isPending: isApplying } = useMutation(
    orpc.merchants.applyMerchant.mutationOptions(),
  );

  const handleApplyMerchant = async () => {
    try {
      const result = await applyMerchant({ id: merchant.id });
      toast.success(result.message);
    } catch (error) {
      toast.error(
        `Failed to apply merchant: ${
          error instanceof Error ? error.message : "Unknown error"
        }`,
      );
    }
  };

  return (
    <div className="border border-border p-4">
      <div className="flex items-start justify-between gap-3">
        <div className="flex-1 min-w-0 pr-2">
          <div className="flex items-center gap-2 mb-1">
            <StoreIcon className="h-4 w-4 text-muted-foreground shrink-0" />
            <span className="font-medium truncate">{merchant.name}</span>
          </div>
          {merchant.recommendedCategory && (
            <div className="text-xs text-muted-foreground ml-6">
              {merchant.recommendedCategory.name}
            </div>
          )}
        </div>
        <div className="flex items-center gap-1 shrink-0">
          <Dialog open={editOpen} onOpenChange={setEditOpen}>
            <DialogTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8 text-muted-foreground hover:text-foreground"
              >
                <PencilIcon className="h-4 w-4" />
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Edit Merchant</DialogTitle>
              </DialogHeader>
              <EditMerchantForm
                merchant={merchant}
                callback={() => setEditOpen(false)}
              />
            </DialogContent>
          </Dialog>
          <Dialog open={mergeOpen} onOpenChange={setMergeOpen}>
            <DialogTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8 text-muted-foreground hover:text-orange-600"
              >
                <GitMergeIcon className="h-4 w-4" />
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Merge Merchant</DialogTitle>
              </DialogHeader>
              <MergeMerchantForm
                sourceMerchant={merchant}
                callback={() => setMergeOpen(false)}
              />
            </DialogContent>
          </Dialog>
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8 text-muted-foreground hover:text-blue-600"
            onClick={handleApplyMerchant}
            disabled={isApplying}
            title="Apply merchant to matching unreviewed transactions"
          >
            <ZapIcon className="h-4 w-4" />
          </Button>
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8 text-muted-foreground hover:text-destructive"
              >
                <XIcon className="h-4 w-4" />
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Delete Merchant</AlertDialogTitle>
                <AlertDialogDescription>
                  Are you sure you want to delete this merchant? This action
                  cannot be undone.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Cancel</AlertDialogCancel>
                <AlertDialogAction onClick={() => onDelete(merchant.id)}>
                  Delete
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </div>
      </div>
      {merchant.keywords && merchant.keywords.length > 0 && (
        <div className="mt-3 flex flex-wrap gap-1.5">
          {merchant.keywords.map((keyword) => (
            <span
              key={keyword.id}
              className="inline-flex items-center gap-1 px-2 py-0.5 text-xs border border-border text-muted-foreground"
            >
              <TagIcon className="h-3 w-3 shrink-0" />
              <span className="truncate max-w-[100px]">{keyword.keyword}</span>
            </span>
          ))}
        </div>
      )}
    </div>
  );
}
