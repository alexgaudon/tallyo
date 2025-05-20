import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { cn } from "@/lib/utils";
import { CategoryRepository } from "@/repositories/categories";
import { Route } from "@/routes/transactions";
import { useQuery } from "@tanstack/react-query";
import { useNavigate, useRouteContext } from "@tanstack/react-router";
import { ChevronDown, Flame, Search, SlidersHorizontal } from "lucide-react";
import { useEffect, useState } from "react";

export default function AdvancedSearch(props: {
  selectedCategory?: string;
  onlyUnreviewed: boolean;
}) {
  const search = Route.useSearch();

  const [searchQuery, setSearchQuery] = useState(search.filter ?? "");
  const [category, setCategory] = useState(search.categoryName ?? "");
  const [onlyUnreviewed, setOnlyUnreviewed] = useState(props.onlyUnreviewed);

  const { data: categories } = useQuery(
    CategoryRepository.getAllUserCategoriesQuery(),
  );

  const meta = useRouteContext({
    from: "__root__",
  }).meta;

  const navigate = useNavigate();
  // Effect to update category from URL parameters on mount
  useEffect(() => {
    const categoryName = search.categoryName; // Get categoryName from search
    if (categoryName) {
      const categoryId = categories?.find((x) => x.name === categoryName)?.id;
      if (categoryId) {
        // eslint-disable-next-line @eslint-react/hooks-extra/no-direct-set-state-in-use-effect
        setCategory(categoryId);
      }
    }
  }, []); // Empty dependency array means this only runs on mount

  useEffect(() => {
    doSearch();
  }, [searchQuery, onlyUnreviewed, category]);

  const doSearch = () => {
    const categoryParam = category
      ? categories?.find((x) => x.id === category)?.name
      : "";

    navigate({
      to: ".",
      search: {
        filter: searchQuery,
        unreviewed: onlyUnreviewed,
        categoryName: categoryParam,
      },
    });
  };

  const trendingCategories =
    meta.topCategories?.map((x) => ({
      label: x.categoryName,
      value: x.id,
    })) ?? [];

  return (
    <div className="space-y-4 mx-auto p-4 w-full max-w-4xl">
      <div className="flex items-center space-x-2">
        <div className="relative flex-1">
          <Search className="top-1/2 left-3 absolute w-4 h-4 text-muted-foreground -translate-y-1/2" />
          <Input
            type="text"
            placeholder="Eg: Walmart"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pr-4 pl-10 w-full"
          />
        </div>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="outline" className="lg:hidden">
              <SlidersHorizontal className="mr-2 w-4 h-4" />
              <ChevronDown className="w-4 h-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent className="w-56">
            <DropdownMenuLabel>Search Options</DropdownMenuLabel>
            <DropdownMenuSeparator />
            <div className="p-2">
              <Select
                value={category}
                onValueChange={(val) => {
                  setCategory(val);
                }}
              >
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Select a Category" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All</SelectItem>
                  {categories?.map((x) => (
                    <SelectItem key={x.id} value={x.id}>
                      {x.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <DropdownMenuSeparator />
            <DropdownMenuCheckboxItem
              checked={onlyUnreviewed}
              onCheckedChange={setOnlyUnreviewed}
            >
              Show Unreviewed Only
            </DropdownMenuCheckboxItem>
            <DropdownMenuSeparator />
            <div className="p-2">
              <Button onClick={doSearch} className="w-full">
                Search
              </Button>
            </div>
          </DropdownMenuContent>
        </DropdownMenu>
        <div className="hidden lg:flex space-x-2">
          <Select
            value={category}
            onValueChange={(val) => {
              setCategory(val);
            }}
          >
            <SelectTrigger className="w-[180px]">
              <SelectValue placeholder="Select a Category" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All</SelectItem>
              {categories?.map((x) => (
                <SelectItem key={x.id} value={x.id}>
                  {x.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" className="flex items-center gap-2">
                <SlidersHorizontal className="w-4 h-4" />
                Filters
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent>
              <DropdownMenuCheckboxItem
                checked={onlyUnreviewed}
                onCheckedChange={setOnlyUnreviewed}
              >
                Show Unreviewed Only
              </DropdownMenuCheckboxItem>
            </DropdownMenuContent>
          </DropdownMenu>
          <Button onClick={doSearch}>Search</Button>
        </div>
      </div>

      <div className="space-y-4">
        <div className="space-y-2">
          <div className="flex items-center gap-2 font-medium text-muted-foreground text-sm">
            <Flame className="w-4 h-4 text-orange-500" />
            POPULAR CATEGORIES
          </div>
          <div className="flex flex-wrap gap-2">
            {trendingCategories.map((search, index) => (
              <Button
                // eslint-disable-next-line @eslint-react/no-array-index-key
                key={index}
                variant="outline"
                className={cn(
                  "rounded-full text-sm",
                  category === search.value &&
                    "bg-primary text-primary-foreground",
                )}
                onClick={() => {
                  setCategory(search.value);
                }}
              >
                {search.label}
              </Button>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
