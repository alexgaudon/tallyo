import { useNavigate, useSearch } from "@tanstack/react-router";
import { useDebounce } from "@uidotdev/usehooks";
import { SlidersHorizontal } from "lucide-react";
import { useEffect, useState } from "react";
import { CategorySelect } from "../categories/category-select";
import { MerchantSelect } from "../merchants/merchant-select";
import { Button } from "../ui/button";
import {
	DropdownMenu,
	DropdownMenuCheckboxItem,
	DropdownMenuContent,
	DropdownMenuLabel,
	DropdownMenuSeparator,
	DropdownMenuTrigger,
} from "../ui/dropdown-menu";
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
	const [isOpenMobile, setIsOpenMobile] = useState(false);
	const [isOpenDesktop, setIsOpenDesktop] = useState(false);
	const [onlyUnreviewed, setOnlyUnreviewed] = useState(
		params.onlyUnreviewed ?? false,
	);
	const [onlyWithoutMerchant, setOnlyWithoutMerchant] = useState(
		params.onlyWithoutMerchant ?? false,
	);

	useEffect(() => {
		navigate({
			to: "/transactions",
			search: (prev) => ({
				...prev,
				filter: debouncedFilter || undefined,
				category: category || undefined,
				merchant: merchant || undefined,
				onlyUnreviewed: onlyUnreviewed || undefined,
				onlyWithoutMerchant: onlyWithoutMerchant || undefined,
				page: 1,
			}),
		});
	}, [
		debouncedFilter,
		category,
		merchant,
		onlyUnreviewed,
		onlyWithoutMerchant,
		navigate,
	]);

	const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
		setFilter(e.target.value);
	};

	return (
		<div className="flex flex-col gap-2 w-full">
			{/* Mobile layout: Two rows */}
			<div className="flex lg:hidden flex-col gap-2 w-full">
				{/* First row: Search input and filters dropdown */}
				<div className="flex gap-2 w-full">
					<Input
						value={filter}
						onChange={handleChange}
						placeholder="Search transactions..."
						className="flex-1"
					/>
					<DropdownMenu open={isOpenMobile} onOpenChange={setIsOpenMobile}>
						<DropdownMenuTrigger asChild>
							<Button variant="outline">
								<SlidersHorizontal className="w-4 h-4" />
							</Button>
						</DropdownMenuTrigger>
						<DropdownMenuContent align="end" className="w-[200px]">
							<DropdownMenuLabel>Filters</DropdownMenuLabel>
							<DropdownMenuSeparator />
							<DropdownMenuCheckboxItem
								checked={onlyUnreviewed}
								onSelect={(e) => e.preventDefault()}
								onCheckedChange={(checked: boolean) => {
									setOnlyUnreviewed(checked);
									navigate({
										to: "/transactions",
										search: (prev) => ({
											...prev,
											filter: filter || undefined,
											category: category || undefined,
											merchant: merchant || undefined,
											onlyUnreviewed: checked,
											onlyWithoutMerchant: onlyWithoutMerchant,
											page: 1,
										}),
									});
								}}
							>
								Show Unreviewed Only
							</DropdownMenuCheckboxItem>
							<DropdownMenuCheckboxItem
								checked={onlyWithoutMerchant}
								disabled={merchant !== null}
								onSelect={(e) => e.preventDefault()}
								onCheckedChange={(checked: boolean) => {
									setOnlyWithoutMerchant(checked);
									navigate({
										to: "/transactions",
										search: (prev) => ({
											...prev,
											filter: filter || undefined,
											category: category || undefined,
											merchant: merchant || undefined,
											onlyUnreviewed: onlyUnreviewed,
											onlyWithoutMerchant: checked,
											page: 1,
										}),
									});
								}}
							>
								Show Without Merchant Only
							</DropdownMenuCheckboxItem>
						</DropdownMenuContent>
					</DropdownMenu>
				</div>
				{/* Second row: Merchant and Category selects */}
				<div className="flex gap-2 w-full">
					<MerchantSelect
						allowNull
						onValueChange={(value) => {
							if (value === "__null__") {
								setMerchant(null);
								navigate({
									to: "/transactions",
									search: {
										...params,
										merchant: undefined,
										onlyWithoutMerchant: false,
										page: 1,
									},
								});
							} else {
								const merchantValue: string = value as unknown as string;
								setMerchant(merchantValue);
								setOnlyWithoutMerchant(false);
								navigate({
									to: "/transactions",
									search: {
										...params,
										merchant: merchantValue,
										onlyWithoutMerchant: false,
										page: 1,
									},
								});
							}
						}}
						value={merchant}
						className="flex-1"
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
						className="flex-1"
					/>
				</div>
			</div>

			{/* Desktop layout: Single row */}
			<div className="hidden lg:flex gap-2 w-full">
				<Input
					value={filter}
					onChange={handleChange}
					placeholder="Search transactions..."
					className="flex-1"
				/>
				<MerchantSelect
					allowNull
					onValueChange={(value) => {
						if (value === "__null__") {
							setMerchant(null);
							navigate({
								to: "/transactions",
								search: {
									...params,
									merchant: undefined,
									onlyWithoutMerchant: false,
									page: 1,
								},
							});
						} else {
							const merchantValue: string = value as unknown as string;
							setMerchant(merchantValue);
							setOnlyWithoutMerchant(false);
							navigate({
								to: "/transactions",
								search: {
									...params,
									merchant: merchantValue,
									onlyWithoutMerchant: false,
									page: 1,
								},
							});
						}
					}}
					value={merchant}
					className="flex-1"
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
					className="flex-1"
				/>
				<DropdownMenu open={isOpenDesktop} onOpenChange={setIsOpenDesktop}>
					<DropdownMenuTrigger asChild>
						<Button variant="outline">
							<SlidersHorizontal className="w-4 h-4" />
						</Button>
					</DropdownMenuTrigger>
					<DropdownMenuContent align="end" className="w-[200px]">
						<DropdownMenuLabel>Filters</DropdownMenuLabel>
						<DropdownMenuSeparator />
						<DropdownMenuCheckboxItem
							checked={onlyUnreviewed}
							onCheckedChange={(checked: boolean) => {
								setOnlyUnreviewed(checked);
								navigate({
									to: "/transactions",
									search: (prev) => ({
										...prev,
										filter: filter || undefined,
										category: category || undefined,
										merchant: merchant || undefined,
										onlyUnreviewed: checked,
										onlyWithoutMerchant: onlyWithoutMerchant,
										page: 1,
									}),
								});
							}}
						>
							Show Unreviewed Only
						</DropdownMenuCheckboxItem>
						<DropdownMenuCheckboxItem
							checked={onlyWithoutMerchant}
							disabled={merchant !== null}
							onCheckedChange={(checked: boolean) => {
								setOnlyWithoutMerchant(checked);
								navigate({
									to: "/transactions",
									search: (prev) => ({
										...prev,
										filter: filter || undefined,
										category: category || undefined,
										merchant: merchant || undefined,
										onlyUnreviewed: onlyUnreviewed,
										onlyWithoutMerchant: checked,
										page: 1,
									}),
								});
							}}
						>
							Show Without Merchant Only
						</DropdownMenuCheckboxItem>
					</DropdownMenuContent>
				</DropdownMenu>
			</div>
		</div>
	);
}
