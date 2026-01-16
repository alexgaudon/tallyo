import { type ComponentProps } from "react";
import { cn } from "@/lib/utils";

function CardListItem({
  className,
  children,
  onClick,
  isLast,
  ...props
}: ComponentProps<"button"> & { isLast?: boolean }) {
  return (
    <button
      data-slot="card-list-item"
      className={cn(
        "bg-card flex items-center justify-between p-4 hover:bg-muted/50 transition-colors flex-1 cursor-pointer w-full text-left rounded-lg",
        !isLast && "mb-1",
        className
      )}
      onClick={onClick}
      {...props}
    >
      {children}
    </button>
  );
}

function CardListEmpty({
  className,
  icon,
  title,
  description,
  ...props
}: ComponentProps<"div"> & {
  icon: React.ReactNode;
  title: string;
  description: string;
}) {
  return (
    <div
      data-slot="card-list-empty"
      className={cn(
        "flex flex-col items-center justify-center py-16 text-center",
        className
      )}
      {...props}
    >
      <div className="rounded-full bg-muted p-4 mb-4">{icon}</div>
      <h3 className="text-lg font-semibold mb-2">{title}</h3>
      <p className="text-sm text-muted-foreground max-w-sm">{description}</p>
    </div>
  );
}

function CardList({
  className,
  children,
  ...props
}: ComponentProps<"div">) {
  return (
    <div
      data-slot="card-list"
      className={cn("space-y-2 flex flex-col shadow-sm", className)}
      {...props}
    >
      {children}
    </div>
  );
}

export { CardList, CardListItem, CardListEmpty };
