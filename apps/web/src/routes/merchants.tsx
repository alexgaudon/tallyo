import { CreateMerchantForm } from "@/components/merchants/create-merchant-form";
import { MerchantList } from "@/components/merchants/merchant-list";
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
import { Building2Icon, PlusIcon } from "lucide-react";
import { useState } from "react";

export const Route = createFileRoute("/merchants")({
	component: RouteComponent,
	beforeLoad: async ({ context }) => {
		ensureSession(context.isAuthenticated, "/merchants");

		await context.queryClient.ensureQueryData(
			orpc.merchants.getUserMerchants.queryOptions(),
		);
	},
});

function RouteComponent() {
	const [open, setOpen] = useState(false);
	const { data: merchants, isLoading } = useQuery(
		orpc.merchants.getUserMerchants.queryOptions(),
	);

	const { mutateAsync: deleteMerchant } = useMutation(
		orpc.merchants.deleteMerchant.mutationOptions({
			onSuccess: () => {
				queryClient.invalidateQueries({
					queryKey: orpc.merchants.getUserMerchants.queryOptions().queryKey,
				});
			},
		}),
	);

	async function handleDelete(id: string) {
		await deleteMerchant({ id });
	}

	return (
		<div className="container mx-auto max-w-4xl p-6 space-y-6">
			<div className="flex items-center justify-between">
				<div className="flex items-center gap-2">
					<Building2Icon className="h-6 w-6" />
					<h1 className="text-2xl font-bold">Merchants</h1>
				</div>
				<Dialog open={open} onOpenChange={setOpen}>
					<DialogTrigger asChild>
						<Button variant="outline">
							<PlusIcon className="h-4 w-4 mr-2" />
							New Merchant
						</Button>
					</DialogTrigger>
					<DialogContent>
						<DialogHeader>
							<DialogTitle className="flex items-center gap-2 text-lg">
								<PlusIcon className="h-4 w-4" />
								New Merchant
							</DialogTitle>
						</DialogHeader>
						<CreateMerchantForm callback={() => setOpen(false)} />
					</DialogContent>
				</Dialog>
			</div>

			<div className="grid gap-6 md:grid-cols-[1fr,300px]">
				<MerchantList
					merchants={merchants ?? []}
					isLoading={isLoading}
					onDelete={handleDelete}
				/>
			</div>
		</div>
	);
}
