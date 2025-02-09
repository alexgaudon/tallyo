import { Button } from "@/components/ui/button";
import { toast } from "@/hooks/use-toast";
import { CategoryRepository } from "@/repositories/categories";
import { TransactionRepository } from "@/repositories/transactions";
import { useQuery } from "@tanstack/react-query";
import { useNavigate } from "@tanstack/react-router";
import { PlusIcon, RotateCwIcon, Trash2Icon } from "lucide-react";
import { TransactionTable } from "../transactions/table";
import { DangerConfirm } from "../ui/danger-confirm";
import { Switch } from "../ui/switch";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "../ui/table";
import { Toaster } from "../ui/toaster";
import { CategoryBadge } from "./category-badge";
import { CreateCategoryForm } from "./create-category-form";

const PAGE_SIZE = 10;

export function CategoryPage({ categoryName }: { categoryName?: string }) {
  const { data: categories } = useQuery(
    CategoryRepository.getAllUserCategoriesQuery(),
  );

  const { mutateAsync: deleteCategory } =
    CategoryRepository.deleteUserCategoryMutation();

  const { mutateAsync: updateCategory } =
    CategoryRepository.updateUserCategoryMutation();

  const { data: transactions } = useQuery(
    TransactionRepository.getAllUserTransactionsQuery({
      categoryName: categoryName,
      pageSize: PAGE_SIZE,
      page: 1,
      unreviewed: false,
    }),
  );

  const navigate = useNavigate();

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

      <div className="space-x-2 grid grid-cols-1 lg:grid-cols-2">
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
                  <TableCell className="text-right p-0">
                    <DangerConfirm
                      onConfirm={async () => {
                        const res = await deleteCategory({ id: category.id });

                        toast({
                          variant: res?.ok ? "default" : "destructive",
                          description: res?.message,
                        });
                      }}
                    >
                      <Button variant="ghost" size="sm">
                        <Trash2Icon className="w-4 h-4 text-red-500" />
                      </Button>
                    </DangerConfirm>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
        <div className="lg:flex justify-center hidden">
          {false ? (
            <RotateCwIcon className="animate-spin" />
          ) : (
            <>
              {categoryName ? (
                <TransactionTable data={transactions!.data}></TransactionTable>
              ) : (
                <p>Select a category for more context</p>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}
