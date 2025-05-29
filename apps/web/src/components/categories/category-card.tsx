import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import type { orpc } from "@/utils/orpc";
import type { LucideIcon } from "lucide-react";
import * as LucideIcons from "lucide-react";
import { DotIcon, FolderIcon, XIcon } from "lucide-react";
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
import { SubCategoryItem } from "./sub-category-item";

type Category = NonNullable<
	Awaited<
		ReturnType<typeof orpc.categories.getUserCategories.call>
	>["categories"][number]
>;

interface CategoryCardProps {
	category: Category;
	subCategories: Category[];
	onDelete: (id: string) => Promise<void>;
}

export function CategoryCard({
	category,
	subCategories,
	onDelete,
}: CategoryCardProps) {
	const Icon = category.icon
		? (LucideIcons[category.icon as keyof typeof LucideIcons] as LucideIcon)
		: FolderIcon;

	return (
		<Card>
			<CardContent className="p-4">
				<div className="flex items-center justify-between">
					<div className="flex items-center gap-2">
						<Icon className="h-4 w-4 text-muted-foreground" />
						<span
							className={cn(
								{
									"text-green-500": category.treatAsIncome,
								},
								"font-mono",
							)}
						>
							<DotIcon className="h-12 w-12" />
						</span>
						<span className="font-medium">{category.name}</span>
					</div>
					<AlertDialog>
						<AlertDialogTrigger asChild>
							<Button
								variant="ghost"
								size="icon"
								className="h-8 w-8 text-muted-foreground hover:text-destructive"
							>
								<XIcon className="h-4 w-4" />
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
				{subCategories.length > 0 && (
					<div className="mt-2 space-y-2">
						{subCategories.map((subCategory) => (
							<SubCategoryItem
								key={subCategory.id}
								category={subCategory}
								onDelete={onDelete}
							/>
						))}
					</div>
				)}
			</CardContent>
		</Card>
	);
}
