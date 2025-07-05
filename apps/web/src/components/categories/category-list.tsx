import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "@/components/ui/select";
import { FolderIcon, SearchIcon, XIcon } from "lucide-react";
import { useMemo, useState } from "react";
import { CategoryCard } from "./category-card";

import type { Category } from "../../../../server/src/routers";

interface CategoryListProps {
	categories: Category[];
	isLoading: boolean;
	onDelete: (id: string) => Promise<void>;
}

type FilterType = "all" | "income" | "expense";

export function CategoryList({
	categories,
	isLoading,
	onDelete,
}: CategoryListProps) {
	const [searchQuery, setSearchQuery] = useState("");
	const [filterType, setFilterType] = useState<FilterType>("all");

	// Filter categories based on search query and filter type
	const filteredCategories = useMemo(() => {
		let filtered = categories;

		// Filter by search query
		if (searchQuery.trim()) {
			const query = searchQuery.toLowerCase();
			filtered = filtered.filter((category) =>
				category.name.toLowerCase().includes(query),
			);
		}

		// Filter by type (income/expense)
		if (filterType !== "all") {
			filtered = filtered.filter((category) => {
				if (filterType === "income") {
					return category.treatAsIncome;
				}
				return !category.treatAsIncome;
			});
		}

		return filtered;
	}, [categories, searchQuery, filterType]);

	if (isLoading) {
		return (
			<div className="flex items-center justify-center p-8">
				<div className="text-muted-foreground">Loading categories...</div>
			</div>
		);
	}

	if (!categories.length) {
		return (
			<Card>
				<CardContent className="flex flex-col items-center justify-center p-8 text-center">
					<FolderIcon className="mb-2 h-12 w-12 text-muted-foreground" />
					<h3 className="mb-1 text-lg font-semibold">No categories yet</h3>
					<p className="text-sm text-muted-foreground">
						Create your first category to get started
					</p>
				</CardContent>
			</Card>
		);
	}

	const parentCategories = filteredCategories.filter(
		(cat) => !cat.parentCategory,
	);
	const childCategories = filteredCategories.filter(
		(cat) => cat.parentCategory,
	);

	return (
		<div className="space-y-4">
			{/* Search and Filter Controls */}
			<div className="flex flex-col gap-3 sm:flex-row sm:items-center">
				<div className="relative flex-1">
					<SearchIcon className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
					<Input
						placeholder="Search categories..."
						value={searchQuery}
						onChange={(e) => setSearchQuery(e.target.value)}
						className="pl-9"
					/>
				</div>
				<Select
					value={filterType}
					onValueChange={(value: FilterType) => setFilterType(value)}
				>
					<SelectTrigger className="w-full sm:w-[140px]">
						<SelectValue />
					</SelectTrigger>
					<SelectContent>
						<SelectItem value="all">All Categories</SelectItem>
						<SelectItem value="income">Income</SelectItem>
						<SelectItem value="expense">Expense</SelectItem>
					</SelectContent>
				</Select>
			</div>

			{/* Results count */}
			{filteredCategories.length !== categories.length && (
				<div className="text-sm text-muted-foreground">
					Showing {filteredCategories.length} of {categories.length} categories
				</div>
			)}

			{/* No results message */}
			{filteredCategories.length === 0 && categories.length > 0 && (
				<Card>
					<CardContent className="flex flex-col items-center justify-center p-8 text-center">
						<SearchIcon className="mb-2 h-12 w-12 text-muted-foreground" />
						<h3 className="mb-1 text-lg font-semibold">
							No matching categories
						</h3>
						<p className="text-sm text-muted-foreground">
							Try adjusting your search or filter criteria
						</p>
					</CardContent>
				</Card>
			)}

			{/* Category List */}
			{filteredCategories.length > 0 && (
				<div className="space-y-4">
					{parentCategories.map((parent) => (
						<CategoryCard
							key={parent.id}
							category={parent}
							subCategories={childCategories.filter(
								(child) => child.parentCategory?.id === parent.id,
							)}
							onDelete={onDelete}
						/>
					))}

					{childCategories
						.filter(
							(child) =>
								!parentCategories.some(
									(parent) => parent.id === child.parentCategory?.id,
								),
						)
						.map((orphanedChild) => (
							<Card key={orphanedChild.id}>
								<CardContent className="p-4">
									<div className="flex items-center justify-between">
										<div className="flex items-center gap-2">
											<FolderIcon className="h-4 w-4 text-muted-foreground" />
											<div>
												<span className="font-medium">
													{orphanedChild.name}
												</span>
												<span className="ml-2 text-xs text-muted-foreground">
													(Orphaned category)
												</span>
											</div>
										</div>
										<Button
											variant="ghost"
											size="icon"
											className="h-8 w-8 text-muted-foreground hover:text-destructive"
											onClick={() => onDelete(orphanedChild.id)}
										>
											<XIcon className="h-4 w-4" />
										</Button>
									</div>
								</CardContent>
							</Card>
						))}
				</div>
			)}
		</div>
	);
}
