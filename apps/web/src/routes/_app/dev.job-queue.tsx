import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { createFileRoute } from "@tanstack/react-router";
import { RefreshCw } from "lucide-react";
import { PageHeader } from "@/components/layout/page-header";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { Panel } from "@/components/ui/panel";
import { formatCurrency } from "@/lib/utils";
import { orpc } from "@/utils/orpc";

export const Route = createFileRoute("/_app/dev/job-queue")({
  component: JobQueueDevRoute,
});

const STATUS_VARIANT: Record<
  string,
  "default" | "secondary" | "outline" | "destructive" | "success"
> = {
  pending: "secondary",
  processing: "default",
  done: "outline",
  failed: "destructive",
};

/**
 * Development-only view of the AI suggestion queue. Auto-refreshes so you can
 * watch jobs move from pending to done as the worker processes them.
 */
function JobQueueDevRoute() {
  const queryClient = useQueryClient();

  const jobsQuery = orpc.meta.getSuggestionJobs.queryOptions({
    input: { limit: 100 },
  });
  const { data: jobs, isFetching } = useQuery({
    ...jobsQuery,
    refetchInterval: 2000,
  });

  const { data: categoriesData } = useQuery(
    orpc.categories.getUserCategories.queryOptions(),
  );
  const categoryNameById = new Map(
    (categoriesData?.categories ?? []).map((c) => [c.id, c.name]),
  );

  const retry = useMutation(
    orpc.meta.retrySuggestionJob.mutationOptions({
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: jobsQuery.queryKey });
      },
    }),
  );

  if (!import.meta.env.DEV) {
    return (
      <div className="mx-auto max-w-3xl px-4 py-16">
        <EmptyState
          title="Not available"
          description="The job queue view is only available in development."
        />
      </div>
    );
  }

  const rows = jobs ?? [];
  const counts = rows.reduce<Record<string, number>>((acc, job) => {
    acc[job.status] = (acc[job.status] ?? 0) + 1;
    return acc;
  }, {});

  return (
    <div className="min-h-full">
      <PageHeader
        eyebrow="Dev"
        title="Suggestion job queue"
        description="AI category suggestion jobs. Auto-refreshes every 2s."
        actions={
          <div className="flex items-center gap-3">
            <span className="text-xs text-muted-foreground">
              {counts.pending ?? 0} pending · {counts.processing ?? 0}{" "}
              processing · {counts.done ?? 0} done · {counts.failed ?? 0} failed
            </span>
            <Button
              variant="outline"
              size="sm"
              onClick={() => queryClient.invalidateQueries()}
            >
              <RefreshCw
                className={`mr-1.5 h-3.5 w-3.5 ${isFetching ? "animate-spin" : ""}`}
              />
              Refresh
            </Button>
          </div>
        }
      />

      <div className="mx-auto max-w-screen-2xl space-y-6 px-4 py-8 lg:px-8">
        <Panel className="gap-0 overflow-hidden p-0">
          {rows.length === 0 ? (
            <div className="p-6">
              <EmptyState
                compact
                bordered={false}
                title="No jobs"
                description="Jobs appear here when a transaction without a category is created or imported."
              />
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="border-b border-border bg-muted/40 text-xs uppercase tracking-wide text-muted-foreground">
                  <tr>
                    <th className="px-3 py-2 text-left font-semibold">
                      Status
                    </th>
                    <th className="px-3 py-2 text-left font-semibold">
                      Transaction
                    </th>
                    <th className="px-3 py-2 text-left font-semibold">
                      Suggestion
                    </th>
                    <th className="px-3 py-2 text-right font-semibold">
                      Attempts
                    </th>
                    <th className="px-3 py-2 text-left font-semibold">
                      Updated
                    </th>
                    <th className="px-3 py-2 text-left font-semibold">Error</th>
                    <th className="px-3 py-2" />
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {rows.map((job) => {
                    const confidence =
                      job.suggestedCategoryConfidence !== null
                        ? Math.round(job.suggestedCategoryConfidence * 100)
                        : null;
                    const suggestedName = job.suggestedCategoryId
                      ? (categoryNameById.get(job.suggestedCategoryId) ??
                        job.suggestedCategoryId.slice(0, 8))
                      : null;
                    const busy =
                      job.status === "pending" || job.status === "processing";

                    return (
                      <tr key={job.id} className="align-top">
                        <td className="px-3 py-2">
                          <Badge
                            variant={STATUS_VARIANT[job.status] ?? "outline"}
                            className="text-[10px]"
                          >
                            {job.status}
                          </Badge>
                        </td>
                        <td className="max-w-[22rem] px-3 py-2">
                          <div className="truncate font-medium">
                            {job.transactionDetails ?? "(deleted)"}
                          </div>
                          <div className="text-xs text-muted-foreground">
                            {job.amount !== null
                              ? formatCurrency(job.amount)
                              : ""}
                            {job.categoryId ? " · already categorized" : ""}
                          </div>
                        </td>
                        <td className="px-3 py-2">
                          {suggestedName ? (
                            <span>
                              {suggestedName}
                              {confidence !== null ? (
                                <span className="text-muted-foreground">
                                  {" "}
                                  ({confidence}%)
                                </span>
                              ) : null}
                            </span>
                          ) : (
                            <span className="text-muted-foreground">—</span>
                          )}
                        </td>
                        <td className="px-3 py-2 text-right tabular-nums">
                          {job.attempts}
                        </td>
                        <td className="whitespace-nowrap px-3 py-2 text-xs text-muted-foreground">
                          {new Date(job.updatedAt).toLocaleTimeString()}
                        </td>
                        <td className="max-w-[16rem] px-3 py-2 text-xs text-destructive">
                          <span className="line-clamp-2">
                            {job.lastError ?? ""}
                          </span>
                        </td>
                        <td className="px-3 py-2 text-right">
                          <Button
                            variant="ghost"
                            size="sm"
                            disabled={busy || retry.isPending}
                            onClick={() => retry.mutate({ id: job.id })}
                          >
                            Retry
                          </Button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </Panel>
      </div>
    </div>
  );
}
