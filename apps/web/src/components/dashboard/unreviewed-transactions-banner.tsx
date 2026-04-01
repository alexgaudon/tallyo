import { Link } from "@tanstack/react-router";
import { AlertCircle, Eye } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export function UnreviewedTransactionsBanner({
  count,
  onReviewClick,
}: {
  count: number;
  onReviewClick?: () => void;
}) {
  if (!count) return null;

  return (
    <div
      className={cn(
        "relative overflow-hidden rounded-xl border p-4 shadow-soft",
        "bg-primary/5 border-primary/20",
      )}
    >
      {/* Subtle animated background gradient */}
      <div className="absolute inset-0 bg-gradient-to-r from-primary/5 via-transparent to-primary/5 opacity-50" />

      <div className="relative flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary/10 text-primary">
            <AlertCircle className="h-5 w-5" />
          </div>
          <div>
            <span className="text-sm font-medium text-foreground">
              <span className="tabular-nums text-primary">{count}</span>{" "}
              transaction{count !== 1 ? "s" : ""} need{count === 1 ? "s" : ""}{" "}
              review
            </span>
            <p className="text-xs text-muted-foreground mt-0.5">
              Review and categorize to keep your finances accurate
            </p>
          </div>
        </div>
        {onReviewClick ? (
          <Button
            variant="outline"
            size="sm"
            onClick={onReviewClick}
            className="border-primary/30 hover:bg-primary/10 hover:text-primary"
          >
            <Eye className="h-3.5 w-3.5 mr-1.5" />
            Review now
          </Button>
        ) : (
          <Button
            asChild
            size="sm"
            variant="outline"
            className="border-primary/30 hover:bg-primary/10 hover:text-primary"
          >
            <Link to="/transactions" search={{ onlyUnreviewed: true }}>
              <Eye className="h-3.5 w-3.5 mr-1.5" />
              Review now
            </Link>
          </Button>
        )}
      </div>
    </div>
  );
}
