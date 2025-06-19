import { Stats } from "@/components/dashboard/stats";
import { ensureSession } from "@/lib/auth-client";
import { orpc } from "@/utils/orpc";
import { useQuery } from "@tanstack/react-query";
import { createFileRoute } from "@tanstack/react-router";
import { CreditCardIcon } from "lucide-react";

export const Route = createFileRoute("/dashboard")({
	component: RouteComponent,
	beforeLoad: async ({ context }) => {
		ensureSession(context.isAuthenticated, "/dashboard");
		await Promise.all([
			context.queryClient.prefetchQuery(
				orpc.dashboard.getStatsCounts.queryOptions(),
			),
		]);
	},
});

function RouteComponent() {
	const { data } = useQuery(orpc.dashboard.getStatsCounts.queryOptions());

	return (
		<div className="p-4">
			<div className="flex items-center justify-center mb-2">
				<div className="flex items-center gap-2">
					<CreditCardIcon className="h-6 w-6" />
					<h1 className="text-2xl font-bold">Dashboard</h1>
				</div>
			</div>
			<Stats data={data?.stats} />
		</div>
	);
}
