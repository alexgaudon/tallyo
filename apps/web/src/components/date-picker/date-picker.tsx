import { format } from "date-fns";
import { CalendarIcon } from "lucide-react";
import { useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { parseDateOnly, toDateOnly } from "@/lib/pay-cycle";
import { cn } from "@/lib/utils";

/**
 * Single-day picker. Values use the same `YYYY-MM-DD` form as the database, so
 * callers can persist the selection without any timezone conversion.
 */
export default function DatePicker({
  id,
  value,
  onChange,
  placeholder = "Pick a date",
  disabled = false,
  className,
}: {
  id?: string;
  value?: string | null;
  onChange: (value: string | null) => void;
  placeholder?: string;
  disabled?: boolean;
  className?: string;
}) {
  const selected = useMemo(
    () => (value ? parseDateOnly(value) : null),
    [value],
  );
  const [open, setOpen] = useState(false);

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          id={id}
          variant="outline"
          disabled={disabled}
          className={cn(
            "h-10 w-full justify-start text-left font-normal sm:w-auto sm:min-w-[200px]",
            !selected && "text-muted-foreground",
            className,
          )}
        >
          <CalendarIcon className="mr-2 h-4 w-4 text-foreground/80" />
          {selected ? (
            format(selected, "LLL dd, y")
          ) : (
            <span>{placeholder}</span>
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-auto max-w-[100vw] p-0" align="start">
        <Calendar
          autoFocus
          mode="single"
          defaultMonth={selected ?? undefined}
          selected={selected ?? undefined}
          onSelect={(date) => {
            // Ignore the deselect click: clearing is an explicit action.
            if (!date) return;
            onChange(toDateOnly(date));
            setOpen(false);
          }}
        />
      </PopoverContent>
    </Popover>
  );
}
