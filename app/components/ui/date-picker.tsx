import { format } from "date-fns";
import { CalendarIcon } from "lucide-react";
import * as React from "react";

import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { cn } from "@/lib/utils";

export function DatePicker({
  value,
  onChange,
}: {
  value: Date | undefined;
  onChange: (val: Date | undefined) => void;
}) {
  const [date, setDate] = React.useState<Date>(() => value ?? new Date());

  const updateDate = (day: Date) => {
    setDate(day);
    onChange?.(day);
  };

  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button
          variant={"outline"}
          className={cn(
            "w-full justify-start text-left font-normal",
            !date && "text-muted-foreground",
          )}
        >
          <CalendarIcon />
          {date ? format(date, "PPP") : <span>Pick a date</span>}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="p-0 w-auto" align="start">
        <Calendar
          mode="single"
          selected={date}
          onSelect={(day) => {
            updateDate(day ?? new Date());
          }}
        />
      </PopoverContent>
    </Popover>
  );
}
