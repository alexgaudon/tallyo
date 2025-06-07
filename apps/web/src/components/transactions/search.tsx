import { useNavigate, useSearch } from "@tanstack/react-router";
import { useDebounce } from "@uidotdev/usehooks";
import { useEffect, useState } from "react";
import { CategorySelect } from "../categories/category-select";
import { Input } from "../ui/input";

export function Search() {
	const params = useSearch({ from: "/transactions" });
	const [filter, setFilter] = useState(params.filter ?? "");
	const navigate = useNavigate();
	const debouncedFilter = useDebounce(filter, 300);
	const [category, setCategory] = useState<string | null>(
		params.category ?? null,
	);

	useEffect(() => {
		navigate({
			to: "/transactions",
			search: (prev) => ({
				...prev,
				filter: debouncedFilter,
				category: category || undefined,
				page: 1,
			}),
		});
	}, [debouncedFilter, category, navigate]);

	const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
		setFilter(e.target.value);
	};

	return (
		<div className="flex items-center gap-2">
			<Input
				value={filter}
				onChange={handleChange}
				placeholder="Search transactions..."
			/>
			<CategorySelect
				allowNull
				onValueChange={(value) => {
					if (value === "__null__") {
						setCategory(null);
					} else {
						setCategory(value);
					}
				}}
				value={category}
			/>
		</div>
	);
}
