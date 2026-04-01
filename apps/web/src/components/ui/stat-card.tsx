import { cn } from "@/lib/utils";
import { TrendingUp, TrendingDown, Minus } from "lucide-react";

export interface StatCardProps {
  title: string;
  value: string | number;
  change?: {
    value: string;
    type: "increase" | "decrease" | "neutral";
  };
  description?: string;
  className?: string;
  icon?: React.ReactNode;
}

export function StatCard({
  title,
  value,
  change,
  description,
  className,
  icon,
}: StatCardProps) {
  const changeIcon = {
    increase: <TrendingUp className="size-3.5" />,
    decrease: <TrendingDown className="size-3.5" />,
    neutral: <Minus className="size-3.5" />,
  };

  return (
    <div 
      className={cn(
        "relative overflow-hidden rounded-xl border border-border bg-card p-5 shadow-soft transition-all duration-300 hover:shadow-soft-lg",
        className
      )}
    >
      {/* Subtle gradient overlay */}
      <div className="absolute inset-0 bg-gradient-to-br from-primary/5 via-transparent to-transparent opacity-0 transition-opacity duration-300 group-hover:opacity-100" />
      
      <div className="relative">
        <div className="flex items-center justify-between">
          <div className="text-sm font-medium text-muted-foreground">{title}</div>
          {icon && (
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-secondary text-secondary-foreground">
              {icon}
            </div>
          )}
        </div>
        
        <div className="mt-3 text-3xl font-semibold tracking-tight text-foreground">
          {value}
        </div>
        
        {change && (
          <div className="mt-3 flex items-center gap-2">
            <span
              className={cn(
                "inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium",
                change.type === "increase" && "bg-income/10 text-income",
                change.type === "decrease" && "bg-destructive/10 text-destructive",
                change.type === "neutral" && "bg-muted text-muted-foreground"
              )}
            >
              {changeIcon[change.type]}
              {change.value}
            </span>
            {description && (
              <span className="text-xs text-muted-foreground">{description}</span>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
