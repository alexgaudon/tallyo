import { format } from "date-fns";
import { CalendarDays } from "lucide-react";
import { getPayCycle, type PayCycle } from "@/lib/pay-cycle";
import { cn } from "@/lib/utils";

/**
 * Compact countdown to the next pay day. Clicking it hands the pay cycle back
 * to the dashboard so the analytics can scope themselves to it.
 */
export function PaydayPill({
  anchorDate,
  onSelect,
  className,
}: {
  anchorDate: string;
  onSelect?: (cycle: PayCycle) => void;
  className?: string;
}) {
  const cycle = getPayCycle(anchorDate);
  if (!cycle) return null;

  return (
    <button
      type="button"
      onClick={() => onSelect?.(cycle)}
      title="Scope the dashboard to this pay period"
      className={cn(
        "group inline-flex h-10 items-center gap-2 rounded-full border border-income/30 bg-background/70 px-3 text-left transition-colors hover:border-income/60 hover:bg-income-muted/30 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/50",
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
    </button>
  );
}
