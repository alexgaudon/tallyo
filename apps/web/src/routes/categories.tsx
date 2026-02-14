import { useMutation, useQuery } from "@tanstack/react-query";
import { createFileRoute } from "@tanstack/react-router";
import { Plus, Search } from "lucide-react";
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

  const filteredCategories = useMemo(() => {
    if (!categories) {
      return [];
    }

    let filtered = categories;

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

    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase().trim();
      filtered = filtered.filter((category) => {
        if (category.name.toLowerCase().includes(query)) {
          return true;
        }
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
    <div className="min-h-full">
      <div className="max-w-screen-2xl mx-auto px-4 py-6 lg:px-8 space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold font-sans">Categories</h1>
            <p className="text-sm text-muted-foreground">
              Organize your transactions with categories
            </p>
          </div>
          <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
              <Button>
                <Plus className="w-4 h-4 mr-2" />
                New Category
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>New Category</DialogTitle>
              </DialogHeader>
              <CreateCategoryForm callback={() => setOpen(false)} />
            </DialogContent>
          </Dialog>
        </div>

        {/* Search & Filter - same width as category cards (list uses p-4) */}
        <div className="px-4">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
            <div className="relative flex-1 min-w-0">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search categories..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9 h-10"
              />
            </div>
            <Select
              value={filterType}
              onValueChange={(value: FilterType) => setFilterType(value)}
            >
              <SelectTrigger className="w-full sm:w-[140px] h-10 shrink-0">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All</SelectItem>
                <SelectItem value="income">Income</SelectItem>
                <SelectItem value="expense">Expense</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* List */}
        <CategoryList
          categories={filteredCategories}
          isLoading={isLoading}
          onDelete={handleDelete}
        />
      </div>
    </div>
  );
}
