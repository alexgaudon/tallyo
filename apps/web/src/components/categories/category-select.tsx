import { orpc } from "@/utils/orpc";
import { useQuery } from "@tanstack/react-query";
import { ArrowRight, EditIcon, PlusIcon, XIcon } from "lucide-react";
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
	// New props for action buttons
	onEditCategory?: (categoryId: string) => void;
	onCreateCategory?: () => void;
	showActionButtons?: boolean;
}

export const formatCategory = (category: Category) => {
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

export const formatCategoryText = (category: Category) => {
	if (category.parentCategory) {
		return `${category.parentCategory.name} → ${category.name}`;
	}
	return category.name;
};

export function CategorySelect({
	value,
	onValueChange,
	placeholder = "Select a category",
	excludeCategoryId,
	className,
	allowNull = false,
	disabled = false,
	// New props for action buttons
	onEditCategory,
	onCreateCategory,
	showActionButtons = false,
}: CategorySelectProps) {
	const { data } = useQuery(orpc.categories.getUserCategories.queryOptions());

	const categories = data?.categories ?? [];
	const filteredCategories = excludeCategoryId
		? categories.filter((cat) => cat.id !== excludeCategoryId)
		: categories;

	// Build action buttons
	const actionButtons = [];

	if (onCreateCategory) {
		actionButtons.push({
			label: "Create New Category",
			icon: <PlusIcon />,
			onClick: onCreateCategory,
			variant: "outline" as const,
		});
	}

	// Edit Category button (only show if a category is selected)
	if (value && onEditCategory) {
		actionButtons.push({
			label: "Edit Category",
			icon: <EditIcon />,
			onClick: () => onEditCategory(value),
			variant: "outline" as const,
		});
	}

	if (value && allowNull) {
		actionButtons.push({
			label: "Clear Category",
			icon: <XIcon />,
			onClick: () => onValueChange(null),
			variant: "outline" as const,
		});
	}

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
			showActionButtons={showActionButtons || actionButtons.length > 0}
			actionButtons={actionButtons}
		/>
	);
}
