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
import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import type { orpc } from "@/utils/orpc";
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
	const [editOpen, setEditOpen] = useState(false);
	const Icon = category.icon
		? // biome-ignore lint: dynamic icon access is required for user-selected icons
			(LucideIcons[category.icon as keyof typeof LucideIcons] as LucideIcon)
		: FolderIcon;

	return (
		<Card>
			<CardContent className="p-4">
				<div className="flex items-center justify-between">
					<div className="flex items-center gap-2">
						<Icon
							className={cn(
								"h-4 w-4 text-muted-foreground",
								category.treatAsIncome && "text-green-500",
							)}
						/>
						<span className="font-medium">{category.name}</span>
						<div className="flex items-center gap-1">
							{category.treatAsIncome && (
								<div className="flex items-center gap-1 rounded-md bg-green-100 px-2 py-1 text-xs text-green-700 dark:bg-green-900/20 dark:text-green-400">
									<DollarSignIcon className="h-3 w-3" />
									<span>Income</span>
								</div>
							)}
							{category.hideFromInsights && (
								<div className="flex items-center gap-1 rounded-md bg-orange-100 px-2 py-1 text-xs text-orange-700 dark:bg-orange-900/20 dark:text-orange-400">
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
									className="h-8 w-8 text-muted-foreground hover:text-primary"
								>
									<PencilIcon className="h-4 w-4" />
								</Button>
							</DialogTrigger>
							<DialogContent>
								<DialogHeader>
									<DialogTitle className="flex items-center gap-2 text-lg">
										<PencilIcon className="h-4 w-4" />
										Edit Category
									</DialogTitle>
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
