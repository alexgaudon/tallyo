import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { DangerConfirm } from "@/components/ui/danger-confirm";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { toast } from "@/hooks/use-toast";
import { CategoryRepository } from "@/repositories/categories";
import { Category } from "@/repositories/categories/categories.getAll";
import { Trash2Icon } from "lucide-react";
import { CategoryBadge } from "./category-badge";

export function CategoryDetail({ category }: { category: Category }) {
  const { mutateAsync: deleteCategory } =
    CategoryRepository.deleteUserCategoryMutation();

  const { mutateAsync: updateCategory } =
    CategoryRepository.updateUserCategoryMutation();

  return (
    <Card key={category.id}>
      <CardContent className="flex flex-col gap-4 p-4">
        <div className="flex justify-between items-center">
          <CategoryBadge
            name={category.name}
            color={category.color}
            link={false}
          />
          <DangerConfirm
            onConfirm={async () => {
              const res = await deleteCategory({
                id: category.id,
              });

              toast({
                variant: res?.ok ? "default" : "destructive",
                description: res?.message,
              });
            }}
          >
            <Button variant="ghost">
              <Trash2Icon className="text-red-500" strokeWidth={3} />
            </Button>
          </DangerConfirm>
        </div>
        <div className="flex justify-between items-center">
          <Label className="text-sm">Hide From Insights</Label>
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
        </div>
        <div className="flex justify-between items-center">
          <Label className="text-sm">Treat as Income</Label>
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
        </div>
      </CardContent>
    </Card>
  );
}
