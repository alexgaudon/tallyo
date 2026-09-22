import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

interface PageHeaderProps {
  eyebrow?: string;
  title: ReactNode;
  description?: string;
  actions?: ReactNode;
  /**
   * Stack the actions under the title on mobile. Use this for wide action
   * groups (e.g. a date range plus a button); a single action sits inline to
   * the right of the title by default.
   */
  stackOnMobile?: boolean;
  className?: string;
}

export function PageHeader({
  eyebrow,
  title,
  description,
  actions,
  stackOnMobile = false,
  className,
}: PageHeaderProps) {
  return (
    <header className={cn("border-b border-border bg-background", className)}>
      <div className="mx-auto max-w-screen-2xl px-4 py-4 sm:py-6 lg:px-8 lg:py-7">
        <div
          className={cn(
            "flex justify-between gap-3",
            stackOnMobile
              ? "flex-col sm:flex-row sm:items-center sm:gap-5"
              : "flex-row items-center",
          )}
        >
          <div className="min-w-0 max-w-2xl space-y-1 sm:space-y-1.5">
            {eyebrow && (
              <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-muted-foreground sm:text-xs">
                {eyebrow}
              </p>
            )}
            <h1 className="truncate text-2xl font-semibold tracking-tight text-foreground sm:text-4xl">
              {title}
            </h1>
            {/* Hidden on mobile to save vertical space; the page body is the
                priority on a small screen. */}
            {description && (
              <p className="hidden text-sm leading-6 text-muted-foreground sm:block sm:text-base">
                {description}
              </p>
            )}
          </div>
          {actions && (
            <div
              className={cn(
                "flex gap-2",
                stackOnMobile
                  ? "w-full items-stretch sm:w-auto sm:items-center"
                  : "shrink-0 items-center",
              )}
            >
              {actions}
            </div>
          )}
        </div>
      </div>
    </header>
  );
}
