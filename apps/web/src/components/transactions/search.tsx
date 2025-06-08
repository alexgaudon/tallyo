import { useNavigate, useSearch } from "@tanstack/react-router";
import { useDebounce } from "@uidotdev/usehooks";
import { useEffect, useState } from "react";
import { CategorySelect } from "../categories/category-select";
import { MerchantSelect } from "../merchants/merchant-select";
import { Input } from "../ui/input";

export function Search() {
	const params = useSearch({ from: "/transactions" });
	const [filter, setFilter] = useState(params.filter ?? "");
	const navigate = useNavigate();
	const debouncedFilter = useDebounce(filter, 300);
	const [category, setCategory] = useState<string | null>(
		params.category ?? null,
	);
	const [merchant, setMerchant] = useState<string | null>(
		params.merchant ?? null,
	);

	useEffect(() => {
		navigate({
			to: "/transactions",
			search: (prev) => ({
				...prev,
				filter: debouncedFilter || undefined,
				category: category || undefined,
				merchant: merchant || undefined,
				page: 1,
			}),
		});
	}, [debouncedFilter, category, merchant, navigate]);

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
			<MerchantSelect
				allowNull
				onValueChange={(value) => {
					if (value === "__null__") {
						setMerchant(null);
					} else {
						setMerchant(value);
					}
				}}
				value={merchant}
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
