import { ORPCError } from "@orpc/client";
import { useQuery } from "@tanstack/react-query";
import { redirect } from "@tanstack/react-router";
import { orpc } from "@/utils/orpc";

export interface Session {
  user: {
    id: string;
    name: string;
    email: string;
    image: string | null;
  };
  expiresAt: string;
}

/**
 * Check if users exist in the system
 */
export async function hasUsers(): Promise<boolean> {
  const result = await orpc.auth.hasUsers.call();
  return result.hasUsers || false;
}

/**
 * Get current session
 */
export async function getSession(): Promise<Session | null> {
  const result = await orpc.auth.getSession.call();
  return result.session;
}

/**
 * Sign out
 */
export async function signOut(): Promise<void> {
  await orpc.auth.signOut.call();
}

/**
 * Initiate Discord OAuth flow
 */
export async function initiateDiscordAuth(): Promise<void> {
  const result = await orpc.auth.getDiscordAuthUrl.call();
  // Redirect to REST endpoint that sets cookie and redirects to Discord
  window.location.href = `/api/auth/discord/authorize?state=${result.state}`;
}

export const useSessionFetch = async () => {
  const session = await getSession();
  if (!session) return null;

  try {
    const data = await Promise.all([
      orpc.meta.getUserMeta.call(),
      orpc.settings.getUserSettings.call(),
    ]);

    return {
      ...session,
      ...data[1],
      meta: data[0],
      isAuthenticated: true,
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
    refetchOnWindowFocus: true,
  });
};

export const ensureSession = (isAuthenticated: boolean, from = "/") => {
  if (!isAuthenticated) {
    throw redirect({ to: "/signin", search: { from } });
  }
};
