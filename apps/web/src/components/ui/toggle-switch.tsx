import { cn } from "@/lib/utils";
import { forwardRef } from "react";

export interface ToggleSwitchProps {
  checked: boolean;
  onCheckedChange: (checked: boolean) => void;
  label?: string;
  description?: string;
  disabled?: boolean;
  className?: string;
}

export const ToggleSwitch = forwardRef<HTMLButtonElement, ToggleSwitchProps>(
  (
    { checked, onCheckedChange, label, description, disabled, className },
    ref
  ) => {
    return (
      <label className={cn("flex items-center gap-3 cursor-pointer", className)}>
        <button
          ref={ref}
          type="button"
          role="switch"
          aria-checked={checked}
          disabled={disabled}
          onClick={() => onCheckedChange(!checked)}
          className={cn(
            "relative inline-flex h-6 w-11 items-center rounded-full border border-border transition-colors",
            checked ? "bg-accent" : "bg-secondary",
            disabled && "opacity-50 cursor-not-allowed"
          )}
        >
          <span
            className={cn(
              "inline-block h-4 w-4 transform rounded-full bg-background border border-border transition-transform",
              checked ? "translate-x-5" : "translate-x-0"
            )}
          />
        </button>
        {(label || description) && (
          <div className="flex flex-col">
            {label && <span className="text-sm font-medium">{label}</span>}
            {description && (
              <span className="text-xs text-muted-foreground">{description}</span>
            )}
          </div>
        )}
      </label>
    );
  }
);

ToggleSwitch.displayName = "ToggleSwitch";
