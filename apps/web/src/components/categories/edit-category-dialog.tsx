import { useQuery } from "@tanstack/react-query";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { orpc } from "@/utils/orpc";
import { EditCategoryForm } from "./edit-category-form";

interface EditCategoryDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  categoryId: string;
  onSuccess?: () => void;
}

export function EditCategoryDialog({
  open,
  onOpenChange,
  categoryId,
  onSuccess,
}: EditCategoryDialogProps) {
  const { data } = useQuery(orpc.categories.getUserCategories.queryOptions());

  const category = data?.categories.find((c) => c.id === categoryId);

  const handleSuccess = () => {
    onOpenChange(false);
    onSuccess?.();
  };

  if (!category) {
    return null;
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Edit Category</DialogTitle>
          <DialogDescription>
            Update category information, parent category, and settings.
          </DialogDescription>
        </DialogHeader>
        <EditCategoryForm category={category} callback={handleSuccess} />
      </DialogContent>
    </Dialog>
  );
}
