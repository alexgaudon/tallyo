import { CategorySelect } from "@/components/categories/category-select";
import { MerchantSelect } from "@/components/merchants/merchant-select";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
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
	Popover,
	PopoverContent,
	PopoverTrigger,
} from "@/components/ui/popover";
import { orpc, queryClient } from "@/utils/orpc";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation } from "@tanstack/react-query";
import { format } from "date-fns";
import { CalendarIcon } from "lucide-react";
import { useForm } from "react-hook-form";
import { z } from "zod";

const formSchema = z.object({
	amount: z
		.string()
		.min(1, "Amount is required")
		.refine((val) => {
			const num = Number.parseFloat(val);
			return !Number.isNaN(num) && num > 0;
		}, "Amount must be a positive number"),
	date: z.string().min(1, "Date is required"),
	transactionDetails: z.string().min(1, "Transaction details are required"),
	isIncome: z.boolean(),
	merchantId: z.string().optional(),
	categoryId: z.string().optional(),
	notes: z.string().optional(),
});

type FormValues = z.infer<typeof formSchema>;

export function CreateTransactionForm({
	callback,
}: {
	callback?: () => void;
}) {
	const form = useForm<FormValues>({
		defaultValues: {
			amount: "",
			date: format(new Date(), "yyyy-MM-dd"),
			transactionDetails: "",
			isIncome: false,
			merchantId: undefined,
			categoryId: undefined,
			notes: "",
		},
		resolver: zodResolver(formSchema),
	});

	const { mutateAsync: createTransaction, isPending } = useMutation(
		orpc.transactions.createTransaction.mutationOptions({
			onSuccess: () => {
				queryClient.invalidateQueries({
					queryKey: ["transactions", "getUserTransactions"],
				});
			},
		}),
	);

	async function onSubmit(values: FormValues) {
		try {
			// Convert amount to negative for expenses, positive for income
			const amountInCents = Math.round(Number.parseFloat(values.amount) * 100);
			const finalAmount = values.isIncome ? amountInCents : -amountInCents;

			await createTransaction({
				amount: finalAmount,
				date: new Date(values.date),
				transactionDetails: values.transactionDetails,
				...(values.merchantId && { merchantId: values.merchantId }),
				...(values.categoryId && { categoryId: values.categoryId }),
				...(values.notes && { notes: values.notes }),
			});

			queryClient.invalidateQueries({
				queryKey: ["transactions", "getUserTransactions"],
			});

			callback?.();

			form.reset({
				amount: "",
				date: format(new Date(), "yyyy-MM-dd"),
				transactionDetails: "",
				isIncome: false,
				merchantId: undefined,
				categoryId: undefined,
				notes: "",
			});
		} catch (error) {
			console.error("Failed to create transaction:", error);
		}
	}

	return (
		<Form {...form}>
			<form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4 w-full">
				<div className="grid grid-cols-2 gap-4">
					<FormField
						control={form.control}
						name="amount"
						render={({ field }) => (
							<FormItem>
								<FormLabel>Amount</FormLabel>
								<FormControl>
									<Input
										type="number"
										step="0.01"
										placeholder="10.00"
										{...field}
										className="w-full"
									/>
								</FormControl>
								<FormMessage />
							</FormItem>
						)}
					/>

					<FormField
						control={form.control}
						name="isIncome"
						render={({ field }) => (
							<FormItem>
								<FormLabel>Type</FormLabel>
								<FormControl>
									<div className="flex gap-4">
										<label className="flex items-center space-x-2 cursor-pointer">
											<input
												type="radio"
												value="false"
												checked={!field.value}
												onChange={() => field.onChange(false)}
												className="w-4 h-4 text-blue-600 bg-gray-100 border-gray-300 focus:ring-blue-500"
											/>
											<span className="text-sm font-medium">Expense</span>
										</label>
										<label className="flex items-center space-x-2 cursor-pointer">
											<input
												type="radio"
												value="true"
												checked={field.value}
												onChange={() => field.onChange(true)}
												className="w-4 h-4 text-blue-600 bg-gray-100 border-gray-300 focus:ring-blue-500"
											/>
											<span className="text-sm font-medium">Income</span>
										</label>
									</div>
								</FormControl>
								<FormMessage />
							</FormItem>
						)}
					/>
				</div>

				<div className="grid grid-cols-2 gap-4">
					<FormField
						control={form.control}
						name="date"
						render={({ field }) => (
							<FormItem>
								<FormLabel>Date</FormLabel>
								<FormControl>
									<Popover>
										<PopoverTrigger asChild>
											<Button
												variant="outline"
												className="w-full justify-between font-normal"
											>
												{field.value
													? format(new Date(field.value), "PPP")
													: "Select date"}
												<CalendarIcon className="h-4 w-4" />
											</Button>
										</PopoverTrigger>
										<PopoverContent className="w-auto p-0" align="start">
											<Calendar
												mode="single"
												selected={
													field.value ? new Date(field.value) : undefined
												}
												onSelect={(date) => {
													field.onChange(
														date ? format(date, "yyyy-MM-dd") : "",
													);
												}}
											/>
										</PopoverContent>
									</Popover>
								</FormControl>
								<FormMessage />
							</FormItem>
						)}
					/>

					<FormField
						control={form.control}
						name="transactionDetails"
						render={({ field }) => (
							<FormItem>
								<FormLabel>Transaction Details</FormLabel>
								<FormControl>
									<Input
										placeholder="Enter transaction details"
										{...field}
										className="w-full"
									/>
								</FormControl>
								<FormMessage />
							</FormItem>
						)}
					/>
				</div>

				<div className="grid grid-cols-2 gap-4">
					<FormField
						control={form.control}
						name="merchantId"
						render={({ field }) => (
							<FormItem>
								<FormLabel>Merchant (Optional)</FormLabel>
								<FormControl>
									<MerchantSelect
										value={field.value}
										onValueChange={field.onChange}
										placeholder="Select a merchant"
										className="w-full"
									/>
								</FormControl>
								<FormMessage />
							</FormItem>
						)}
					/>

					<FormField
						control={form.control}
						name="categoryId"
						render={({ field }) => (
							<FormItem>
								<FormLabel>Category (Optional)</FormLabel>
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
				</div>

				<FormField
					control={form.control}
					name="notes"
					render={({ field }) => (
						<FormItem>
							<FormLabel>Notes (Optional)</FormLabel>
							<FormControl>
								<Input
									placeholder="Add notes..."
									{...field}
									className="w-full"
								/>
							</FormControl>
							<FormMessage />
						</FormItem>
					)}
				/>

				<Button type="submit" className="w-full" disabled={isPending}>
					{isPending ? "Creating..." : "Create Transaction"}
				</Button>
			</form>
		</Form>
	);
}
