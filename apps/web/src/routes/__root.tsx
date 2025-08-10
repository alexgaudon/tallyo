import { createORPCClient } from "@orpc/client";
import { createORPCReactQueryUtils } from "@orpc/react-query";
import type { RouterClient } from "@orpc/server";
import type { QueryClient } from "@tanstack/react-query";
import { ReactQueryDevtools } from "@tanstack/react-query-devtools";
import {
	createRootRouteWithContext,
	HeadContent,
	Link,
	Outlet,
	useLocation,
} from "@tanstack/react-router";
import { TanStackRouterDevtools } from "@tanstack/react-router-devtools";
import { ArrowLeft } from "lucide-react";
import { useState } from "react";
import Footer from "@/components/footer";
import Header from "@/components/header";
import { ThemeProvider } from "@/components/theme-provider";
import { Toaster } from "@/components/ui/sonner";
import { useKeyboardShortcuts } from "@/hooks/use-keyboard-shortcuts";
import { useSessionFetch } from "@/lib/auth-client";
import { link, ORPCContext, type orpc } from "@/utils/orpc";
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

	useKeyboardShortcuts();

	return (
		<>
			<HeadContent />
			<ORPCContext.Provider value={orpcUtils}>
				<ThemeProvider defaultTheme="dark" storageKey="vite-ui-theme">
					<div className="flex flex-col min-h-svh">
						{location.pathname.startsWith("/sign") ? (
							<div className="h-16 mt-8 ml-8">
								<Link to="/">
									<ArrowLeft className="h-4 w-4" />
								</Link>
							</div>
						) : (
							<Header />
						)}
						<main className="flex-1">
							<Outlet />
						</main>
						<Footer />
					</div>
					<Toaster richColors />
				</ThemeProvider>
			</ORPCContext.Provider>
			{import.meta.env.DEV && (
				<>
					<TanStackRouterDevtools position="bottom-left" />
					<ReactQueryDevtools position="bottom" buttonPosition="bottom-right" />
				</>
			)}
		</>
	);
}
