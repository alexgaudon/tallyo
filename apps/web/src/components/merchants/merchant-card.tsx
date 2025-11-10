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
import { Card, CardContent } from "@/components/ui/card";
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
    <Card>
      <CardContent className="p-3 sm:p-4">
        <div className="flex items-start justify-between gap-2 sm:gap-3">
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
          <div className="flex items-center gap-0.5 sm:gap-1 shrink-0">
            <Dialog open={editOpen} onOpenChange={setEditOpen}>
              <DialogTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8 sm:h-9 sm:w-9 text-muted-foreground hover:text-primary touch-manipulation"
                >
                  <PencilIcon className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle className="flex items-center gap-2 text-lg">
                    <PencilIcon className="h-4 w-4" />
                    Edit Merchant
                  </DialogTitle>
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
                  className="h-8 w-8 sm:h-9 sm:w-9 text-muted-foreground hover:text-orange-600 touch-manipulation"
                >
                  <GitMergeIcon className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle className="flex items-center gap-2 text-lg">
                    <GitMergeIcon className="h-4 w-4" />
                    Merge Merchant
                  </DialogTitle>
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
              className="h-8 w-8 sm:h-9 sm:w-9 text-muted-foreground hover:text-blue-600 touch-manipulation"
              onClick={handleApplyMerchant}
              disabled={isApplying}
              title="Apply merchant to matching unreviewed transactions"
            >
              <ZapIcon className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
            </Button>
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8 sm:h-9 sm:w-9 text-muted-foreground hover:text-destructive touch-manipulation"
                >
                  <XIcon className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
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
          <div className="mt-2 sm:mt-3 flex flex-wrap gap-1 sm:gap-1.5">
            {merchant.keywords.map((keyword) => (
              <span
                key={keyword.id}
                className="inline-flex items-center gap-1 rounded-full bg-muted px-2 sm:px-2.5 py-0.5 sm:py-1 text-xs text-muted-foreground"
              >
                <TagIcon className="h-2.5 w-2.5 sm:h-3 sm:w-3 shrink-0" />
                <span className="truncate max-w-[100px] sm:max-w-[120px]">
                  {keyword.keyword}
                </span>
              </span>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
