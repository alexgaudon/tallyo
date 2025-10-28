import { Link } from "@tanstack/react-router";
import { AlertCircle, Eye } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";

interface UnreviewedTransactionsBannerProps {
  count: number;
}

export function UnreviewedTransactionsBanner({
  count,
}: UnreviewedTransactionsBannerProps) {
  if (count === 0) return null;

  return (
    <Card className="border-l-4 border-l-blue-500 border-muted bg-muted/50">
      <CardContent className="flex items-center justify-between p-3">
        <div className="flex items-center gap-2">
          <AlertCircle className="h-4 w-4 text-blue-500" />
          <span className="text-sm font-medium text-foreground">
            {count} unreviewed transaction{count !== 1 ? "s" : ""} pending
          </span>
        </div>
        <Button asChild size="sm" variant="ghost">
          <Link to="/transactions" search={{ onlyUnreviewed: true }}>
            <Eye className="h-3 w-3 mr-1" />
            Review
          </Link>
        </Button>
      </CardContent>
    </Card>
  );
}
