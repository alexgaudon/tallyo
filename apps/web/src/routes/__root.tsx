import Header from "@/components/header";
import { ThemeProvider } from "@/components/theme-provider";
import { Toaster } from "@/components/ui/sonner";
import { useSessionFetch } from "@/lib/auth-client";
import { ORPCContext, link, type orpc } from "@/utils/orpc";
import { createORPCClient } from "@orpc/client";
import { createORPCReactQueryUtils } from "@orpc/react-query";
import type { RouterClient } from "@orpc/server";
import type { QueryClient } from "@tanstack/react-query";
import { ReactQueryDevtools } from "@tanstack/react-query-devtools";
import {
	HeadContent,
	Link,
	Outlet,
	createRootRouteWithContext,
	useLocation,
} from "@tanstack/react-router";
import { TanStackRouterDevtools } from "@tanstack/react-router-devtools";
import { ArrowLeft } from "lucide-react";
import { useState } from "react";
import type { appRouter } from "../../../server/src/routers";
import "../index.css";

export interface RouterAppContext {
	orpc: typeof orpc;
	queryClient: QueryClient;
}

export const Route = createRootRouteWithContext<RouterAppContext>()({
	component: RootComponent,
	beforeLoad: async ({ context }) => {
		const queryClient = context.queryClient;
		const session = await queryClient.ensureQueryData({
			queryKey: ["session"],
			queryFn: useSessionFetch,
		});

		return { auth: session, isAuthenticated: !!session };
	},
	head: () => ({
		meta: [
			{
				title: "Tallyo",
			},
			{
				name: "description",
				content: "Tallyo is a personal finance inspection tool",
			},
		],
		links: [
			{
				rel: "icon",
				href: "/favicon.ico",
			},
		],
	}),
});

function RootComponent() {
	const [client] = useState<RouterClient<typeof appRouter>>(() =>
		createORPCClient(link),
	);
	const [orpcUtils] = useState(() => createORPCReactQueryUtils(client));

	const location = useLocation();
	console.log(location);

	return (
		<>
			<HeadContent />
			<ORPCContext.Provider value={orpcUtils}>
				<ThemeProvider defaultTheme="dark" storageKey="vite-ui-theme">
					<div className="grid h-svh grid-rows-[auto_1fr]">
						{location.pathname.startsWith("/sign") ? (
							<div className="h-16 mt-8 ml-8">
								<Link to="/">
									<ArrowLeft className="h-4 w-4" />
								</Link>
							</div>
						) : (
							<Header />
						)}
						<Outlet />
					</div>
					<Toaster richColors />
				</ThemeProvider>
			</ORPCContext.Provider>
			<TanStackRouterDevtools position="bottom-left" />
			<ReactQueryDevtools position="bottom" buttonPosition="bottom-right" />
		</>
	);
}
