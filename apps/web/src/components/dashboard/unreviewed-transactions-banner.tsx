import { Link } from "@tanstack/react-router";
import { AlertCircle, Eye } from "lucide-react";
import { Button } from "@/components/ui/button";

export function UnreviewedTransactionsBanner({ count }: { count: number }) {
  if (!count) return null;

  return (
    <div className="border-l-4 border-l-accent bg-muted/50 px-3 py-2 flex items-center justify-between">
      <div className="flex items-center gap-2">
        <AlertCircle className="h-4 w-4 text-accent" />
        <span className="text-sm font-medium">
          {count} unreviewed transaction{count !== 1 && "s"} pending
        </span>
      </div>
      <Button asChild size="sm" variant="ghost">
        <Link to="/transactions" search={{ onlyUnreviewed: true }}>
          <Eye className="h-3 w-3 mr-1" />
          Review
        </Link>
      </Button>
    </div>
  );
}
