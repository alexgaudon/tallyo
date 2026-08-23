import { type ComponentProps } from "react";
import { cn } from "@/lib/utils";
import { EmptyState } from "@/components/ui/empty-state";

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
}: {
  className?: string;
  icon: React.ReactNode;
  title: string;
  description: string;
}) {
  return (
    <EmptyState
      icon={icon}
      title={title}
      description={description}
      bordered={false}
      className={className}
    />
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
