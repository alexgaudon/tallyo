import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogHeader,
	DialogTitle,
} from "@/components/ui/dialog";
import { orpc } from "@/utils/orpc";
import { useQuery } from "@tanstack/react-query";
import { MerchantForm } from "./merchant-form";

interface EditMerchantDialogProps {
	open: boolean;
	onOpenChange: (open: boolean) => void;
	merchantId: string;
	onSuccess?: () => void;
}

export function EditMerchantDialog({
	open,
	onOpenChange,
	merchantId,
	onSuccess,
}: EditMerchantDialogProps) {
	const { data: merchants } = useQuery(
		orpc.merchants.getUserMerchants.queryOptions(),
	);

	const merchant = merchants?.find((m) => m.id === merchantId);

	const handleSuccess = () => {
		onOpenChange(false);
		onSuccess?.();
	};

	if (!merchant) {
		return null;
	}

	return (
		<Dialog open={open} onOpenChange={onOpenChange}>
			<DialogContent className="sm:max-w-[425px]">
				<DialogHeader>
					<DialogTitle>Edit Merchant</DialogTitle>
					<DialogDescription>
						Update merchant information, keywords, and category.
					</DialogDescription>
				</DialogHeader>
				<MerchantForm merchant={merchant} callback={handleSuccess} />
			</DialogContent>
		</Dialog>
	);
}
