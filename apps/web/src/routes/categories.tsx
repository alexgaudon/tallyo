import { useMutation, useQuery } from "@tanstack/react-query";
import { createFileRoute } from "@tanstack/react-router";
import { FolderTreeIcon, PlusIcon, SearchIcon } from "lucide-react";
import { useMemo, useState } from "react";
import { CategoryList } from "@/components/categories/category-list";
import { CreateCategoryForm } from "@/components/categories/create-category-form";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ensureSession } from "@/lib/auth-client";
import { orpc, queryClient } from "@/utils/orpc";

type FilterType = "all" | "income" | "expense";

export const Route = createFileRoute("/categories")({
  component: RouteComponent,
  beforeLoad: async ({ context }) => {
    ensureSession(context.isAuthenticated, "/categories");

    await context.queryClient.ensureQueryData(
      orpc.categories.getUserCategories.queryOptions(),
    );
  },
});

function RouteComponent() {
  const [open, setOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [filterType, setFilterType] = useState<FilterType>("all");
  const { data: categories, isLoading } = useQuery(
    orpc.categories.getUserCategories.queryOptions({
      select: (data) => data.categories,
    }),
  );

  const { mutateAsync: deleteCategory } = useMutation(
    orpc.categories.deleteCategory.mutationOptions({
      onSuccess: () => {
        queryClient.invalidateQueries({
          queryKey: orpc.categories.getUserCategories.queryOptions().queryKey,
        });
      },
    }),
  );

  // Filter categories based on search query and filter type
  const filteredCategories = useMemo(() => {
    if (!categories) {
      return [];
    }

    let filtered = categories;

    // Apply filter type
    if (filterType !== "all") {
      filtered = filtered.filter((category) => {
        if (filterType === "income") {
          return category.treatAsIncome;
        } else if (filterType === "expense") {
          return !category.treatAsIncome;
        }
        return true;
      });
    }

    // Apply search query
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase().trim();
      filtered = filtered.filter((category) => {
        // Search in category name
        if (category.name.toLowerCase().includes(query)) {
          return true;
        }

        // Search in icon if it exists
        if (category.icon?.toLowerCase().includes(query)) {
          return true;
        }

        return false;
      });
    }

    return filtered;
  }, [categories, searchQuery, filterType]);

  async function handleDelete(id: string) {
    await deleteCategory({ id });
  }

  return (
    <div className="container mx-auto max-w-screen-2xl p-4 sm:p-6 lg:p-8 space-y-6">
      <div className="bg-card rounded-md border shadow-sm p-6">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="flex items-center justify-center w-10 h-10 rounded-lg bg-accent/10">
              <FolderTreeIcon className="h-6 w-6 text-accent" />
            </div>
            <div>
              <h1 className="text-2xl font-bold">Categories</h1>
              <p className="text-sm text-muted-foreground">
                Organize your transactions with categories
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
                  <span className="hidden sm:inline">New Category</span>
                  <span className="sm:hidden">New</span>
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle className="flex items-center gap-2 text-lg">
                    <PlusIcon className="h-4 w-4" />
                    New Category
                  </DialogTitle>
                </DialogHeader>
                <CreateCategoryForm callback={() => setOpen(false)} />
              </DialogContent>
            </Dialog>
          </div>
        </div>
      </div>

      {/* Search Bar */}
      <div className="bg-card rounded-md border shadow-sm p-6">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center">
          <div className="relative flex-1">
            <SearchIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search categories by name or icon..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10 h-12 text-sm placeholder:text-sm"
            />
          </div>
          <div className="w-full lg:w-auto lg:min-w-[140px]">
            <Select
              value={filterType}
              onValueChange={(value: FilterType) => setFilterType(value)}
            >
              <SelectTrigger className="w-full h-12 min-h-[3rem]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Categories</SelectItem>
                <SelectItem value="income">Income</SelectItem>
                <SelectItem value="expense">Expense</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
      </div>

      <div className="bg-card rounded-md border shadow-sm p-6">
        <div className="grid gap-6 lg:grid-cols-[1fr,320px]">
          <CategoryList
            categories={filteredCategories}
            isLoading={isLoading}
            onDelete={handleDelete}
          />
        </div>
      </div>
    </div>
  );
}
