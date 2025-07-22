import { Button } from "@/components/ui/button";
import { EntitySelect } from "@/components/ui/entity-select";
import {
	Form,
	FormControl,
	FormField,
	FormItem,
	FormLabel,
	FormMessage,
} from "@/components/ui/form";
import { orpc, queryClient } from "@/utils/orpc";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQuery } from "@tanstack/react-query";
import { type SubmitHandler, useForm } from "react-hook-form";
import { toast } from "sonner";
import { z } from "zod";
import type { MerchantWithKeywordsAndCategory } from "../../../../server/src/routers";

const formSchema = z.object({
	targetMerchantId: z.string().min(1, "Please select a target merchant"),
});

type FormValues = z.infer<typeof formSchema>;

interface MergeMerchantFormProps {
	sourceMerchant: MerchantWithKeywordsAndCategory;
	callback?: () => void;
}

export function MergeMerchantForm({
	sourceMerchant,
	callback,
}: MergeMerchantFormProps) {
	const form = useForm<FormValues>({
		defaultValues: {
			targetMerchantId: "",
		},
		resolver: zodResolver(formSchema),
	});

	const { data: merchants } = useQuery(
		orpc.merchants.getUserMerchants.queryOptions(),
	);

	const { mutateAsync: mergeMerchants, isPending } = useMutation(
		orpc.merchants.mergeMerchants.mutationOptions({
			onSuccess: () => {
				queryClient.invalidateQueries({
					queryKey: orpc.merchants.getUserMerchants.queryOptions().queryKey,
				});
			},
		}),
	);

	const onSubmit: SubmitHandler<FormValues> = async (values) => {
		try {
			const result = await mergeMerchants({
				sourceMerchantId: sourceMerchant.id,
				targetMerchantId: values.targetMerchantId,
			});

			toast.success(result.message);
			callback?.();
			form.reset();
		} catch (error) {
			toast.error(
				`Failed to merge merchant: ${
					error instanceof Error ? error.message : "Unknown error"
				}`,
			);
		}
	};

	// Filter out the source merchant from the available options
	const availableMerchants =
		merchants?.filter((merchant) => merchant.id !== sourceMerchant.id) ?? [];

	if (availableMerchants.length === 0) {
		return (
			<div className="text-center p-4">
				<p className="text-muted-foreground">
					No other merchants available to merge into.
				</p>
			</div>
		);
	}

	return (
		<Form {...form}>
			<form
				onSubmit={form.handleSubmit(onSubmit)}
				className="mt-4 space-y-4 w-full"
			>
				<div className="p-4 bg-muted rounded-lg">
					<h4 className="font-medium mb-2">Merging "{sourceMerchant.name}"</h4>
					<p className="text-sm text-muted-foreground mb-3">This will:</p>
					<ul className="text-sm text-muted-foreground space-y-1 list-disc list-inside">
						<li>Add any missing keywords to the target merchant</li>
						<li>Reassign all transactions to the target merchant</li>
						<li>Delete the source merchant</li>
					</ul>
					{sourceMerchant.keywords && sourceMerchant.keywords.length > 0 && (
						<div className="mt-3">
							<p className="text-sm text-muted-foreground mb-1">
								Keywords that will be merged:
							</p>
							<div className="flex flex-wrap gap-1">
								{sourceMerchant.keywords.map((keyword) => (
									<span
										key={keyword.id}
										className="inline-flex items-center rounded-full bg-background px-2 py-0.5 text-xs"
									>
										{keyword.keyword}
									</span>
								))}
							</div>
						</div>
					)}
				</div>

				<FormField
					control={form.control}
					name="targetMerchantId"
					render={({ field }) => (
						<FormItem>
							<FormLabel>Target Merchant</FormLabel>
							<FormControl>
								<EntitySelect
									value={field.value}
									onValueChange={field.onChange}
									placeholder="Select merchant to merge into..."
									className="w-full min-w-fit"
									entities={availableMerchants.map(({ id, name }) => ({
										id,
										name,
									}))}
									emptyLabel="No merchants available"
								/>
							</FormControl>
							<FormMessage />
						</FormItem>
					)}
				/>

				<Button
					type="submit"
					className="w-full"
					disabled={isPending}
					variant="destructive"
				>
					{isPending ? "Merging..." : "Merge Merchant"}
				</Button>
			</form>
		</Form>
	);
}
