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
import { ensureSession } from "@/lib/auth-client";
import { orpc, queryClient } from "@/utils/orpc";
import { useMutation, useQuery } from "@tanstack/react-query";
import { createFileRoute } from "@tanstack/react-router";
import { FolderTreeIcon, PlusIcon } from "lucide-react";
import { useState } from "react";

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

	async function handleDelete(id: string) {
		await deleteCategory({ id });
	}

	return (
		<div className="container mx-auto max-w-4xl p-6 space-y-6">
			<div className="flex items-center justify-between">
				<div className="flex items-center gap-2">
					<FolderTreeIcon className="h-6 w-6" />
					<h1 className="text-2xl font-bold">Categories</h1>
				</div>
				<Dialog open={open} onOpenChange={setOpen}>
					<DialogTrigger asChild>
						<Button variant="outline">
							<PlusIcon className="h-4 w-4 mr-2" />
							New Category
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

			<div className="grid gap-6 md:grid-cols-[1fr,300px]">
				<CategoryList
					categories={categories ?? []}
					isLoading={isLoading}
					onDelete={handleDelete}
				/>
			</div>
		</div>
	);
}
