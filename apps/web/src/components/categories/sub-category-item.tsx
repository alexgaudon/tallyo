import { Button } from "@/components/ui/button";
import type { LucideIcon } from "lucide-react";
import * as LucideIcons from "lucide-react";
import { FolderIcon, XIcon } from "lucide-react";
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

interface SubCategoryItemProps {
	category: Category;
	onDelete: (id: string) => Promise<void>;
}

export function SubCategoryItem({ category, onDelete }: SubCategoryItemProps) {
	const Icon = category.icon
		? (LucideIcons[category.icon as keyof typeof LucideIcons] as LucideIcon)
		: FolderIcon;

	return (
		<div className="flex items-center justify-between rounded-md border bg-muted/50 p-2 pl-8">
			<div className="flex items-center gap-2">
				<Icon className="h-3 w-3 text-muted-foreground" />
				<span className="text-sm">{category.name}</span>
			</div>

			<AlertDialog>
				<AlertDialogTrigger asChild>
					<Button
						variant="ghost"
						size="icon"
						className="h-6 w-6 text-muted-foreground hover:text-destructive"
					>
						<XIcon className="h-4 w-4" />
					</Button>
				</AlertDialogTrigger>
				<AlertDialogContent>
					<AlertDialogHeader>
						<AlertDialogTitle>Delete Category</AlertDialogTitle>
						<AlertDialogDescription>
							Are you sure you want to delete this category? This action cannot
							be undone.
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
	);
}
