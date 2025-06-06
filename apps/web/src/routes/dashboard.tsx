import { ensureSession, useSession } from "@/lib/auth-client";
import { orpc } from "@/utils/orpc";
import { useQuery } from "@tanstack/react-query";
import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/dashboard")({
	component: RouteComponent,
	beforeLoad: async ({ context }) => {
		ensureSession(context.isAuthenticated, "/dashboard");
		await context.queryClient.prefetchQuery(orpc.privateData.queryOptions());
	},
});

function RouteComponent() {
	const privateData = useQuery(orpc.privateData.queryOptions());

	const { data: session } = useSession();

	return (
		<div className="p-4">
			<h1>Dashboard</h1>
			<p>Welcome {session?.data?.user?.name}</p>
			<p>privateData: {privateData.data?.message}</p>
		</div>
	);
}
