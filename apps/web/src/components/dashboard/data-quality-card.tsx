import { Link } from "@tanstack/react-router";
import { ArrowRight, CheckCircle2, Eye, Tag } from "lucide-react";
import { Card } from "@/components/ui/card";
import type { DashboardDataQuality } from "../../../../server/src/routers";

export function DataQualityCard({
  data,
}: {
  data: DashboardDataQuality | undefined;
}) {
  if (!data || data.totalTransactions === 0) {
    return null;
  }

  const { totalTransactions, reviewedTransactions, uncategorizedTransactions } =
    data;
  const unreviewed = totalTransactions - reviewedTransactions;
  const reviewedPct =
    totalTransactions > 0
      ? Math.round((reviewedTransactions / totalTransactions) * 100)
      : 0;

  return (
    <Card className="border-border/80 bg-card/90 p-4 sm:p-5 shadow-sm">
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-md bg-income/10">
            <CheckCircle2 className="h-4 w-4 text-income" />
          </div>
          <div>
            <p className="text-xs text-muted-foreground uppercase tracking-wider">
              Reviewed
            </p>
            <p className="text-lg font-semibold tabular-nums">{reviewedPct}%</p>
            <p className="text-xs text-muted-foreground">
              {reviewedTransactions} of {totalTransactions} transactions
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <div className="p-2 rounded-md bg-accent/10">
            <Eye className="h-4 w-4 text-accent" />
          </div>
          <div>
            <p className="text-xs text-muted-foreground uppercase tracking-wider">
              Unreviewed
            </p>
            <p className="text-lg font-semibold tabular-nums">{unreviewed}</p>
            {unreviewed > 0 ? (
              <Link
                to="/transactions"
                search={{ onlyUnreviewed: true }}
                className="inline-flex items-center gap-0.5 text-xs font-medium text-accent hover:underline"
              >
                Review now
                <ArrowRight className="h-3 w-3" />
              </Link>
            ) : (
              <p className="text-xs text-muted-foreground">In this period</p>
            )}
          </div>
        </div>

        <div className="flex items-center gap-3">
          <div className="p-2 rounded-md bg-amber-500/10">
            <Tag className="h-4 w-4 text-amber-500" />
          </div>
          <div>
            <p className="text-xs text-muted-foreground uppercase tracking-wider">
              Uncategorized
            </p>
            <p className="text-lg font-semibold tabular-nums">
              {uncategorizedTransactions}
            </p>
            <p className="text-xs text-muted-foreground">
              Transactions without a category
            </p>
          </div>
        </div>
      </div>
    </Card>
  );
}
