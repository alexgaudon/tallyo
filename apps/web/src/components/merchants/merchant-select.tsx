import { orpc } from "@/utils/orpc";
import { useQuery } from "@tanstack/react-query";
import type { MerchantWithKeywordsAndCategory } from "../../../../server/src/routers";
import { EntitySelect } from "../ui/entity-select";

interface MerchantSelectProps {
	value?: string | null;
	onValueChange: (value: string | null) => void;
	placeholder?: string;
	className?: string;
	allowNull?: boolean;
	disabled?: boolean;
}

export function MerchantSelect({
	value,
	onValueChange,
	placeholder = "Select a merchant",
	className,
	allowNull = false,
	disabled = false,
}: MerchantSelectProps) {
	const { data } = useQuery(orpc.merchants.getUserMerchants.queryOptions());

	const merchants: MerchantWithKeywordsAndCategory[] = data ?? [];

	return (
		<EntitySelect
			value={value}
			onValueChange={onValueChange}
			placeholder={placeholder}
			className={className}
			allowNull={allowNull}
			entities={merchants}
			nullLabel="No merchant"
			emptyLabel="No merchants available"
			disabled={disabled}
		/>
	);
}
