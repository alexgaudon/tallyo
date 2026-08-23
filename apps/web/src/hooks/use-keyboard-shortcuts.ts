import { useHotkey } from "@tanstack/react-hotkeys";
import { toast } from "sonner";
import { useUpdateSettings } from "@/hooks/use-update-settings";
import { useSession } from "@/lib/auth-client";

export function useKeyboardShortcuts() {
  const { data: session } = useSession();

  const { mutate: toggleDevMode } = useUpdateSettings({
    onSuccess: (settings) => {
      toast.success(
        `Developer mode ${settings.isDevMode ? "enabled" : "disabled"}`,
        {
          description: settings.isDevMode
            ? "Developer tools are now visible"
            : "Developer tools are now hidden",
          duration: 3000,
        },
      );
    },
  });

  const { mutate: togglePrivacyMode } = useUpdateSettings({
    onSuccess: (settings) => {
      toast.success(
        `Privacy mode ${settings.isPrivacyMode ? "enabled" : "disabled"}`,
        {
          description: settings.isPrivacyMode
            ? "Sensitive information is now hidden"
            : "Sensitive information is now visible",
          duration: 3000,
        },
      );
    },
  });

  useHotkey(
    "Mod+Shift+D",
    () => {
      if (!session?.settings) return;
      toggleDevMode({ isDevMode: !(session.settings.isDevMode ?? false) });
    },
    { enabled: !!session?.settings },
  );

  useHotkey(
    "Mod+Shift+P",
    () => {
      if (!session?.settings) return;
      togglePrivacyMode({
        isPrivacyMode: !(session.settings.isPrivacyMode ?? false),
      });
    },
    { enabled: !!session?.settings },
  );
}
