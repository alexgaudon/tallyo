import { cn } from "@/lib/utils";
import type { ReactNode } from "react";

export interface SectionProps {
  children: ReactNode;
  className?: string;
}

export function Section({ children, className }: SectionProps) {
  return (
    <section className={cn("space-y-6", className)}>
      {children}
    </section>
  );
}

export interface SectionTitleProps {
  children: ReactNode;
  className?: string;
  description?: ReactNode;
}

export function SectionTitle({ children, className, description }: SectionTitleProps) {
  return (
    <div className={cn("space-y-1", className)}>
      <h2 className="text-lg font-semibold">{children}</h2>
      {description && (
        <p className="text-sm text-muted-foreground">{description}</p>
      )}
    </div>
  );
}
