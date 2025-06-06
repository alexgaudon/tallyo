import {
	DropdownMenu,
	DropdownMenuCheckboxItem,
	DropdownMenuContent,
	DropdownMenuLabel,
	DropdownMenuSeparator,
	DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useSession } from "@/lib/auth-client";
import { cn } from "@/lib/utils";
import { orpc } from "@/utils/orpc";
import { useQuery } from "@tanstack/react-query";
import { SlidersHorizontal } from "lucide-react";
import { useEffect, useState } from "react";
import { Button } from "../ui/button";
import { Input } from "../ui/input";

import { CategorySelect, formatCategory } from "../categories/category-select";

export type SearchParams = {
	filter: string;
	category: {
		id: string;
		name: string;
	} | null;
	onlyUnreviewed: boolean;
	onlyWithoutPayee: boolean;
	onlyWithoutCategory: boolean;
};

export default function Search({
	searchFn,
	initialSearch,
}: {
	searchFn?: (search: SearchParams) => void;
	initialSearch?: SearchParams;
}) {
	const [isOpen, setIsOpen] = useState(false);
	const [search, setSearch] = useState(initialSearch?.filter ?? "");
	const [category, setCategory] = useState<{
		id: string;
		name: string;
	} | null>(initialSearch?.category ?? null);
	const [onlyUnreviewed, setOnlyUnreviewed] = useState(
		initialSearch?.onlyUnreviewed ?? false,
	);
	const [onlyWithoutPayee, setOnlyWithoutPayee] = useState(
		initialSearch?.onlyWithoutPayee ?? false,
	);
	const [onlyWithoutCategory, setOnlyWithoutCategory] = useState(
		initialSearch?.onlyWithoutCategory ?? false,
	);

	const { data } = useSession();

	const { data: categories } = useQuery(
		orpc.categories.getUserCategories.queryOptions({
			select: (data) => data.categories,
		}),
	);

	const meta = data?.meta;

	// Notify parent of any state changes
	useEffect(() => {
		searchFn?.({
			filter: search,
			category,
			onlyUnreviewed,
			onlyWithoutPayee,
			onlyWithoutCategory,
		});
	}, [
		search,
		category,
		onlyUnreviewed,
		onlyWithoutPayee,
		onlyWithoutCategory,
		searchFn,
	]);

	const handleSearch = (e: React.ChangeEvent<HTMLInputElement>) => {
		setSearch(e.target.value);
	};

	const handleCategoryChange = (
		newCategory: { id: string; name: string } | null,
	) => {
		setCategory(newCategory);
	};

	const handleFilterChange = (
		filter: "unreviewed" | "withoutPayee" | "withoutCategory",
		checked: boolean,
	) => {
		switch (filter) {
			case "unreviewed":
				setOnlyUnreviewed(checked);
				break;
			case "withoutPayee":
				setOnlyWithoutPayee(checked);
				break;
			case "withoutCategory":
				setOnlyWithoutCategory(checked);
				break;
		}
	};

	return (
		<div className="flex flex-col gap-2">
			<div className="flex flex-wrap gap-2">
				<div className="flex items-center gap-2 font-medium text-muted-foreground text-sm">
					POPULAR CATEGORIES
				</div>
				{meta?.topFiveCategories?.map((option) => {
					if (!categories) return null;
					const filteredCategory = categories.find((c) => c.id === option.id);
					if (!filteredCategory) return null;

					return (
						<Button
							key={option.id}
							variant="outline"
							className={cn(
								"rounded-full text-sm",
								category?.id !== option.id &&
									"text-muted-foreground bg-secondary",
							)}
							onClick={() => handleCategoryChange(option)}
						>
							{formatCategory(filteredCategory)}
						</Button>
					);
				})}
			</div>

			<div className="flex items-center gap-2">
				<Input
					type="text"
					value={search}
					onChange={handleSearch}
					placeholder="Search transactions..."
				/>
				<CategorySelect
					value={category?.id}
					allowNull
					onValueChange={(value) => {
						const newCategory = value ? { id: value, name: "" } : null;
						handleCategoryChange(newCategory);
					}}
				/>
				<DropdownMenu open={isOpen} onOpenChange={setIsOpen}>
					<DropdownMenuTrigger asChild>
						<Button variant="outline" className="h-10">
							<SlidersHorizontal className="w-4 h-4" />
						</Button>
					</DropdownMenuTrigger>
					<DropdownMenuContent align="end" className="w-[200px]">
						<DropdownMenuLabel>Filters</DropdownMenuLabel>
						<DropdownMenuSeparator />
						<DropdownMenuCheckboxItem
							checked={onlyUnreviewed}
							onCheckedChange={(checked) =>
								handleFilterChange("unreviewed", checked)
							}
						>
							Show Unreviewed Only
						</DropdownMenuCheckboxItem>
						<DropdownMenuCheckboxItem
							checked={onlyWithoutPayee}
							onCheckedChange={(checked) =>
								handleFilterChange("withoutPayee", checked)
							}
						>
							Show Without Payee Only
						</DropdownMenuCheckboxItem>
						<DropdownMenuCheckboxItem
							checked={onlyWithoutCategory}
							onCheckedChange={(checked) =>
								handleFilterChange("withoutCategory", checked)
							}
						>
							Show Without Category Only
						</DropdownMenuCheckboxItem>
					</DropdownMenuContent>
				</DropdownMenu>
			</div>
		</div>
	);
}
