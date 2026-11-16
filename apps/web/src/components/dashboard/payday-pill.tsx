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
        "inline-flex h-10 items-center gap-2 rounded-full border border-income/30 bg-background/70 px-3",
        className,
      )}
    >
      <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-income ring-3 ring-income/15" />
      <CalendarDays className="h-4 w-4 shrink-0 text-income" />
      <span className="hidden text-xs text-muted-foreground sm:inline">
        Next pay day
      </span>
      <span className="text-sm font-semibold text-foreground">
        {format(cycle.date, "EEE, MMM d")}
      </span>
      <span className="rounded-full bg-income-muted px-2 py-0.5 text-[11px] font-semibold text-income">
        {cycle.countdown}
      </span>
    </div>
  );
}
