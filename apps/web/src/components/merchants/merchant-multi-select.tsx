import { orpc } from "@/utils/orpc";
import { useQuery } from "@tanstack/react-query";
import { EditIcon, PlusIcon } from "lucide-react";
import { useState } from "react";
import type { MerchantWithKeywordsAndCategory } from "../../../../server/src/routers";
import { MultiEntitySelect } from "../ui/multi-entity-select";
import { CreateMerchantDialog } from "./create-merchant-dialog";

interface MerchantMultiSelectProps {
	value?: string[];
	onValueChange: (value: string[]) => void;
	placeholder?: string;
	className?: string;
	disabled?: boolean;
	// New props for action buttons
	showActionButtons?: boolean;
	onEditMerchant?: (merchantId: string) => void;
}

export function MerchantMultiSelect({
	value = [],
	onValueChange,
	placeholder = "Select merchants",
	className,
	disabled = false,
	// New props for action buttons
	showActionButtons = false,
	onEditMerchant,
}: MerchantMultiSelectProps) {
	const [createDialogOpen, setCreateDialogOpen] = useState(false);
	const { data } = useQuery(orpc.merchants.getUserMerchants.queryOptions());

	const merchants: MerchantWithKeywordsAndCategory[] = data ?? [];
	const entities = merchants.map(({ id, name }) => ({ id, name }));

	const handleCreateSuccess = (merchantId: string) => {
		// Automatically select the newly created merchant
		onValueChange([...value, merchantId]);
	};

	// Build action buttons
	const actionButtons = [];

	// Create New Merchant button
	actionButtons.push({
		label: "Create New Merchant",
		icon: <PlusIcon />,
		onClick: () => setCreateDialogOpen(true),
		variant: "outline" as const,
	});

	// Edit Merchant button (only show if merchants are selected)
	if (value.length > 0 && onEditMerchant) {
		actionButtons.push({
			label: "Edit Selected Merchant",
			icon: <EditIcon />,
			onClick: () => onEditMerchant(value[0]), // Edit the first selected merchant
			variant: "outline" as const,
		});
	}

	return (
		<>
			<MultiEntitySelect
				value={value}
				onValueChange={onValueChange}
				placeholder={placeholder}
				className={className}
				entities={entities}
				emptyLabel="No merchants available"
				disabled={disabled}
				showActionButtons={showActionButtons || actionButtons.length > 0}
				actionButtons={actionButtons}
			/>
			<CreateMerchantDialog
				open={createDialogOpen}
				onOpenChange={setCreateDialogOpen}
				onSuccess={handleCreateSuccess}
			/>
		</>
	);
}
