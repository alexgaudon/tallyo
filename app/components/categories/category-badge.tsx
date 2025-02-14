import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectTrigger,
} from "@/components/ui/select";
import { CategoryRepository } from "@/repositories/categories";
import { TransactionRepository } from "@/repositories/transactions";
import { useQuery } from "@tanstack/react-query";
import { Link } from "@tanstack/react-router";
import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogTitle,
  DialogTrigger,
} from "../ui/dialog";

type UncategorizedProps = {
  transactionId: string;
  name: string;
  color: string;
};

type CategorizedProps = {
  name: string;
  color: string;
  link?: boolean;
};

type CategoryBadgeProps = (UncategorizedProps | CategorizedProps) & {
  className?: string;
};

function CategoryPicker(props: {
  children: React.ReactNode;
  id: string;
  mutator: ReturnType<
    typeof TransactionRepository.useUpdateUserTransactionMutation
  >;
}) {
  const { data: categories } = useQuery(
    CategoryRepository.getAllUserCategoriesQuery(),
  );

  const [open, setOpen] = useState(false);

  return (
    <Dialog open={open} onOpenChange={(val) => setOpen(val)}>
      <DialogTrigger>
        <div className="flex justify-center items-center gap-x-2 underline">
          {props.children}
        </div>
      </DialogTrigger>
      <DialogContent>
        <div className="lg:grid mx-auto w-fit">
          <div className="flex justify-center items-center py-2">
            <div className="gap-6 grid mx-auto w-[350px]">
              <DialogTitle>
                <div className="gap-2 grid text-center">
                  <DialogDescription>Assign a Category</DialogDescription>
                </div>
              </DialogTitle>

              <Select
                onValueChange={async (val) => {
                  setOpen(false);
                  await props.mutator.mutateAsync({
                    id: props.id,
                    categoryId: val,
                  });
                }}
              >
                <SelectTrigger>{props.children}</SelectTrigger>
                <SelectContent>
                  <SelectGroup>
                    <SelectLabel></SelectLabel>
                    <SelectLabel>Categories</SelectLabel>
                    {categories?.map((category) => (
                      <SelectItem key={category.id} value={category.id}>
                        <CategoryBadge
                          name={category.name}
                          color={category.color}
                        />
                      </SelectItem>
                    ))}
                  </SelectGroup>
                </SelectContent>
              </Select>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

export function CategoryBadge(props: CategoryBadgeProps) {
  const mutator = TransactionRepository.useUpdateUserTransactionMutation();
  if ("transactionId" in props) {
    return (
      <CategoryPicker id={props.transactionId} mutator={mutator}>
        <CategoryBadge name={props.name} color={props.color} />
      </CategoryPicker>
    );
  }

  const element = (
    <div className="flex items-center truncate whitespace-nowrap overflow-hidden">
      <div
        style={{
          background: props.color,
        }}
        className={`w-4 h-4 rounded-full mr-3`}
        aria-hidden="true"
      />
      <h2 className="text-sm truncate whitespace-nowrap overflow-hidden">
        {props.name}
      </h2>
    </div>
  );

  if (props.link) {
    return (
      <Link
        //TODO
        to="/transactions"
        search={{
          page: 1,
          categoryName: props.name,
        }}
      >
        {element}
      </Link>
    );
  }

  return element;
}
