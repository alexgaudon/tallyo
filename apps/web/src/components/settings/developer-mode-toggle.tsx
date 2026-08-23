import { Code, Code2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { useUpdateSettings } from "@/hooks/use-update-settings";
import { useSession } from "@/lib/auth-client";

export function DeveloperModeToggle() {
  const { data: session } = useSession();
  const isDevMode = session?.settings?.isDevMode ?? false;

  const { mutate: updateSettings, isPending } = useUpdateSettings({
    errorTitle: "Failed to update developer mode",
    showRetry: true,
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

  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <Button
          variant="outline"
          size="icon"
          onClick={() => updateSettings({ isDevMode: !isDevMode })}
          disabled={isPending}
        >
          {isDevMode ? (
            <Code className="h-4 w-4" />
          ) : (
            <Code2 className="h-4 w-4" />
          )}
          <span className="sr-only">
            {isDevMode ? "Disable developer mode" : "Enable developer mode"}
          </span>
        </Button>
      </TooltipTrigger>
      <TooltipContent>
        <p>{isDevMode ? "Disable developer mode" : "Enable developer mode"}</p>
        <p className="text-xs text-muted-foreground">Ctrl+Shift+D</p>
      </TooltipContent>
    </Tooltip>
  );
}
