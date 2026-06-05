import type { LucideIcon } from "lucide-react";
import * as LucideIcons from "lucide-react";
import {
  DollarSignIcon,
  EyeOffIcon,
  FolderIcon,
  PencilIcon,
  XIcon,
} from "lucide-react";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import type { Category } from "../../../../server/src/routers";
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
import { EditCategoryForm } from "./edit-category-form";

interface SubCategoryItemProps {
  category: Category;
  onDelete: (id: string) => Promise<void>;
}

export function SubCategoryItem({ category, onDelete }: SubCategoryItemProps) {
  const [editOpen, setEditOpen] = useState(false);

  const Icon = category.icon
    ? // biome-ignore lint: dynamic icon access is required for user-selected icons
      (LucideIcons[category.icon as keyof typeof LucideIcons] as LucideIcon)
    : FolderIcon;

  return (
    <div className="flex items-center justify-between rounded-lg border border-border/60 p-2 pl-8">
      <div className="flex items-center gap-2">
        <Icon className="h-3 w-3 text-muted-foreground" />
        <span className="text-sm">{category.name}</span>
        <div className="flex items-center gap-1">
          {category.treatAsIncome && (
            <div className="flex items-center gap-1 px-2 py-1 text-xs border border-income/20 bg-income/10 text-income">
              <DollarSignIcon className="h-3 w-3" />
              <span>Income</span>
            </div>
          )}
          {category.hideFromInsights && (
            <div className="flex items-center gap-1 px-2 py-1 text-xs border border-border bg-muted text-muted-foreground">
              <EyeOffIcon className="h-3 w-3" />
              <span>Hidden</span>
            </div>
          )}
        </div>
      </div>

      <div className="flex items-center gap-1">
        <Dialog open={editOpen} onOpenChange={setEditOpen}>
          <DialogTrigger asChild>
            <Button
              variant="ghost"
              size="icon"
              className="h-6 w-6 text-muted-foreground hover:text-foreground"
            >
              <PencilIcon className="h-3 w-3" />
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Edit Category</DialogTitle>
            </DialogHeader>
            <EditCategoryForm
              category={category}
              callback={() => setEditOpen(false)}
            />
          </DialogContent>
        </Dialog>

        <AlertDialog>
          <AlertDialogTrigger asChild>
            <Button
              variant="ghost"
              size="icon"
              className="h-6 w-6 text-muted-foreground hover:text-destructive"
            >
              <XIcon className="h-3 w-3" />
            </Button>
          </AlertDialogTrigger>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Delete Category</AlertDialogTitle>
              <AlertDialogDescription>
                Are you sure you want to delete this category? This action
                cannot be undone.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancel</AlertDialogCancel>
              <AlertDialogAction onClick={() => onDelete(category.id)}>
                Delete
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>
    </div>
  );
}
