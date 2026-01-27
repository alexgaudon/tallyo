import { useNavigate, useSearch } from "@tanstack/react-router";
import { SlidersHorizontal } from "lucide-react";
import { type ChangeEvent, useRef, useState } from "react";
import { useDebounce } from "@/hooks/use-debounce";
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
  const navigate = useNavigate();

  // Navigation helper
  const updateSearchParams = (
    updates: Record<string, string | boolean | null | undefined>,
  ) => {
    navigate({
      to: "/transactions",
      search: (prev) => ({
        ...prev,
        ...updates,
        page: 1, // Reset to first page when filters change
      }),
    });
  };

  // Only maintain local state for the search input (debounced)
  const [filter, setFilter] = useState(() => params.filter ?? "");
  const previousDebouncedFilterRef = useRef<string | undefined>(params.filter);
  const debouncedFilter = useDebounce(filter, 300);

  // Update URL when debounced filter changes
  if (debouncedFilter !== previousDebouncedFilterRef.current) {
    previousDebouncedFilterRef.current = debouncedFilter;
    if (debouncedFilter !== (params.filter ?? "")) {
      updateSearchParams({ filter: debouncedFilter });
    }
  }

  // UI state
  const [isOpenMobile, setIsOpenMobile] = useState(false);
  const [isOpenDesktop, setIsOpenDesktop] = useState(false);

  const handleChange = (e: ChangeEvent<HTMLInputElement>) => {
    setFilter(e.target.value);
  };

  return (
    <div className="flex flex-col gap-2.5 w-full">
      {/* Mobile layout: Two rows */}
      <div className="flex lg:hidden flex-col gap-2.5 w-full">
        {/* First row: Search input and filters dropdown */}
        <div className="flex gap-2 w-full">
          <Input
            value={filter}
            onChange={handleChange}
            placeholder="Search transactions..."
            className="flex-1 h-9 text-sm"
          />
          <DropdownMenu open={isOpenMobile} onOpenChange={setIsOpenMobile}>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" size="icon" className="h-9 w-9">
                <SlidersHorizontal className="w-4 h-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-[200px]">
              <DropdownMenuLabel>Filters</DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuCheckboxItem
                checked={params.onlyUnreviewed ?? false}
                onSelect={(e) => e.preventDefault()}
                onCheckedChange={(checked: boolean) => {
                  updateSearchParams({
                    onlyUnreviewed: checked || undefined,
                  });
                }}
              >
                Show Unreviewed Only
              </DropdownMenuCheckboxItem>
              <DropdownMenuCheckboxItem
                checked={params.onlyWithoutMerchant ?? false}
                disabled={params.merchant !== null}
                onSelect={(e) => e.preventDefault()}
                onCheckedChange={(checked: boolean) => {
                  updateSearchParams({
                    onlyWithoutMerchant: checked || undefined,
                  });
                }}
              >
                Show Without Merchant Only
              </DropdownMenuCheckboxItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
        {/* Second row: Merchant select */}
        <div className="w-full">
          <MerchantSelect
            allowNull
            onValueChange={(value) => {
              if (value === null) {
                updateSearchParams({
                  merchant: undefined,
                  onlyWithoutMerchant: false,
                });
              } else {
                updateSearchParams({
                  merchant: value,
                  onlyWithoutMerchant: false,
                });
              }
            }}
            value={params.merchant ?? null}
            className="w-full"
          />
        </div>
        {/* Third row: Category select */}
        <div className="w-full">
          <CategorySelect
            allowNull
            onValueChange={(value) => {
              if (value === null) {
                updateSearchParams({
                  category: undefined,
                });
              } else {
                updateSearchParams({
                  category: value,
                });
              }
            }}
            value={params.category ?? null}
            className="w-full"
          />
        </div>
      </div>

      {/* Desktop layout: Single row */}
      <div className="hidden lg:flex gap-2.5 w-full items-center">
        <Input
          value={filter}
          onChange={handleChange}
          placeholder="Search transactions..."
          className="flex-1 h-9 text-sm"
        />
        <MerchantSelect
          allowNull
          onValueChange={(value) => {
            if (value === null) {
              updateSearchParams({
                merchant: undefined,
                onlyWithoutMerchant: false,
              });
            } else {
              updateSearchParams({
                merchant: value,
                onlyWithoutMerchant: false,
              });
            }
          }}
          value={params.merchant ?? null}
          className="flex-1 min-w-[180px]"
        />
        <CategorySelect
          allowNull
          onValueChange={(value) => {
            if (value === null) {
              updateSearchParams({
                category: undefined,
              });
            } else {
              updateSearchParams({
                category: value,
              });
            }
          }}
          value={params.category ?? null}
          className="flex-1 min-w-[160px]"
        />
        <DropdownMenu open={isOpenDesktop} onOpenChange={setIsOpenDesktop}>
          <DropdownMenuTrigger asChild>
            <Button variant="outline" size="sm" className="h-9 px-3 gap-2">
              <SlidersHorizontal className="w-4 h-4" />
              <span className="hidden xl:inline text-xs font-medium">
                More filters
              </span>
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-[200px]">
            <DropdownMenuLabel>Filters</DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuCheckboxItem
              checked={params.onlyUnreviewed ?? false}
              onCheckedChange={(checked: boolean) => {
                updateSearchParams({
                  onlyUnreviewed: checked || undefined,
                });
              }}
            >
              Show Unreviewed Only
            </DropdownMenuCheckboxItem>
            <DropdownMenuCheckboxItem
              checked={params.onlyWithoutMerchant ?? false}
              disabled={params.merchant !== null}
              onCheckedChange={(checked: boolean) => {
                updateSearchParams({
                  onlyWithoutMerchant: checked || undefined,
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
