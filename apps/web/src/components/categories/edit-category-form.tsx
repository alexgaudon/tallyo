import { Button } from "@/components/ui/button";
import {
	Form,
	FormControl,
	FormField,
	FormItem,
	FormLabel,
	FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "@/components/ui/select";
import { orpc, queryClient } from "@/utils/orpc";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQuery } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { z } from "zod";
import type { Category } from "../../../../server/src/routers";
import { Switch } from "../ui/switch";
import { IconPicker } from "./icon-picker";

const formSchema = z.object({
	name: z.string().min(1, "Name is required"),
	parentCategoryId: z.string().optional(),
	icon: z.string().optional(),
	treatAsIncome: z.boolean().optional(),
	hideFromInsights: z.boolean().optional(),
});

type FormValues = z.infer<typeof formSchema>;

interface EditCategoryFormProps {
	category: Category;
	callback?: () => void;
}

export function EditCategoryForm({
	category,
	callback,
}: EditCategoryFormProps) {
	const { data } = useQuery(orpc.categories.getUserCategories.queryOptions());

	const form = useForm<FormValues>({
		defaultValues: {
			name: category.name,
			parentCategoryId: category.parentCategory?.id ?? "none",
			icon: category.icon ?? undefined,
			treatAsIncome: category.treatAsIncome,
			hideFromInsights: category.hideFromInsights,
		},
		resolver: zodResolver(formSchema),
	});

	const { mutateAsync: updateCategory } = useMutation(
		orpc.categories.updateCategory.mutationOptions({
			onSuccess: () => {
				queryClient.invalidateQueries({
					queryKey: orpc.categories.getUserCategories.queryOptions().queryKey,
				});
			},
		}),
	);

	async function onSubmit(values: FormValues) {
		try {
			await updateCategory({
				id: category.id,
				name: values.name,
				...(values.parentCategoryId &&
					values.parentCategoryId !== "none" && {
						parentCategoryId: values.parentCategoryId,
					}),
				...(values.parentCategoryId === "none" && {
					parentCategoryId: null,
				}),
				...(values.icon && { icon: values.icon }),
				...(values.treatAsIncome !== undefined && {
					treatAsIncome: values.treatAsIncome,
				}),
				...(values.hideFromInsights !== undefined && {
					hideFromInsights: values.hideFromInsights,
				}),
			});

			callback?.();
		} catch (error) {
			console.error("Failed to update category:", error);
		}
	}

	const parentCategories =
		data?.categories.filter(
			(cat) => !cat.parentCategory && cat.id !== category.id,
		) ?? [];

	return (
		<Form {...form}>
			<form onSubmit={form.handleSubmit(onSubmit)} className="mt-4 space-y-4">
				<FormField
					control={form.control}
					name="name"
					render={({ field }) => (
						<FormItem>
							<FormLabel>Category Name</FormLabel>
							<FormControl>
								<Input
									placeholder="Enter category name"
									{...field}
									autoComplete="off"
								/>
							</FormControl>
							<FormMessage />
						</FormItem>
					)}
				/>

				<FormField
					control={form.control}
					name="icon"
					render={({ field }) => (
						<FormItem>
							<FormLabel>Icon (Optional)</FormLabel>
							<FormControl>
								<IconPicker
									value={field.value}
									onValueChange={field.onChange}
								/>
							</FormControl>
							<FormMessage />
						</FormItem>
					)}
				/>

				<div className="grid grid-cols-3">
					<FormField
						control={form.control}
						name="parentCategoryId"
						render={({ field }) => (
							<FormItem>
								<FormLabel>Parent Category (Optional)</FormLabel>
								<Select
									onValueChange={field.onChange}
									value={field.value ?? "none"}
								>
									<FormControl>
										<SelectTrigger>
											<SelectValue placeholder="Select a parent category" />
										</SelectTrigger>
									</FormControl>
									<SelectContent>
										<SelectItem value="none">None</SelectItem>
										{parentCategories.map((category) => (
											<SelectItem key={category.id} value={category.id}>
												{category.name}
											</SelectItem>
										))}
									</SelectContent>
								</Select>
								<FormMessage />
							</FormItem>
						)}
					/>

					<FormField
						control={form.control}
						name="treatAsIncome"
						render={({ field }) => (
							<FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
								<div className="space-y-0.5">
									<FormLabel className="text-base">Treat as Income</FormLabel>
								</div>
								<FormControl>
									<Switch
										checked={field.value}
										onCheckedChange={field.onChange}
									/>
								</FormControl>
							</FormItem>
						)}
					/>

					<FormField
						control={form.control}
						name="hideFromInsights"
						render={({ field }) => (
							<FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
								<div className="space-y-0.5">
									<FormLabel className="text-base">
										Hide from Insights
									</FormLabel>
								</div>
								<FormControl>
									<Switch
										checked={field.value}
										onCheckedChange={field.onChange}
									/>
								</FormControl>
							</FormItem>
						)}
					/>
				</div>

				<Button type="submit" className="w-full">
					Update Category
				</Button>
			</form>
		</Form>
	);
}
