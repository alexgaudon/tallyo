import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogHeader,
	DialogTitle,
} from "@/components/ui/dialog";
import { CreateCategoryForm } from "./create-category-form";

interface CreateCategoryDialogProps {
	open: boolean;
	onOpenChange: (open: boolean) => void;
	onSuccess?: (categoryId: string) => void;
}

export function CreateCategoryDialog({
	open,
	onOpenChange,
	onSuccess,
}: CreateCategoryDialogProps) {
	const handleSuccess = (categoryId?: string) => {
		onOpenChange(false);
		if (categoryId && onSuccess) {
			onSuccess(categoryId);
		}
	};

	return (
		<Dialog open={open} onOpenChange={onOpenChange}>
			<DialogContent className="sm:max-w-[425px]">
				<DialogHeader>
					<DialogTitle>Create New Category</DialogTitle>
					<DialogDescription>
						Create a new category with optional parent category and settings.
					</DialogDescription>
				</DialogHeader>
				<CreateCategoryForm callback={handleSuccess} />
			</DialogContent>
		</Dialog>
	);
}
