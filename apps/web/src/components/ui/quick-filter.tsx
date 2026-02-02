import { cn } from "@/lib/utils";
import { forwardRef } from "react";

export interface QuickFilterProps {
  label: string;
  active?: boolean;
  onClick?: () => void;
  className?: string;
}

export const QuickFilter = forwardRef<HTMLButtonElement, QuickFilterProps>(
  ({ label, active, onClick, className }, ref) => {
    return (
      <button
        ref={ref}
        type="button"
        onClick={onClick}
        className={cn(
          "px-3 py-1.5 text-sm font-medium border transition-colors",
          active
            ? "bg-accent text-accent-foreground border-accent"
            : "bg-background text-muted-foreground border-border hover:text-foreground hover:border-foreground/50"
        )}
      >
        {label}
      </button>
    );
  }
);

QuickFilter.displayName = "QuickFilter";
