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
	const { data } = useQuery(orpc.merchants.getUserMerchants.queryOptions());

	const merchants: MerchantWithKeywordsAndCategory[] = data ?? [];
	const entities = merchants.map(({ id, name }) => ({ id, name }));

	return (
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
		/>
	);
}
