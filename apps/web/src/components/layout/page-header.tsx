import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

interface PageHeaderProps {
  eyebrow?: string;
  title: ReactNode;
  description?: string;
  actions?: ReactNode;
  className?: string;
}

export function PageHeader({
  eyebrow,
  title,
  description,
  actions,
  className,
}: PageHeaderProps) {
  return (
    <header className={cn("border-b border-border bg-background", className)}>
      <div className="mx-auto max-w-screen-2xl px-4 py-4 sm:py-6 lg:px-8 lg:py-7">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between sm:gap-5">
          <div className="max-w-2xl space-y-1 sm:space-y-1.5">
            {eyebrow && (
              <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-muted-foreground sm:text-xs">
                {eyebrow}
              </p>
            )}
            <h1 className="text-2xl font-semibold tracking-tight text-foreground sm:text-4xl">
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
            <div className="flex w-full items-stretch gap-2 sm:w-auto sm:items-center">
              {actions}
            </div>
          )}
        </div>
      </div>
    </header>
  );
}
