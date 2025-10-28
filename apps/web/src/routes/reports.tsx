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
    <div className="container mx-auto max-w-screen-2xl p-4 sm:p-6 lg:p-8 space-y-6">
      <div className="bg-card rounded-xl border shadow-sm p-6">
        <div className="flex items-center gap-3">
          <div className="flex items-center justify-center w-10 h-10 rounded-lg bg-primary/10">
            <BarChart3Icon className="h-6 w-6 text-primary" />
          </div>
          <div>
            <h1 className="text-2xl font-bold">Transaction Reports</h1>
            <p className="text-sm text-muted-foreground">
              Generate detailed reports on your transactions
            </p>
          </div>
        </div>
      </div>

      <div className="bg-card rounded-xl border shadow-sm p-6">
        <TransactionReport />
      </div>
    </div>
  );
}
