import { orpc } from "@/utils/orpc";
import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import type { MerchantWithKeywordsAndCategory } from "../../../../server/src/routers";
import { EntitySelect } from "../ui/entity-select";
import { CreateMerchantDialog } from "./create-merchant-dialog";

interface MerchantSelectProps {
	value?: string | null;
	onValueChange: (value: string | null) => void;
	placeholder?: string;
	className?: string;
	allowNull?: boolean;
	disabled?: boolean;
	transactionDetails?: string;
}

export function MerchantSelect({
	value,
	onValueChange,
	placeholder = "Select a merchant",
	className,
	allowNull = false,
	disabled = false,
	transactionDetails,
}: MerchantSelectProps) {
	const [createDialogOpen, setCreateDialogOpen] = useState(false);
	const { data } = useQuery(orpc.merchants.getUserMerchants.queryOptions());

	const merchants: MerchantWithKeywordsAndCategory[] = data ?? [];
	const entities = merchants.map(({ id, name }) => ({ id, name }));

	const handleCreateSuccess = (merchantId: string) => {
		// Automatically select the newly created merchant
		onValueChange(merchantId);
	};

	return (
		<>
			<EntitySelect
				value={value}
				onValueChange={onValueChange}
				placeholder={transactionDetails ?? placeholder}
				className={className}
				allowNull={allowNull}
				entities={entities}
				nullLabel="No merchant"
				emptyLabel="No merchants available"
				disabled={disabled}
				showCreateOption={true}
				createOptionLabel="Create new merchant..."
				onCreateClick={() => setCreateDialogOpen(true)}
			/>
			<CreateMerchantDialog
				open={createDialogOpen}
				onOpenChange={setCreateDialogOpen}
				onSuccess={handleCreateSuccess}
			/>
		</>
	);
}
