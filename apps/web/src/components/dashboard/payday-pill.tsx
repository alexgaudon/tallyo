import { format } from "date-fns";
import { CalendarDays } from "lucide-react";
import { getPayCycle } from "@/lib/pay-cycle";
import { cn } from "@/lib/utils";

/**
 * Read-only countdown to the next pay day, derived from the anchor date in
 * settings.
 */
export function PaydayPill({
  anchorDate,
  className,
}: {
  anchorDate: string;
  className?: string;
}) {
  const cycle = getPayCycle(anchorDate);
  if (!cycle) return null;

  return (
    <div
      className={cn(
        "inline-flex h-10 items-center gap-1.5 rounded-full border border-income/30 bg-background/70 px-3 sm:gap-2",
        className,
      )}
    >
      <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-income ring-3 ring-income/15" />
      <CalendarDays className="h-4 w-4 shrink-0 text-income" />
      <span className="text-[11px] whitespace-nowrap text-muted-foreground sm:text-xs">
        Next pay day
      </span>
      <span className="text-[13px] font-semibold whitespace-nowrap text-foreground sm:text-sm">
        {format(cycle.date, "EEE, MMM d")}
      </span>
      <span className="rounded-full bg-income-muted px-1.5 py-0.5 text-[10px] font-semibold whitespace-nowrap text-income sm:px-2 sm:text-[11px]">
        {cycle.countdown}
      </span>
    </div>
  );
}
