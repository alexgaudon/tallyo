import { CategoryRepository } from "@/repositories/categories";
import {
  createFileRoute,
  Outlet,
  redirect,
  useNavigate,
} from "@tanstack/react-router";

import { CategoryBadge } from "@/components/categories/category-badge";
import { CreateCategoryForm } from "@/components/categories/create-category-form";
import { Button } from "@/components/ui/button";
import { DangerConfirm } from "@/components/ui/danger-confirm";
import { Switch } from "@/components/ui/switch";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Toaster } from "@/components/ui/toaster";
import { toast } from "@/hooks/use-toast";
import { TransactionRepository } from "@/repositories/transactions";
import { useQuery } from "@tanstack/react-query";
import { ArrowLeft, PlusIcon, Trash2Icon } from "lucide-react";
import { z } from "zod";

export const Route = createFileRoute("/categories")({
  component: RouteComponent,
  validateSearch: z.object({
    page: z.number().optional(),
  }),
  beforeLoad: async (ctx) => {
    if (!ctx.context.auth.isAuthenticated) {
      throw redirect({ to: "/signin" });
    }

    const prefetches = [
      ctx.context.queryClient.prefetchQuery(
        CategoryRepository.getAllUserCategoriesQuery(),
      ),
    ];
    const match = ctx.matches.find(
      (match) => match.fullPath === "/categories/$category",
    );

    if (match) {
      prefetches.push(
        ctx.context.queryClient.prefetchQuery(
          TransactionRepository.getAllUserTransactionsQuery({
            categoryName: match.params.category,
            pageSize: 10,
            page: match.search.page,
            unreviewed: false,
          }),
        ),
      );
    }

    await Promise.all(prefetches);
  },
});

function RouteComponent() {
  const { data: categories } = useQuery(
    CategoryRepository.getAllUserCategoriesQuery(),
  );

  const { mutateAsync: deleteCategory } =
    CategoryRepository.useDeleteUserCategoryMutation();

  const { mutateAsync: updateCategory } =
    CategoryRepository.useUpdateUserCategoryMutation();

  const navigate = useNavigate();

  const match = Route.useMatch();

  let isEditing = false;

  if ("category" in match.params) {
    isEditing = true;
  }

  return (
    <div className="p-4">
      <Toaster />
      <div className="flex justify-between items-center mb-4">
        <h1 className="font-bold text-2xl">Categories</h1>
        <CreateCategoryForm>
          <Button className="flex items-center ml-4">
            <PlusIcon className="mr-2 w-4 h-4" />
            Create New Category
          </Button>
        </CreateCategoryForm>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2">
        <div className="mb-24 border rounded-md overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead className="w[100px]">Treat as Income</TableHead>
                <TableHead className="w[100px]">Hide from Insights</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {categories?.map((category) => (
                <TableRow
                  key={category.id}
                  className="hover:cursor-pointer"
                  onClick={() =>
                    navigate({
                      to: "/categories/" + category.name,
                    })
                  }
                >
                  <TableCell className="p-1 font-medium">
                    <CategoryBadge
                      name={category.name}
                      color={category.color}
                      link={true}
                    />
                  </TableCell>
                  <TableCell className="p-0">
                    <Switch
                      onClick={(e) => {
                        e.stopPropagation();
                      }}
                      checked={category.treatAsIncome || false}
                      onCheckedChange={async (checked) => {
                        const res = await updateCategory({
                          id: category.id,
                          hideFromInsights: category.hideFromInsights ?? false,
                          treatAsIncome: checked,
                        });

                        toast({
                          variant: res?.ok ? "default" : "destructive",
                          description: res?.message,
                        });
                      }}
                    />
                  </TableCell>
                  <TableCell className="p-0">
                    <Switch
                      onClick={(e) => {
                        e.stopPropagation();
                      }}
                      checked={category.hideFromInsights || false}
                      onCheckedChange={async (checked) => {
                        const res = await updateCategory({
                          id: category.id,
                          hideFromInsights: checked,
                          treatAsIncome: category.treatAsIncome ?? false,
                        });

                        toast({
                          variant: res?.ok ? "default" : "destructive",
                          description: res?.message,
                        });
                      }}
                    />
                  </TableCell>
                  <TableCell className="p-0 text-right">
                    <DangerConfirm
                      onConfirm={async () => {
                        const res = await deleteCategory({ id: category.id });

                        toast({
                          variant: res?.ok ? "default" : "destructive",
                          description: res?.message,
                        });
                      }}
                    >
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={(e) => {
                          e.stopPropagation();
                        }}
                      >
                        <Trash2Icon className="w-4 h-4 text-red-500" />
                      </Button>
                    </DangerConfirm>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
        <div className="lg:flex justify-center">
          {isEditing ? (
            <Outlet />
          ) : (
            <div className="flex flex-col justify-center items-center">
              <h1 className="font-bold text-2xl">
                <div className="flex justify-center items-center">
                  <ArrowLeft></ArrowLeft>
                  Click a category to display transaction(s)
                </div>
              </h1>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
