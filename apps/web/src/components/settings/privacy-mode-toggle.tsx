import { Eye, EyeOff } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { useUpdateSettings } from "@/hooks/use-update-settings";
import { useSession } from "@/lib/auth-client";

export function PrivacyModeToggle() {
  const { data: session } = useSession();
  const isPrivacyMode = session?.settings?.isPrivacyMode ?? false;

  const { mutate: updateSettings, isPending } = useUpdateSettings({
    errorTitle: "Failed to update privacy mode",
    showRetry: true,
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

  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <Button
          variant="outline"
          size="icon"
          onClick={() => updateSettings({ isPrivacyMode: !isPrivacyMode })}
          disabled={isPending}
        >
          {isPrivacyMode ? (
            <EyeOff className="h-4 w-4" />
          ) : (
            <Eye className="h-4 w-4" />
          )}
          <span className="sr-only">
            {isPrivacyMode ? "Disable privacy mode" : "Enable privacy mode"}
          </span>
        </Button>
      </TooltipTrigger>
      <TooltipContent>
        <p>{isPrivacyMode ? "Disable privacy mode" : "Enable privacy mode"}</p>
        <p className="text-xs text-muted-foreground">Ctrl+Shift+P</p>
      </TooltipContent>
    </Tooltip>
  );
}
