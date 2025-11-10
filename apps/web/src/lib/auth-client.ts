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
  const response = await fetch("/api/auth/has-users");
  const data = await response.json();
  return data.hasUsers || false;
}

/**
 * Get current session
 */
export async function getSession(): Promise<Session | null> {
  const response = await fetch("/api/auth/session", {
    credentials: "include",
  });

  if (!response.ok) {
    return null;
  }

  const data = await response.json();
  return data.session;
}

/**
 * Sign out
 */
export async function signOut(): Promise<void> {
  await fetch("/api/auth/signout", {
    method: "POST",
    credentials: "include",
  });
}

/**
 * Initiate Discord OAuth flow
 */
export function initiateDiscordAuth(): void {
  window.location.href = "/api/auth/discord/authorize";
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
