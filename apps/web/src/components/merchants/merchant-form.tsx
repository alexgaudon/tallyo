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
import type { MerchantWithKeywordsAndCategory } from "../../../../server/src/routers";

const formSchema = z.object({
	name: z.string().min(1, "Name is required"),
	recommendedCategoryId: z.string().optional(),
	keywords: z.string().optional(),
});

type FormValues = z.infer<typeof formSchema>;

interface MerchantFormProps {
	merchant?: MerchantWithKeywordsAndCategory;
	callback?: () => void;
}

export function MerchantForm({ merchant, callback }: MerchantFormProps) {
	const { data: categoriesData } = useQuery(
		orpc.categories.getUserCategories.queryOptions(),
	);

	const form = useForm<FormValues>({
		defaultValues: {
			name: merchant?.name ?? "",
			recommendedCategoryId: merchant?.recommendedCategoryId ?? undefined,
			keywords: merchant?.keywords?.keywords ?? "",
		},
		resolver: zodResolver(formSchema),
	});

	const { mutateAsync: createMerchant } = useMutation({
		mutationFn: orpc.merchants.createMerchant.call,
		onSuccess: () => {
			queryClient.invalidateQueries({
				queryKey: orpc.merchants.getUserMerchants.queryOptions().queryKey,
			});
		},
	});

	const { mutateAsync: updateMerchant } = useMutation({
		mutationFn: orpc.merchants.updateMerchant.call,
		onSuccess: () => {
			queryClient.invalidateQueries({
				queryKey: orpc.merchants.getUserMerchants.queryOptions().queryKey,
			});
		},
	});

	async function onSubmit(values: FormValues) {
		try {
			if (merchant) {
				await updateMerchant({
					id: merchant.id,
					name: values.name,
					...(values.recommendedCategoryId && {
						recommendedCategoryId: values.recommendedCategoryId,
					}),
					...(values.keywords && {
						keywords: values.keywords.split(",").map((k) => k.trim()),
					}),
				});
			} else {
				await createMerchant({
					name: values.name,
					...(values.recommendedCategoryId && {
						recommendedCategoryId: values.recommendedCategoryId,
					}),
					...(values.keywords && {
						keywords: values.keywords.split(",").map((k) => k.trim()),
					}),
				});
			}

			callback?.();
			if (!merchant) {
				form.reset();
			}
		} catch (error) {
			console.error(
				`Failed to ${merchant ? "update" : "create"} merchant:`,
				error,
			);
		}
	}

	const categories = categoriesData?.categories ?? [];

	return (
		<Form {...form}>
			<form onSubmit={form.handleSubmit(onSubmit)} className="mt-4 space-y-4">
				<FormField
					control={form.control}
					name="name"
					render={({ field }) => (
						<FormItem>
							<FormLabel>Merchant Name</FormLabel>
							<FormControl>
								<Input
									placeholder="Enter merchant name"
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
					name="recommendedCategoryId"
					render={({ field }) => (
						<FormItem>
							<FormLabel>Recommended Category (Optional)</FormLabel>
							<Select onValueChange={field.onChange} value={field.value}>
								<FormControl>
									<SelectTrigger>
										<SelectValue placeholder="Select a category" />
									</SelectTrigger>
								</FormControl>
								<SelectContent>
									{categories.map((category) => (
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
					name="keywords"
					render={({ field }) => (
						<FormItem>
							<FormLabel>Keywords (Optional)</FormLabel>
							<FormControl>
								<Input
									placeholder="Enter keywords separated by commas"
									{...field}
									autoComplete="off"
								/>
							</FormControl>
							<FormMessage />
						</FormItem>
					)}
				/>

				<Button type="submit" className="w-full">
					{merchant ? "Update Merchant" : "Create Merchant"}
				</Button>
			</form>
		</Form>
	);
}
