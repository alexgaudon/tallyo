import {
  addDays,
  addMonths,
  endOfMonth,
  endOfYear,
  format,
  startOfDay,
  startOfMonth,
  startOfYear,
  subMonths,
  subYears,
} from "date-fns";
import { CalendarIcon, ChevronLeft, ChevronRight } from "lucide-react";
import { useEffect, useId, useState } from "react";
import type { DateRange } from "react-day-picker";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { useSession } from "@/lib/auth-client";
import { cn } from "@/lib/utils";

const presets = [
  {
    label: "Last 7 days",
    value: () => ({
      from: startOfDay(addDays(new Date(), -7)),
      to: startOfDay(new Date()),
    }),
  },
  {
    label: "Last 14 days",
    value: () => ({
      from: startOfDay(addDays(new Date(), -14)),
      to: startOfDay(new Date()),
    }),
  },
  {
    label: "Last 30 days",
    value: () => ({
      from: startOfDay(addDays(new Date(), -30)),
      to: startOfDay(new Date()),
    }),
  },
  {
    label: "This month",
    value: () => ({
      from: startOfDay(startOfMonth(new Date())),
      to: new Date(),
    }),
  },
  {
    label: "Last month",
    value: () => ({
      from: startOfDay(startOfMonth(subMonths(new Date(), 1))),
      to: startOfDay(endOfMonth(subMonths(new Date(), 1))),
    }),
  },
  {
    label: "This year",
    value: () => ({
      from: startOfDay(startOfYear(new Date())),
      to: startOfDay(endOfYear(new Date())),
    }),
  },
  {
    label: "Last year",
    value: () => ({
      from: startOfDay(startOfYear(subYears(new Date(), 1))),
      to: startOfDay(endOfYear(subYears(new Date(), 1))),
    }),
  },
  {
    label: "All time",
    value: () => ({
      from: undefined,
      to: startOfDay(new Date()),
    }),
  },
];

export default function DateRangePicker({
  className,
  onRangeChange,
  value,
}: {
  className?: string;
  onRangeChange?: (date: DateRange | undefined) => void;
  value?: DateRange | undefined;
}) {
  const dateId = useId();
  const [date, setDate] = useState<DateRange | undefined>(
    value || {
      from: startOfDay(startOfMonth(new Date())),
      to: startOfDay(endOfMonth(new Date())),
    },
  );

  const { data } = useSession();
  const earliestTransactionDate = data?.meta.earliestTransactionDate;

  // Sync with external value
  useEffect(() => {
    if (value !== undefined) {
      setDate(value);
    }
  }, [value]);

  // Month navigation functions
  const navigateMonth = (direction: "prev" | "next") => {
    if (!date?.from) return;

    const currentMonth = date.from;
    const newMonth =
      direction === "prev"
        ? subMonths(currentMonth, 1)
        : addMonths(currentMonth, 1);

    const newDateRange: DateRange = {
      from: startOfDay(startOfMonth(newMonth)),
      to: startOfDay(endOfMonth(newMonth)),
    };

    setDate(newDateRange);
    onRangeChange?.(newDateRange);
  };

  // Helper function to ensure dates are timezone-safe
  const normalizeDate = (date: Date | undefined) => {
    if (!date) return undefined;
    // Create a new date object with the same year, month, and day
    // but at midnight in the local timezone to avoid timezone shifts
    return new Date(date.getFullYear(), date.getMonth(), date.getDate());
  };

  // Helper function to create dates from date strings without timezone issues
  const createLocalDate = (dateString: string) => {
    const [year, month, day] = dateString.split("-").map(Number);
    // month is 0-indexed in Date constructor, so subtract 1
    return new Date(year, month - 1, day);
  };

  return (
    <div className={cn("flex items-center gap-1 sm:gap-2", className)}>
      <Popover>
        <PopoverTrigger asChild>
          <Button
            id={dateId}
            variant="outline"
            className={cn(
              "justify-start text-left font-normal",
              "h-10 text-sm w-auto min-w-[140px] sm:min-w-[200px]",
              !date && "text-muted-foreground",
            )}
          >
            <CalendarIcon
              className={cn(
                "mr-1 sm:mr-2 text-foreground/80",
                "h-3 w-3 sm:h-4 sm:w-4",
              )}
            />
            {date?.from ? (
              date.to ? (
                <>
                  <span className="hidden sm:inline">
                    {format(date.from, "LLL dd, y")} -{" "}
                    {format(date.to, "LLL dd, y")}
                  </span>
                  <span className="sm:hidden">
                    {format(date.from, "MMM dd")} - {format(date.to, "MMM dd")}
                  </span>
                </>
              ) : (
                <>
                  <span className="hidden sm:inline">
                    {format(date.from, "LLL dd, y")}
                  </span>
                  <span className="sm:hidden">
                    {format(date.from, "MMM dd")}
                  </span>
                </>
              )
            ) : (
              <span className="text-xs sm:text-sm">Pick dates</span>
            )}
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-auto p-0" align="start">
          <div className="flex">
            <Calendar
              autoFocus
              mode="range"
              defaultMonth={date?.from}
              selected={date}
              onSelect={(newDate) => {
                const normalizedDate = newDate
                  ? {
                      from: normalizeDate(newDate.from),
                      to: normalizeDate(newDate.to),
                    }
                  : undefined;
                setDate(normalizedDate);
                onRangeChange?.(normalizedDate);
              }}
              numberOfMonths={1}
            />
            <div className="p-3 border-b">
              <div className="grid grid-cols-1 gap-2">
                {presets.map((preset) => {
                  const value = preset.value();
                  if (preset.label === "All time" && earliestTransactionDate) {
                    value.from = createLocalDate(earliestTransactionDate);
                    value.to = startOfDay(new Date());
                  }
                  return (
                    <Button
                      key={preset.label}
                      variant="outline"
                      size="sm"
                      className="text-xs"
                      onClick={() => {
                        setDate(value);
                        onRangeChange?.(value);
                      }}
                    >
                      {preset.label}
                    </Button>
                  );
                })}
              </div>
            </div>
          </div>
        </PopoverContent>
      </Popover>

      {/* Month Navigation Arrows */}
      <div className="flex-1 flex gap-2 sm:gap-1 sm:flex-none">
        <Button
          variant="outline"
          className="flex-1 h-10 sm:h-10 sm:flex-none sm:w-10"
          onClick={() => navigateMonth("prev")}
          disabled={!date?.from}
        >
          <ChevronLeft className="h-4 w-4" />
        </Button>
        <Button
          variant="outline"
          className="flex-1 h-10 sm:h-10 sm:flex-none sm:w-10"
          onClick={() => navigateMonth("next")}
          disabled={!date?.from}
        >
          <ChevronRight className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
}
