import { orpc } from "@/utils/orpc";
import { ORPCError } from "@orpc/client";
import { useQuery } from "@tanstack/react-query";
import { redirect } from "@tanstack/react-router";
import { createAuthClient } from "better-auth/react";

export const authClient = createAuthClient({
	baseURL: import.meta.env.VITE_SERVER_URL,
});

export const useSessionFetch = async () => {
	const session = await authClient.getSession();
	if (!session) return null;

	try {
		const settings = await orpc.settings.getUserSettings.call();
		return {
			...session,
			settings: settings.settings,
		};
	} catch (error) {
		if (error instanceof ORPCError) {
			if (error.code === "UNAUTHORIZED") {
				return null;
			}
		}
	}
};

export const useSession = () => {
	return useQuery({
		queryKey: ["session"],
		queryFn: useSessionFetch,
	});
};

export const ensureSession = (isAuthenticated: boolean, from = "/") => {
	if (!isAuthenticated) {
		throw redirect({ to: "/login", search: { from } });
	}
};
