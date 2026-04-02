import { createFileRoute } from "@tanstack/react-router";
import { z } from "zod";
import { TransactionReport } from "@/components/transactions/transaction-report";
import { ensureSession } from "@/lib/auth-client";
import { orpc } from "@/utils/orpc";

const searchSchema = z.object({
  dateFrom: z.string().optional(),
  dateTo: z.string().optional(),
  categoryIds: z.array(z.string()).optional(),
  merchantIds: z.array(z.string()).optional(),
  amountMin: z.coerce.number().optional(),
  amountMax: z.coerce.number().optional(),
  reviewed: z.boolean().optional(),
  includeIncome: z.boolean().optional(),
});

export const Route = createFileRoute("/reports")({
  validateSearch: searchSchema,
  component: RouteComponent,
  beforeLoad: async ({ context }) => {
    ensureSession(context.isAuthenticated, "/reports");
    await Promise.all([
      context.queryClient.prefetchQuery(
        orpc.categories.getUserCategories.queryOptions(),
      ),
      context.queryClient.prefetchQuery(
        orpc.merchants.getUserMerchants.queryOptions(),
      ),
    ]);
  },
});

function RouteComponent() {
  return (
    <div className="min-h-full">
      <header className="border-b border-border/40 bg-gradient-to-br from-background via-background to-muted/20">
        <div className="max-w-screen-2xl mx-auto px-4 py-6 lg:px-8">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div className="space-y-1">
              <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
                Analytics
              </p>
              <h1 className="text-3xl sm:text-4xl font-bold tracking-tight">
                <span className="bg-gradient-to-r from-foreground via-foreground to-muted-foreground bg-clip-text text-transparent">
                  Reports
                </span>
              </h1>
            </div>
          </div>
        </div>
      </header>

      <div className="max-w-screen-2xl mx-auto px-4 py-6 lg:px-8 space-y-6">
        <div className="px-1 sm:px-0">
          <TransactionReport />
        </div>
      </div>
    </div>
  );
}
