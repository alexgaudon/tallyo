import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogHeader,
	DialogTitle,
} from "@/components/ui/dialog";
import { MerchantForm } from "./merchant-form";

interface CreateMerchantDialogProps {
	open: boolean;
	onOpenChange: (open: boolean) => void;
	onSuccess?: (merchantId: string) => void;
	initialKeyword?: string;
}

export function CreateMerchantDialog({
	open,
	onOpenChange,
	onSuccess,
	initialKeyword,
}: CreateMerchantDialogProps) {
	const handleSuccess = (merchantId?: string) => {
		onOpenChange(false);
		if (merchantId && onSuccess) {
			onSuccess(merchantId);
		}
	};

	return (
		<Dialog open={open} onOpenChange={onOpenChange}>
			<DialogContent className="sm:max-w-[425px]">
				<DialogHeader>
					<DialogTitle>Create New Merchant</DialogTitle>
					<DialogDescription>
						Create a new merchant with optional keywords and category.
					</DialogDescription>
				</DialogHeader>
				<MerchantForm
					callback={handleSuccess}
					initialKeyword={initialKeyword}
				/>
			</DialogContent>
		</Dialog>
	);
}
