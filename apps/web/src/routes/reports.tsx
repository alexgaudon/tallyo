import { createFileRoute } from "@tanstack/react-router";
import { z } from "zod";
import { TransactionReport } from "@/components/transactions/transaction-report";
import { PageHeader } from "@/components/layout/page-header";
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
      <PageHeader eyebrow="Analytics" title="Reports" description="Explore the patterns behind your spending with focused filters and summaries." />

      <div className="max-w-screen-2xl mx-auto px-4 py-8 lg:px-8 space-y-6">
        <div>
          <TransactionReport />
        </div>
      </div>
    </div>
  );
}
