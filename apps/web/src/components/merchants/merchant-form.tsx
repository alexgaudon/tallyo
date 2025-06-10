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
import { KeywordPills } from "@/components/ui/keyword-pills";
import { orpc, queryClient } from "@/utils/orpc";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation } from "@tanstack/react-query";
import { type SubmitHandler, useForm } from "react-hook-form";
import { z } from "zod";
import type { MerchantWithKeywordsAndCategory } from "../../../../server/src/routers";
import { CategorySelect } from "../categories/category-select";

const formSchema = z.object({
	name: z.string().min(1, "Name is required"),
	recommendedCategoryId: z.string().optional(),
	keywords: z.array(z.string()),
});

type FormValues = z.infer<typeof formSchema>;

interface MerchantFormProps {
	merchant?: MerchantWithKeywordsAndCategory;
	callback?: () => void;
}

export function MerchantForm({ merchant, callback }: MerchantFormProps) {
	const form = useForm<FormValues>({
		defaultValues: {
			name: merchant?.name ?? "",
			recommendedCategoryId: merchant?.recommendedCategoryId ?? undefined,
			keywords: merchant?.keywords
				? Array.isArray(merchant.keywords)
					? merchant.keywords.map((k) => k.keyword)
					: []
				: [],
		},
		resolver: zodResolver(formSchema),
	});

	const { mutateAsync: createMerchant } = useMutation(
		orpc.merchants.createMerchant.mutationOptions({
			onSuccess: () => {
				queryClient.invalidateQueries({
					queryKey: orpc.merchants.getUserMerchants.queryOptions().queryKey,
				});
			},
		}),
	);

	const { mutateAsync: updateMerchant } = useMutation(
		orpc.merchants.updateMerchant.mutationOptions({
			onSuccess: () => {
				queryClient.invalidateQueries({
					queryKey: orpc.merchants.getUserMerchants.queryOptions().queryKey,
				});
			},
		}),
	);

	const onSubmit: SubmitHandler<FormValues> = async (values) => {
		try {
			if (merchant) {
				await updateMerchant({
					id: merchant.id,
					name: values.name,
					...(values.recommendedCategoryId && {
						recommendedCategoryId: values.recommendedCategoryId,
					}),
					keywords: values.keywords,
				});
			} else {
				await createMerchant({
					name: values.name,
					...(values.recommendedCategoryId && {
						recommendedCategoryId: values.recommendedCategoryId,
					}),
					keywords: values.keywords,
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
	};

	return (
		<Form {...form}>
			<form
				onSubmit={form.handleSubmit(onSubmit)}
				className="mt-4 space-y-4 w-full"
			>
				<FormField
					control={form.control}
					name="name"
					render={({ field }) => (
						<FormItem className="w-full">
							<FormLabel>Merchant Name</FormLabel>
							<FormControl>
								<Input
									placeholder="Enter merchant name"
									{...field}
									autoComplete="off"
									className="w-full"
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
							<FormControl>
								<CategorySelect
									value={field.value}
									onValueChange={field.onChange}
									placeholder="Select a category"
									className="w-full"
								/>
							</FormControl>
							<FormMessage />
						</FormItem>
					)}
				/>

				<FormField
					control={form.control}
					name="keywords"
					render={({ field }) => (
						<FormItem className="w-full">
							<FormLabel>Keywords (Optional)</FormLabel>
							<FormControl>
								<KeywordPills
									value={field.value}
									onChange={field.onChange}
									placeholder="Add keywords..."
									className="w-full"
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
