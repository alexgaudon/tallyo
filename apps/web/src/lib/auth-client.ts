import { orpc } from "@/utils/orpc";
import { useQuery } from "@tanstack/react-query";
import { redirect } from "@tanstack/react-router";
import { createAuthClient } from "better-auth/react";

export const authClient = createAuthClient({
	baseURL: import.meta.env.VITE_SERVER_URL,
});

export const useSessionFetch = async () => {
	const session = await authClient.getSession();
	if (!session) throw redirect({ to: "/login" });

	// Fetch user settings
	const settings = await orpc.settings.getUserSettings.call();

	return {
		...session,
		settings: settings.settings,
	};
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
