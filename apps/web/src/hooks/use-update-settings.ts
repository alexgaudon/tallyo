import { useMutation } from "@tanstack/react-query";
import { toast } from "sonner";
import { orpc, queryClient } from "@/utils/orpc";

export interface UserSettings {
  displayName?: string | null;
  isDevMode: boolean;
  isPrivacyMode: boolean;
  webhookUrls?: string[];
}

export type UpdateSettingsPatch = Partial<UserSettings>;

const SETTINGS_QUERY_KEY =
  orpc.settings.getUserSettings.queryOptions().queryKey;
const SESSION_QUERY_KEY = ["session"];

function getCachedSettings(): UserSettings {
  const fromSettings = queryClient.getQueryData<{
    settings: UserSettings;
  }>(SETTINGS_QUERY_KEY)?.settings;
  if (fromSettings) return fromSettings;

  const fromSession = queryClient.getQueryData<{
    settings?: UserSettings;
  }>(SESSION_QUERY_KEY)?.settings;
  return (
    fromSession ?? { isDevMode: false, isPrivacyMode: false, displayName: null }
  );
}

/**
 * Single owner of the settings-update flow: merges a partial patch over the
 * currently cached settings (preserving fields the caller didn't specify),
 * optimistically writes both the settings and session caches from one
 * snapshot, restores both from that snapshot on error, and invalidates both
 * on success.
 */
export function useUpdateSettings(options?: {
  errorTitle?: string;
  showRetry?: boolean;
  onSuccess?: (settings: {
    displayName?: string | null;
    isDevMode: boolean;
    isPrivacyMode: boolean;
    webhookUrls?: string[] | null;
  }) => void;
}) {
  const mutation = useMutation(
    orpc.settings.updateSettings.mutationOptions({
      onMutate: async (newSettings: UserSettings) => {
        await queryClient.cancelQueries({ queryKey: SETTINGS_QUERY_KEY });

        const previousSettings = queryClient.getQueryData(SETTINGS_QUERY_KEY);
        const previousSession = queryClient.getQueryData(SESSION_QUERY_KEY);

        queryClient.setQueryData(
          SETTINGS_QUERY_KEY,
          (old: { settings?: UserSettings } | undefined) => ({
            ...old,
            settings: newSettings,
          }),
        );
        queryClient.setQueryData(
          SESSION_QUERY_KEY,
          (old: { settings?: UserSettings } | undefined) => ({
            ...old,
            settings: newSettings,
          }),
        );

        return { previousSettings, previousSession };
      },
      onError: (err, newSettings, context) => {
        if (context?.previousSettings !== undefined) {
          queryClient.setQueryData(
            SETTINGS_QUERY_KEY,
            context.previousSettings,
          );
        }
        if (context?.previousSession !== undefined) {
          queryClient.setQueryData(SESSION_QUERY_KEY, context.previousSession);
        }

        toast.error(options?.errorTitle ?? "Failed to update settings", {
          description:
            err instanceof Error
              ? `Error: ${err.message}`
              : "An unexpected error occurred. Please try again.",
          duration: 5000,
          ...(options?.showRetry && {
            action: {
              label: "Retry",
              onClick: () => {
                mutation.mutate(newSettings);
              },
            },
          }),
        });
      },
      onSuccess: (data) => {
        queryClient.invalidateQueries({ queryKey: SETTINGS_QUERY_KEY });
        queryClient.invalidateQueries({ queryKey: SESSION_QUERY_KEY });

        options?.onSuccess?.(data.settings);
      },
    }),
  );

  return {
    ...mutation,
    mutate: (patch: UpdateSettingsPatch) =>
      mutation.mutate({ ...getCachedSettings(), ...patch }),
  };
}
