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
      <div className="max-w-screen-2xl mx-auto px-4 py-6 lg:px-8 lg:py-7">
        <div className="flex flex-col gap-5 sm:flex-row sm:items-center sm:justify-between">
          <div className="max-w-2xl space-y-1.5">
            {eyebrow && (
              <p className="text-xs font-semibold uppercase tracking-[0.14em] text-muted-foreground">
                {eyebrow}
              </p>
            )}
            <h1 className="text-3xl font-semibold tracking-tight text-foreground sm:text-4xl">
              {title}
            </h1>
            {description && (
              <p className="text-sm leading-6 text-muted-foreground sm:text-base">
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
