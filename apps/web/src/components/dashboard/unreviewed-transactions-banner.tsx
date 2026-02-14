import { Link } from "@tanstack/react-router";
import { AlertCircle, Eye } from "lucide-react";
import { Button } from "@/components/ui/button";

export function UnreviewedTransactionsBanner({
  count,
  onReviewClick,
}: {
  count: number;
  onReviewClick?: () => void;
}) {
  if (!count) return null;

  return (
    <div className="rounded-xl border border-accent/20 bg-accent/5 p-4 shadow-soft">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <AlertCircle className="h-4 w-4 text-accent" />
          <span className="text-sm">
            <span className="font-semibold text-accent">{count}</span>{" "}
            transaction{count !== 1 && "s"} need your attention
          </span>
        </div>
        {onReviewClick ? (
          <Button variant="outline" size="sm" onClick={onReviewClick}>
            <Eye className="h-3 w-3 mr-1" />
            Review now
          </Button>
        ) : (
          <Button asChild size="sm" variant="outline">
            <Link to="/transactions" search={{ onlyUnreviewed: true }}>
              <Eye className="h-3 w-3 mr-1" />
              Review now
            </Link>
          </Button>
        )}
      </div>
    </div>
  );
}
