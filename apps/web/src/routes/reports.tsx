import { createFileRoute } from "@tanstack/react-router";
import { BarChart3Icon } from "lucide-react";
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
    <div className="mx-auto max-w-6xl px-4 py-4 sm:px-6 sm:py-6 lg:px-8 lg:py-8 space-y-4 sm:space-y-5 lg:space-y-6">
      <div className="bg-card/80 backdrop-blur-sm rounded-lg border shadow-xs sm:shadow-sm px-4 py-3 sm:px-5 sm:py-4 lg:px-6 lg:py-5">
        <div className="flex items-center gap-3">
          <div className="flex items-center justify-center w-9 h-9 sm:w-10 sm:h-10 rounded-lg bg-accent/10">
            <BarChart3Icon className="h-5 w-5 sm:h-6 sm:w-6 text-accent" />
          </div>
          <div>
            <h1 className="text-lg sm:text-xl lg:text-2xl font-semibold tracking-tight">
              Transaction Reports
            </h1>
            <p className="text-xs sm:text-sm text-muted-foreground">
              Generate detailed reports on your transactions
            </p>
          </div>
        </div>
      </div>

      <div className="px-1 sm:px-0">
        <TransactionReport />
      </div>
    </div>
  );
}
