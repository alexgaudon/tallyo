import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "@/components/ui/select";
import { orpc } from "@/utils/orpc";
import { useQuery } from "@tanstack/react-query";
import { ArrowRight } from "lucide-react";

interface CategorySelectProps {
	value?: string | null;
	onValueChange: (value: string | null) => void;
	placeholder?: string;
	excludeCategoryId?: string;
	className?: string;
	allowNull?: boolean;
}

export function CategorySelect({
	value,
	onValueChange,
	placeholder = "Select a category",
	excludeCategoryId,
	className,
	allowNull = false,
}: CategorySelectProps) {
	const { data } = useQuery(orpc.categories.getUserCategories.queryOptions());

	const categories = data?.categories ?? [];
	const filteredCategories = excludeCategoryId
		? categories.filter((cat) => cat.id !== excludeCategoryId)
		: categories;

	const selectedCategory = value
		? categories.find((cat) => cat.id === value)
		: null;

	const formatCategoryName = (category: (typeof categories)[0]) => {
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
		<Select value={value ?? ""} onValueChange={onValueChange}>
			<SelectTrigger className={className}>
				<SelectValue placeholder={placeholder}>
					{selectedCategory
						? formatCategoryName(selectedCategory)
						: value === null && allowNull
							? "No category"
							: placeholder}
				</SelectValue>
			</SelectTrigger>
			<SelectContent>
				{allowNull && <SelectItem value="__null__">No category</SelectItem>}
				{filteredCategories.length === 0 ? (
					<div className="relative flex w-full cursor-default select-none items-center rounded-sm py-1.5 pl-8 pr-2 text-sm text-muted-foreground">
						No categories available
					</div>
				) : (
					filteredCategories.map((category) => (
						<SelectItem key={category.id} value={category.id}>
							{formatCategoryName(category)}
						</SelectItem>
					))
				)}
			</SelectContent>
		</Select>
	);
}
