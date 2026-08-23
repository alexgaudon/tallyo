import { useHotkey } from "@tanstack/react-hotkeys";
import { useMutation } from "@tanstack/react-query";
import { toast } from "sonner";
import { useSession } from "@/lib/auth-client";
import { orpc, queryClient } from "@/utils/orpc";

export function useKeyboardShortcuts() {
  const { data: session } = useSession();

  const { mutate: updateSettings } = useMutation(
    orpc.settings.updateSettings.mutationOptions({
      onSuccess: () => {
        queryClient.invalidateQueries({
          queryKey: orpc.settings.getUserSettings.queryOptions().queryKey,
        });
        queryClient.invalidateQueries({
          queryKey: ["session"],
        });
      },
      onError: (err) => {
        toast.error("Failed to update settings", {
          description:
            err instanceof Error
              ? `Error: ${err.message}`
              : "An unexpected error occurred. Please try again.",
          duration: 5000,
        });
      },
    }),
  );

  useHotkey(
    "Mod+Shift+D",
    () => {
      if (!session?.settings) return;

      const currentDevMode = session.settings.isDevMode ?? false;
      updateSettings({
        isDevMode: !currentDevMode,
        isPrivacyMode: session.settings.isPrivacyMode ?? false,
      });

      toast.success(
        `Developer mode ${!currentDevMode ? "enabled" : "disabled"}`,
        {
          description: !currentDevMode
            ? "Developer tools are now visible"
            : "Developer tools are now hidden",
          duration: 3000,
        },
      );
    },
    { enabled: !!session?.settings },
  );

  useHotkey(
    "Mod+Shift+P",
    () => {
      if (!session?.settings) return;

      const currentPrivacyMode = session.settings.isPrivacyMode ?? false;
      updateSettings({
        isDevMode: session.settings.isDevMode ?? false,
        isPrivacyMode: !currentPrivacyMode,
      });

      toast.success(
        `Privacy mode ${!currentPrivacyMode ? "enabled" : "disabled"}`,
        {
          description: !currentPrivacyMode
            ? "Sensitive information is now hidden"
            : "Sensitive information is now visible",
          duration: 3000,
        },
      );
    },
    { enabled: !!session?.settings },
  );
}
