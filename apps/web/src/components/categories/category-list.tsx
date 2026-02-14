import { FolderIcon, XIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { Category } from "../../../../server/src/routers";
import { CategoryCard } from "./category-card";

interface CategoryListProps {
  categories: Category[];
  isLoading: boolean;
  onDelete: (id: string) => Promise<void>;
}

export function CategoryList({
  categories,
  isLoading,
  onDelete,
}: CategoryListProps) {
  if (isLoading) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="text-muted-foreground">Loading categories...</div>
      </div>
    );
  }

  if (!categories.length) {
    return (
      <div className="flex flex-col items-center justify-center p-8 text-center rounded-xl border border-border/80 bg-card shadow-sm">
        <FolderIcon className="mb-2 h-12 w-12 text-muted-foreground" />
        <h3 className="mb-1 text-lg font-semibold">No categories yet</h3>
        <p className="text-sm text-muted-foreground">
          Create your first category to get started
        </p>
      </div>
    );
  }

  const parentCategories = categories.filter((cat) => !cat.parentCategory);
  const childCategories = categories.filter((cat) => cat.parentCategory);

  return (
    <div className="space-y-4 p-4">
      {parentCategories.map((parent) => (
        <CategoryCard
          key={parent.id}
          category={parent}
          subCategories={childCategories.filter(
            (child) => child.parentCategory?.id === parent.id,
          )}
          onDelete={onDelete}
        />
      ))}

      {childCategories
        .filter(
          (child) =>
            !parentCategories.some(
              (parent) => parent.id === child.parentCategory?.id,
            ),
        )
        .map((orphanedChild) => (
          <div
            key={orphanedChild.id}
            className="rounded-xl border border-border/80 bg-card shadow-sm p-4"
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <FolderIcon className="h-4 w-4 text-muted-foreground" />
                <div>
                  <span className="font-medium">{orphanedChild.name}</span>
                  <span className="ml-2 text-xs text-muted-foreground">
                    (Orphaned category)
                  </span>
                </div>
              </div>
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8 text-muted-foreground hover:text-destructive"
                onClick={() => onDelete(orphanedChild.id)}
              >
                <XIcon className="h-4 w-4" />
              </Button>
            </div>
          </div>
        ))}
    </div>
  );
}
