import { useNavigate, useSearch } from "@tanstack/react-router";
import { format, parseISO } from "date-fns";
import {
  ArrowUpDown,
  ChevronDown,
  SearchIcon,
  SlidersHorizontal,
  Store,
  X,
} from "lucide-react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { DateRange } from "react-day-picker";
import DateRangePicker from "@/components/date-picker/date-range-picker";
import { Button } from "@/components/ui/button";
import { EntityPicker } from "@/components/ui/entity-picker";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useDebounce } from "@/hooks/use-debounce";
import {
  clearedViewSearch,
  hasActiveViewFilters,
  type ViewSearch,
} from "@/lib/transaction-view";
import { cn } from "@/lib/utils";

interface SegmentedOption<T extends string> {
  value: T;
  label: string;
}

function Segmented<T extends string>({
  label,
  value,
  options,
  onChange,
}: {
  label: string;
  value: T;
  options: SegmentedOption<T>[];
  onChange: (value: T) => void;
}) {
  return (
    <fieldset className="inline-flex rounded-lg border border-border bg-muted/50 p-0.5">
      <legend className="sr-only">{label}</legend>
      {options.map((option) => (
        <button
          key={option.value}
          type="button"
          onClick={() => onChange(option.value)}
          aria-pressed={value === option.value}
          className={cn(
            "rounded-md px-2.5 py-1.5 text-xs font-medium transition-colors",
            value === option.value
              ? "bg-background text-foreground shadow-sm"
              : "text-muted-foreground hover:text-foreground",
          )}
        >
          {option.label}
        </button>
      ))}
    </fieldset>
  );
}

/** Number of active filters, for the collapsed mobile summary badge. */
function countActiveFilters(search: ViewSearch): number {
  return (
    (search.from ? 1 : 0) +
    (search.to ? 1 : 0) +
    (search.categories?.length ?? 0) +
    (search.merchants?.length ?? 0) +
    (search.q ? 1 : 0) +
    (search.review !== "all" ? 1 : 0) +
    (search.side !== "all" ? 1 : 0) +
    (search.noMerchant ? 1 : 0) +
    (search.min !== undefined ? 1 : 0) +
    (search.max !== undefined ? 1 : 0)
  );
}

interface ViewControlsProps {
  /**
   * Which ledger surface these controls edit. Every view route shares the
   * frozen `viewSearchSchema`, so the only difference is the route the params
   * are read from and written back to.
   */
  route?: "transactions" | "reports";
  /**
   * Controlled mode. When both `view` and `onViewChange` are supplied, the
   * controls edit the given view directly (e.g. inside a lens) instead of
   * reading and writing route search params.
   */
  view?: ViewSearch;
  onViewChange?: (next: ViewSearch) => void;
}

/**
 * The ledger's view editor. By default every control writes to the route
 * search params, which in turn drive the loader-owned query. Passing `view` +
 * `onViewChange` switches it to a controlled editor. One responsive layout —
 * the controls wrap rather than fork into a mobile drawer and a desktop row.
 */
export function ViewControls({
  route = "transactions",
  view,
  onViewChange,
}: ViewControlsProps = {}) {
  if (view && onViewChange) {
    return (
      <ViewControlsForm
        search={view}
        onUpdate={(updates) => onViewChange({ ...view, ...updates, page: 1 })}
        onClear={() => onViewChange(clearedViewSearch(view))}
      />
    );
  }

  return route === "reports" ? (
    <ReportsViewControls />
  ) : (
    <TransactionsViewControls />
  );
}

function TransactionsViewControls() {
  const navigate = useNavigate();
  const search = useSearch({ from: "/_app/transactions" });

  const update = useCallback(
    (updates: Partial<ViewSearch>) => {
      navigate({
        to: "/transactions",
        search: (prev) => ({ ...prev, ...updates, page: 1 }),
      });
    },
    [navigate],
  );

  const clear = useCallback(() => {
    navigate({ to: "/transactions", search: clearedViewSearch(search) });
  }, [navigate, search]);

  return <ViewControlsForm search={search} onUpdate={update} onClear={clear} />;
}

function ReportsViewControls() {
  const navigate = useNavigate();
  const search = useSearch({ from: "/_app/reports" });

  const update = useCallback(
    (updates: Partial<ViewSearch>) => {
      navigate({
        to: "/reports",
        search: (prev) => ({ ...prev, ...updates, page: 1 }),
      });
    },
    [navigate],
  );

  const clear = useCallback(() => {
    navigate({ to: "/reports", search: clearedViewSearch(search) });
  }, [navigate, search]);

  return (
    <ViewControlsForm
      search={search}
      onUpdate={update}
      onClear={clear}
      datePicker="range"
    />
  );
}

interface ViewControlsFormProps {
  search: ViewSearch;
  onUpdate: (updates: Partial<ViewSearch>) => void;
  onClear: () => void;
  /**
   * The date filter UI. The compact `inputs` variant (two native date fields)
   * is the ledger default; `range` swaps in the dashboard's popover calendar.
   */
  datePicker?: "inputs" | "range";
}

function ViewControlsForm({
  search,
  onUpdate,
  onClear,
  datePicker = "inputs",
}: ViewControlsFormProps) {
  const dateRange = useMemo<DateRange | undefined>(() => {
    if (!search.from && !search.to) return undefined;
    return {
      from: search.from ? parseISO(search.from) : undefined,
      to: search.to ? parseISO(search.to) : undefined,
    };
  }, [search.from, search.to]);

  const [text, setText] = useState(search.q ?? "");
  const debouncedText = useDebounce(text, 300);
  const lastTextRef = useRef(search.q ?? "");

  useEffect(() => {
    if (debouncedText === lastTextRef.current) return;
    lastTextRef.current = debouncedText;
    onUpdate({ q: debouncedText.trim() ? debouncedText : undefined });
  }, [debouncedText, onUpdate]);

  useEffect(() => {
    const next = search.q ?? "";
    setText(next);
    lastTextRef.current = next;
  }, [search.q]);

  const [minInput, setMinInput] = useState(
    search.min !== undefined ? String(search.min) : "",
  );
  const [maxInput, setMaxInput] = useState(
    search.max !== undefined ? String(search.max) : "",
  );
  const debouncedMin = useDebounce(minInput, 300);
  const debouncedMax = useDebounce(maxInput, 300);
  const lastMinRef = useRef<number | undefined>(search.min);
  const lastMaxRef = useRef<number | undefined>(search.max);

  useEffect(() => {
    const parsed =
      debouncedMin.trim() === "" ? undefined : Number(debouncedMin);
    const value =
      parsed !== undefined && Number.isNaN(parsed) ? undefined : parsed;
    if (value === lastMinRef.current) return;
    lastMinRef.current = value;
    onUpdate({ min: value });
  }, [debouncedMin, onUpdate]);

  useEffect(() => {
    const parsed =
      debouncedMax.trim() === "" ? undefined : Number(debouncedMax);
    const value =
      parsed !== undefined && Number.isNaN(parsed) ? undefined : parsed;
    if (value === lastMaxRef.current) return;
    lastMaxRef.current = value;
    onUpdate({ max: value });
  }, [debouncedMax, onUpdate]);

  useEffect(() => {
    if (search.min === lastMinRef.current) return;
    lastMinRef.current = search.min;
    setMinInput(search.min !== undefined ? String(search.min) : "");
  }, [search.min]);

  useEffect(() => {
    if (search.max === lastMaxRef.current) return;
    lastMaxRef.current = search.max;
    setMaxInput(search.max !== undefined ? String(search.max) : "");
  }, [search.max]);

  const [expanded, setExpanded] = useState(false);
  const activeCount = countActiveFilters(search);
  // On mobile the controls collapse to just the search bar; on lg they are
  // always shown. `expandable` toggles the rest.
  const expandable = expanded ? "flex" : "hidden lg:flex";

  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
        <div className="relative flex-1">
          <SearchIcon className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={text}
            onChange={(event) => setText(event.target.value)}
            placeholder="Search transactions, notes, or IDs..."
            className="pl-9"
            aria-label="Search transactions"
          />
        </div>
        <Button
          type="button"
          variant="outline"
          size="sm"
          className="h-9 justify-between gap-2 lg:hidden"
          aria-expanded={expanded}
          onClick={() => setExpanded((value) => !value)}
        >
          <span className="flex items-center gap-2">
            <SlidersHorizontal className="h-3.5 w-3.5" />
            Filters
            {activeCount > 0 ? (
              <span className="rounded-full bg-accent/15 px-1.5 text-xs font-semibold text-accent">
                {activeCount}
              </span>
            ) : null}
          </span>
          <ChevronDown
            className={cn(
              "h-4 w-4 transition-transform",
              expanded && "rotate-180",
            )}
          />
        </Button>
        <div className={cn(expandable, "flex-wrap items-center gap-2")}>
          <Segmented
            label="Review state"
            value={search.review}
            onChange={(review) => onUpdate({ review })}
            options={[
              { value: "all", label: "All" },
              { value: "unreviewed", label: "To review" },
              { value: "reviewed", label: "Reviewed" },
            ]}
          />
          <Segmented
            label="Side"
            value={search.side}
            onChange={(side) => onUpdate({ side })}
            options={[
              { value: "all", label: "All" },
              { value: "income", label: "Income" },
              { value: "expense", label: "Expense" },
            ]}
          />
          <Select
            value={search.sort}
            onValueChange={(value) =>
              onUpdate({ sort: value as ViewSearch["sort"] })
            }
          >
            <SelectTrigger className="h-9 w-[9.5rem]" aria-label="Sort">
              <ArrowUpDown className="h-3.5 w-3.5 opacity-60" />
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="date">Newest first</SelectItem>
              <SelectItem value="amount">Largest first</SelectItem>
            </SelectContent>
          </Select>
          <Button
            type="button"
            variant={search.noMerchant ? "secondary" : "outline"}
            size="sm"
            className="h-9"
            aria-pressed={Boolean(search.noMerchant)}
            onClick={() =>
              onUpdate({ noMerchant: search.noMerchant ? undefined : true })
            }
          >
            <Store className="h-3.5 w-3.5" />
            No merchant
          </Button>
          {hasActiveViewFilters(search) ? (
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="h-9"
              onClick={onClear}
            >
              <X className="h-3.5 w-3.5" />
              Clear
            </Button>
          ) : null}
        </div>
      </div>

      {/* Date range. The ledger and reports both filter on it; drill-downs and
          the reports page rely on it as the start/end of the reporting period. */}
      <div className={cn(expandable, "flex-wrap items-center gap-2")}>
        <span className="text-xs font-medium text-muted-foreground">Dates</span>
        {datePicker === "range" ? (
          <DateRangePicker
            value={dateRange}
            onRangeChange={(next) =>
              onUpdate({
                from: next?.from ? format(next.from, "yyyy-MM-dd") : undefined,
                to: next?.to ? format(next.to, "yyyy-MM-dd") : undefined,
              })
            }
          />
        ) : (
          <>
            <Input
              type="date"
              value={search.from ?? ""}
              onChange={(event) =>
                onUpdate({ from: event.target.value || undefined })
              }
              className="h-9 w-[10.5rem]"
              aria-label="Start date"
            />
            <span className="text-muted-foreground">–</span>
            <Input
              type="date"
              value={search.to ?? ""}
              onChange={(event) =>
                onUpdate({ to: event.target.value || undefined })
              }
              className="h-9 w-[10.5rem]"
              aria-label="End date"
            />
          </>
        )}
      </div>

      <div
        className={cn(expandable, "flex-col gap-2 sm:flex-row sm:items-center")}
      >
        <EntityPicker
          kind="category"
          multiple
          value={search.categories ?? []}
          onChange={(next) =>
            onUpdate({
              categories: Array.isArray(next) && next.length ? next : undefined,
            })
          }
          placeholder="All categories"
          className="flex-1"
        />
        <EntityPicker
          kind="merchant"
          multiple
          value={search.merchants ?? []}
          onChange={(next) =>
            onUpdate({
              merchants: Array.isArray(next) && next.length ? next : undefined,
            })
          }
          placeholder="All merchants"
          className="flex-1"
        />
        <div className="flex items-center gap-2">
          <Input
            type="number"
            inputMode="decimal"
            step="0.01"
            placeholder="Min $"
            value={minInput}
            onChange={(event) => setMinInput(event.target.value)}
            className="h-9 w-24"
            aria-label="Minimum amount in dollars"
          />
          <span className="text-muted-foreground">–</span>
          <Input
            type="number"
            inputMode="decimal"
            step="0.01"
            placeholder="Max $"
            value={maxInput}
            onChange={(event) => setMaxInput(event.target.value)}
            className="h-9 w-24"
            aria-label="Maximum amount in dollars"
          />
        </div>
      </div>
    </div>
  );
}
