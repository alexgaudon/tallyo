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
	value?: string;
	onValueChange: (value: string) => void;
	placeholder?: string;
	excludeCategoryId?: string;
	className?: string;
}

export function CategorySelect({
	value,
	onValueChange,
	placeholder = "Select a category",
	excludeCategoryId,
	className,
}: CategorySelectProps) {
	const { data } = useQuery(orpc.categories.getUserCategories.queryOptions());

	const categories = data?.categories ?? [];
	const filteredCategories = excludeCategoryId
		? categories.filter((cat) => cat.id !== excludeCategoryId)
		: categories;

	const selectedCategory = categories.find((cat) => cat.id === value);

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
		<Select value={value} onValueChange={onValueChange}>
			<SelectTrigger className={className}>
				<SelectValue placeholder={placeholder}>
					{selectedCategory
						? formatCategoryName(selectedCategory)
						: placeholder}
				</SelectValue>
			</SelectTrigger>
			<SelectContent>
				{filteredCategories.map((category) => (
					<SelectItem key={category.id} value={category.id}>
						{formatCategoryName(category)}
					</SelectItem>
				))}
			</SelectContent>
		</Select>
	);
}
