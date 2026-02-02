import { cn } from "@/lib/utils";

export interface StatCardProps {
  title: string;
  value: string | number;
  change?: {
    value: string;
    type: "increase" | "decrease" | "neutral";
  };
  description?: string;
  className?: string;
}

export function StatCard({
  title,
  value,
  change,
  description,
  className,
}: StatCardProps) {
  return (
    <div className={cn("border border-border p-4", className)}>
      <div className="text-sm text-muted-foreground mb-1">{title}</div>
      <div className="text-3xl font-mono font-bold">{value}</div>
      {change && (
        <div className="flex items-center gap-2 mt-2 text-sm">
          <span
            className={cn(
              change.type === "increase" && "text-[#22c55e]",
              change.type === "decrease" && "text-destructive",
              change.type === "neutral" && "text-muted-foreground"
            )}
          >
            {change.type === "increase" && "↑"}
            {change.type === "decrease" && "↓"}
            {change.value}
          </span>
          {description && (
            <span className="text-muted-foreground">{description}</span>
          )}
        </div>
      )}
    </div>
  );
}
