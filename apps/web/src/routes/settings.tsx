import { useMutation, useQuery } from "@tanstack/react-query";
import { createFileRoute } from "@tanstack/react-router";
import { X } from "lucide-react";
import { useId, useState } from "react";
import { toast } from "sonner";
import { z } from "zod";
import { ConfirmPassword } from "@/components/settings/confirm-password";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Section } from "@/components/ui/section";
import { Switch } from "@/components/ui/switch";
import { ensureSession, useSession } from "@/lib/auth-client";
import { orpc, queryClient } from "@/utils/orpc";

export const Route = createFileRoute("/settings")({
  component: RouteComponent,
  beforeLoad: async ({ context }) => {
    ensureSession(context.isAuthenticated, "/settings");
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

  const webhookUrls: string[] = settingsData?.settings?.webhookUrls ?? [];

  const { mutate: updateSettings, isPending } = useMutation(
    orpc.settings.updateSettings.mutationOptions({
      onMutate: async (newSettings) => {
        await queryClient.cancelQueries({
          queryKey: orpc.settings.getUserSettings.queryOptions().queryKey,
        });

        const previousSettings = queryClient.getQueryData(
          orpc.settings.getUserSettings.queryOptions().queryKey,
        );

        queryClient.setQueryData(
          orpc.settings.getUserSettings.queryOptions().queryKey,
          (
            old:
              | {
                  settings: {
                    isDevMode: boolean;
                    isPrivacyMode: boolean;
                    webhookUrls?: string[];
                  };
                }
              | undefined,
          ) => ({
            ...old,
            settings: newSettings,
          }),
        );

        queryClient.setQueryData(
          ["session"],
          (
            old:
              | {
                  settings: {
                    isDevMode: boolean;
                    isPrivacyMode: boolean;
                    webhookUrls?: string[];
                  };
                }
              | undefined,
          ) => ({
            ...old,
            settings: newSettings,
          }),
        );

        return { previousSettings };
      },
      onError: (err, newSettings, context) => {
        if (context?.previousSettings) {
          queryClient.setQueryData(
            orpc.settings.getUserSettings.queryOptions().queryKey,
            context.previousSettings,
          );
        }

        queryClient.setQueryData(
          ["session"],
          (
            old:
              | {
                  settings: {
                    isDevMode: boolean;
                    isPrivacyMode: boolean;
                    webhookUrls?: string[];
                  };
                }
              | undefined,
          ) => ({
            ...old,
            settings: session?.settings,
          }),
        );

        toast.error("Failed to update settings", {
          description:
            err instanceof Error
              ? `Error: ${err.message}`
              : "An unexpected error occurred. Please try again.",
          duration: 5000,
          action: {
            label: "Retry",
            onClick: () => {
              updateSettings(newSettings);
            },
          },
        });
      },
      onSuccess: (data) => {
        queryClient.invalidateQueries({
          queryKey: orpc.settings.getUserSettings.queryOptions().queryKey,
        });
        queryClient.invalidateQueries({
          queryKey: ["session"],
        });

        const changedSettings = [];
        const oldSettings = session?.settings;
        const newSettings = data.settings;

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
    }),
  );

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

      <header className="border-b border-border/50 bg-card/80 backdrop-blur-sm shadow-sm">
        <div className="max-w-2xl mx-auto px-4 py-5 lg:px-8">
          <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-0.5">
            Account
          </p>
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-foreground">
            Settings
          </h1>
        </div>
      </header>

      <div className="max-w-2xl mx-auto px-4 py-8 lg:px-8 space-y-8">
        <div className="space-y-8">
          {/* API Token */}
          <Section>
            <div className="mb-4">
              <h2 className="text-lg font-semibold">API Token</h2>
              <p className="text-sm text-muted-foreground mt-1">
                Your API token for programmatic access. Keep it secure and never
                share it publicly.
              </p>
            </div>
            <div className="rounded-xl border border-border/80 bg-card shadow-sm p-4">
              <div className="flex flex-col sm:flex-row gap-3 items-stretch sm:items-end mb-3">
                <div className="relative flex-1">
                  <Input
                    type={authToken ? "text" : "password"}
                    value={authToken || "•".repeat(79)}
                    readOnly
                    placeholder="No token generated"
                    className="pr-24 font-mono bg-background"
                  />
                  {authToken && (
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={async () => {
                        await navigator.clipboard.writeText(authToken);
                        toast.success("API token copied to clipboard");
                      }}
                      className="absolute right-2 top-1/2 -translate-y-1/2 h-8 text-xs"
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
                <code className="bg-muted px-1.5 font-mono text-xs">
                  Bearer YOUR_TOKEN_HERE
                </code>
              </p>
            </div>
          </Section>

          {/* Webhooks */}
          <Section>
            <div className="mb-4">
              <h2 className="text-lg font-semibold">
                Auto-Import Webhook URLs
              </h2>
              <p className="text-sm text-muted-foreground mt-1">
                Configure webhook URLs to receive notifications when new
                transactions are imported.
              </p>
            </div>
            <div className="rounded-xl border border-border/80 bg-card shadow-sm p-4">
              <div className="flex flex-col sm:flex-row gap-3 items-stretch sm:items-end mb-4">
                <div className="relative flex-1">
                  <Input
                    type="url"
                    value={newWebhookUrl}
                    onChange={(e) => setNewWebhookUrl(e.target.value)}
                    placeholder="https://example.com/webhook"
                    className="font-mono bg-background"
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
                            updateSettings({
                              isDevMode: session?.settings?.isDevMode ?? false,
                              isPrivacyMode:
                                session?.settings?.isPrivacyMode ?? false,
                              webhookUrls: updatedUrls,
                            });
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
                        updateSettings({
                          isDevMode: session?.settings?.isDevMode ?? false,
                          isPrivacyMode:
                            session?.settings?.isPrivacyMode ?? false,
                          webhookUrls: updatedUrls,
                        });
                        setNewWebhookUrl("");
                        toast.success("Webhook URL added");
                      } catch {
                        toast.error("Please enter a valid URL");
                      }
                    }
                  }}
                  size="sm"
                  disabled={isPending || !newWebhookUrl.trim()}
                  className="h-10 sm:h-10"
                >
                  Add URL
                </Button>
              </div>
              {webhookUrls.length > 0 && (
                <div className="space-y-2">
                  {webhookUrls.map((url: string) => (
                    <div
                      key={url}
                      className="flex items-center gap-2 p-2 rounded-lg border border-border"
                    >
                      <code className="flex-1 text-sm font-mono break-all">
                        {url}
                      </code>
                      <Button
                        onClick={() => {
                          const updatedUrls = webhookUrls.filter(
                            (u: string) => u !== url,
                          );
                          updateSettings({
                            isDevMode: session?.settings?.isDevMode ?? false,
                            isPrivacyMode:
                              session?.settings?.isPrivacyMode ?? false,
                            webhookUrls: updatedUrls,
                          });
                          toast.success("Webhook URL removed");
                        }}
                        size="sm"
                        variant="ghost"
                        className="h-8 w-8 p-0 shrink-0"
                        disabled={isPending}
                      >
                        <X className="h-4 w-4" />
                      </Button>
                    </div>
                  ))}
                </div>
              )}
              {webhookUrls.length === 0 && (
                <p className="text-sm text-muted-foreground text-center py-4">
                  No webhook URLs configured. Add a URL above to get started.
                </p>
              )}
            </div>
          </Section>

          {/* Developer Mode */}
          <Section>
            <div className="mb-4">
              <h2 className="text-lg font-semibold">Developer Mode</h2>
              <p className="text-sm text-muted-foreground mt-1">
                Enable additional developer tools and debugging options.
              </p>
            </div>
            <div className="rounded-xl border border-border/80 bg-card shadow-sm p-4">
              <div className="flex items-center justify-between py-1">
                <Label
                  htmlFor={devModeId}
                  className="font-medium cursor-pointer"
                >
                  Enable developer mode
                </Label>
                <Switch
                  id={devModeId}
                  checked={session?.settings?.isDevMode ?? false}
                  disabled={isPending}
                  onCheckedChange={() => {
                    updateSettings({
                      isDevMode: !(session?.settings?.isDevMode ?? false),
                      isPrivacyMode: session?.settings?.isPrivacyMode ?? false,
                      webhookUrls: webhookUrls,
                    });
                  }}
                />
              </div>
            </div>
          </Section>

          {/* Privacy Mode */}
          <Section>
            <div className="mb-4">
              <h2 className="text-lg font-semibold">Privacy Mode</h2>
              <p className="text-sm text-muted-foreground mt-1">
                Hide sensitive information and transaction details from view.
              </p>
            </div>
            <div className="rounded-xl border border-border/80 bg-card shadow-sm p-4">
              <div className="flex items-center justify-between py-1">
                <Label
                  htmlFor={privacyModeId}
                  className="font-medium cursor-pointer"
                >
                  Enable privacy mode
                </Label>
                <Switch
                  id={privacyModeId}
                  checked={session?.settings?.isPrivacyMode ?? false}
                  disabled={isPending}
                  onCheckedChange={() => {
                    updateSettings({
                      isPrivacyMode: !(
                        session?.settings?.isPrivacyMode ?? false
                      ),
                      isDevMode: session?.settings?.isDevMode ?? false,
                      webhookUrls: webhookUrls,
                    });
                  }}
                />
              </div>
            </div>
          </Section>
        </div>
      </div>
    </div>
  );
}
