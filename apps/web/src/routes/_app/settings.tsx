import { useQuery } from "@tanstack/react-query";
import { createFileRoute } from "@tanstack/react-router";
import { X } from "lucide-react";
import { useId, useState } from "react";
import { toast } from "sonner";
import { z } from "zod";
import { BuildIdentifier } from "@/components/build-identifier";
import { PageHeader } from "@/components/layout/page-header";
import { ConfirmPassword } from "@/components/settings/confirm-password";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Panel } from "@/components/ui/panel";
import { Switch } from "@/components/ui/switch";
import { useUpdateSettings } from "@/hooks/use-update-settings";
import { useSession } from "@/lib/auth-client";
import { orpc } from "@/utils/orpc";

export const Route = createFileRoute("/_app/settings")({
  component: RouteComponent,
  beforeLoad: async ({ context }) => {
    await context.queryClient.ensureQueryData(
      orpc.settings.getUserSettings.queryOptions(),
    );
  },
  validateSearch: z.object({
    op: z.string().optional(),
  }),
});

function RouteComponent() {
  const { data: session } = useSession();

  const devModeId = useId();
  const privacyModeId = useId();

  const [authToken, setAuthToken] = useState<string | null>(null);
  const [newWebhookUrl, setNewWebhookUrl] = useState("");

  const { data: settingsData } = useQuery(
    orpc.settings.getUserSettings.queryOptions(),
  );

  const [displayName, setDisplayName] = useState(
    settingsData?.settings?.displayName ?? "",
  );

  const webhookUrls: string[] = settingsData?.settings?.webhookUrls ?? [];

  const { mutate: updateSettings, isPending } = useUpdateSettings({
    showRetry: true,
    onSuccess: (newSettings) => {
      const changedSettings = [];
      const oldSettings = session?.settings;

      if (newSettings.isDevMode !== oldSettings?.isDevMode) {
        changedSettings.push({
          name: "Developer mode",
          enabled: newSettings.isDevMode,
        });
      }
      if (newSettings.isPrivacyMode !== oldSettings?.isPrivacyMode) {
        changedSettings.push({
          name: "Privacy mode",
          enabled: newSettings.isPrivacyMode,
        });
      }

      if (
        (newSettings.displayName ?? null) !== (oldSettings?.displayName ?? null)
      ) {
        toast.success("Display name updated");
      }

      if (changedSettings.length > 0) {
        const descriptions = changedSettings.map(
          (setting) =>
            `${setting.name} has been ${setting.enabled ? "enabled" : "disabled"}`,
        );

        toast.success("Settings updated", {
          description: descriptions.join(". "),
          duration: 4000,
        });
      }
    },
  });

  const [isConfirmPasswordOpen, setIsConfirmPasswordOpen] = useState(false);

  return (
    <div className="min-h-full">
      <Dialog open={isConfirmPasswordOpen}>
        <DialogContent className="max-w-sm">
          <ConfirmPassword
            onCancel={() => {
              setIsConfirmPasswordOpen(false);
            }}
            onConfirm={(apiKey: string) => {
              setIsConfirmPasswordOpen(false);
              setAuthToken(apiKey);
            }}
          />
        </DialogContent>
      </Dialog>

      <PageHeader
        eyebrow="Account"
        title="Settings"
        description="Manage privacy, integrations, and the tools connected to your financial data."
      />

      <div className="mx-auto max-w-screen-2xl space-y-6 px-4 py-8 lg:px-8">
        <Panel
          title="Display name"
          description="Choose the name shown across the app. Leave it empty to use your Discord name."
        >
          <div className="flex flex-col items-stretch gap-3 sm:flex-row sm:items-end">
            <div className="flex-1">
              <Input
                type="text"
                value={displayName}
                onChange={(e) => setDisplayName(e.target.value)}
                placeholder={session?.user?.name ?? "Your name"}
                maxLength={50}
              />
            </div>
            <Button
              onClick={() => {
                updateSettings({ displayName: displayName.trim() });
              }}
              size="sm"
              disabled={
                isPending ||
                displayName.trim() ===
                  (settingsData?.settings?.displayName ?? "")
              }
            >
              Save
            </Button>
          </div>
        </Panel>

        <Panel
          title="API token"
          description="Your API token for programmatic access. Keep it secure and never share it publicly."
        >
          <div className="space-y-3">
            <div className="flex flex-col items-stretch gap-3 sm:flex-row sm:items-end">
              <div className="relative flex-1">
                <Input
                  type={authToken ? "text" : "password"}
                  value={authToken || "•".repeat(79)}
                  readOnly
                  placeholder="No token generated"
                  className="pr-24 font-mono"
                />
                {authToken && (
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={async () => {
                      await navigator.clipboard.writeText(authToken);
                      toast.success("API token copied to clipboard");
                    }}
                    className="absolute right-2 top-1/2 h-8 -translate-y-1/2 text-xs"
                  >
                    Copy
                  </Button>
                )}
              </div>
              <div className="flex gap-2">
                <Button
                  onClick={async () => {
                    setIsConfirmPasswordOpen(true);
                  }}
                  size="sm"
                  variant="destructive"
                  className="h-8 text-xs"
                >
                  Regenerate
                </Button>
                <Button
                  onClick={async () => {
                    try {
                      await orpc.settings.deleteAuthToken.call();
                      setAuthToken(null);
                      toast.success("API token deleted successfully");
                    } catch {
                      toast.error("Failed to delete API token");
                    }
                  }}
                  variant="outline"
                  size="sm"
                  className="h-8 text-xs"
                >
                  Delete
                </Button>
              </div>
            </div>
            <p className="text-xs text-muted-foreground">
              Use in Authorization header:{" "}
              <code className="rounded bg-muted px-1.5 py-0.5 font-mono text-xs">
                Bearer YOUR_TOKEN_HERE
              </code>
            </p>
          </div>
        </Panel>

        <Panel
          title="Auto-import webhook URLs"
          description="Configure webhook URLs to receive notifications when new transactions are imported."
        >
          <div className="space-y-4">
            <div className="flex flex-col items-stretch gap-3 sm:flex-row sm:items-end">
              <div className="flex-1">
                <Input
                  type="url"
                  value={newWebhookUrl}
                  onChange={(e) => setNewWebhookUrl(e.target.value)}
                  placeholder="https://example.com/webhook"
                  className="font-mono"
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      e.preventDefault();
                      if (newWebhookUrl.trim()) {
                        const url = newWebhookUrl.trim();
                        try {
                          new URL(url);
                          if (webhookUrls.includes(url)) {
                            toast.error("This URL is already added");
                            return;
                          }
                          const updatedUrls = [...webhookUrls, url];
                          updateSettings({ webhookUrls: updatedUrls });
                          setNewWebhookUrl("");
                          toast.success("Webhook URL added");
                        } catch {
                          toast.error("Please enter a valid URL");
                        }
                      }
                    }
                  }}
                />
              </div>
              <Button
                onClick={() => {
                  if (newWebhookUrl.trim()) {
                    const url = newWebhookUrl.trim();
                    try {
                      new URL(url);
                      if (webhookUrls.includes(url)) {
                        toast.error("This URL is already added");
                        return;
                      }
                      const updatedUrls = [...webhookUrls, url];
                      updateSettings({ webhookUrls: updatedUrls });
                      setNewWebhookUrl("");
                      toast.success("Webhook URL added");
                    } catch {
                      toast.error("Please enter a valid URL");
                    }
                  }
                }}
                size="sm"
                disabled={isPending || !newWebhookUrl.trim()}
              >
                Add URL
              </Button>
            </div>
            {webhookUrls.length > 0 && (
              <div className="space-y-2">
                {webhookUrls.map((url: string) => (
                  <div
                    key={url}
                    className="flex items-center gap-2 rounded-lg border border-border p-2"
                  >
                    <code className="flex-1 break-all text-sm font-mono">
                      {url}
                    </code>
                    <Button
                      onClick={() => {
                        const updatedUrls = webhookUrls.filter(
                          (u: string) => u !== url,
                        );
                        updateSettings({ webhookUrls: updatedUrls });
                        toast.success("Webhook URL removed");
                      }}
                      size="sm"
                      variant="ghost"
                      className="h-8 w-8 shrink-0 p-0"
                      disabled={isPending}
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  </div>
                ))}
              </div>
            )}
            {webhookUrls.length === 0 && (
              <p className="py-2 text-sm text-muted-foreground">
                No webhook URLs configured. Add a URL above to get started.
              </p>
            )}
          </div>
        </Panel>

        <Panel
          title="Developer mode"
          description="Enable additional developer tools and debugging options."
        >
          <div className="flex items-center justify-between py-1">
            <Label htmlFor={devModeId} className="cursor-pointer font-medium">
              Enable developer mode
            </Label>
            <Switch
              id={devModeId}
              checked={session?.settings?.isDevMode ?? false}
              disabled={isPending}
              onCheckedChange={() => {
                updateSettings({
                  isDevMode: !(session?.settings?.isDevMode ?? false),
                });
              }}
            />
          </div>
        </Panel>

        <Panel
          title="Privacy mode"
          description="Hide sensitive information and transaction details from view."
        >
          <div className="flex items-center justify-between py-1">
            <Label
              htmlFor={privacyModeId}
              className="cursor-pointer font-medium"
            >
              Enable privacy mode
            </Label>
            <Switch
              id={privacyModeId}
              checked={session?.settings?.isPrivacyMode ?? false}
              disabled={isPending}
              onCheckedChange={() => {
                updateSettings({
                  isPrivacyMode: !(session?.settings?.isPrivacyMode ?? false),
                });
              }}
            />
          </div>
        </Panel>

        <BuildIdentifier className="px-1" />
      </div>
    </div>
  );
}
