import { orpc } from "@/utils/orpc";
import { useQuery } from "@tanstack/react-query";
import { ArrowRight } from "lucide-react";
import type { Category } from "../../../../server/src/routers";
import { EntitySelect } from "../ui/entity-select";

interface CategorySelectProps {
	value?: string | null;
	onValueChange: (value: string | null) => void;
	placeholder?: string;
	excludeCategoryId?: string;
	className?: string;
	allowNull?: boolean;
	disabled?: boolean;
}

export function CategorySelect({
	value,
	onValueChange,
	placeholder = "Select a category",
	excludeCategoryId,
	className,
	allowNull = false,
	disabled = false,
}: CategorySelectProps) {
	const { data } = useQuery(orpc.categories.getUserCategories.queryOptions());

	const categories = data?.categories ?? [];
	const filteredCategories = excludeCategoryId
		? categories.filter((cat) => cat.id !== excludeCategoryId)
		: categories;

	const formatCategory = (category: Category) => {
		if (category.parentCategory) {
			return (
				<span className="flex items-center gap-1">
					{category.parentCategory.name}
					<ArrowRight className="h-3 w-3" />
					{category.name}
				</span>
			);
		}
		return category.name;
	};

	return (
		<EntitySelect
			value={value}
			onValueChange={onValueChange}
			placeholder={placeholder}
			className={className}
			allowNull={allowNull}
			entities={filteredCategories}
			formatEntity={formatCategory}
			nullLabel="No category"
			emptyLabel="No categories available"
			disabled={disabled}
		/>
	);
}
