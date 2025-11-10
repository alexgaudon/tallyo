import { useMutation } from "@tanstack/react-query";
import { createFileRoute } from "@tanstack/react-router";
import { useId, useState } from "react";
import { toast } from "sonner";
import { z } from "zod";
import { ConfirmPassword } from "@/components/settings/confirm-password";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
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
              | { settings: { isDevMode: boolean; isPrivacyMode: boolean } }
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
              | { settings: { isDevMode: boolean; isPrivacyMode: boolean } }
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
              | { settings: { isDevMode: boolean; isPrivacyMode: boolean } }
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
    <div className="container mx-auto max-w-2xl px-4 py-12 sm:py-16">
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

      <h1 className="text-3xl font-bold mb-8 tracking-tighter text-center sm:text-left">
        Settings
      </h1>

      <div className="grid gap-8">
        <Card className="border border-destructive/30 bg-destructive/5 shadow-none">
          <CardHeader className="pb-3">
            <CardTitle className="text-destructive text-lg">
              API Token
            </CardTitle>
            <CardDescription>
              Your API token for programmatic access to your transaction data.{" "}
              <strong className="text-foreground font-medium">
                Keep this token secure
              </strong>{" "}
              and never share it publicly. If compromised, you can regenerate it
              here.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex flex-col gap-3">
              <div className="flex flex-col sm:flex-row gap-3 items-stretch sm:items-end">
                <div className="relative flex-1">
                  <Input
                    type={authToken ? "text" : "password"}
                    value={authToken || "•".repeat(79)}
                    readOnly
                    placeholder="No token generated"
                    className="pr-24 font-mono bg-background/60 border-muted-foreground/30"
                  />
                  {authToken && (
                    <Button
                      size="sm"
                      variant="secondary"
                      onClick={async () => {
                        await navigator.clipboard.writeText(authToken);
                        toast.success("API token copied to clipboard");
                      }}
                      className="absolute right-2 top-1/2 -translate-y-1/2 px-3 h-8 text-xs font-medium"
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
                    className="px-4 h-8 text-xs font-medium"
                  >
                    Regenerate
                  </Button>
                  <Button
                    onClick={async () => {
                      try {
                        await orpc.settings.deleteAuthToken.call();
                        setAuthToken(null);
                        toast.success("API token deleted successfully");
                      } catch (_error) {
                        toast.error("Failed to delete API token");
                      }
                    }}
                    variant="outline"
                    size="sm"
                    className="px-4 h-8 text-xs font-medium border-destructive/40"
                  >
                    Delete
                  </Button>
                </div>
              </div>
              <p className="text-xs text-muted-foreground mt-1">
                Use this token in the Authorization header:{" "}
                <code className="bg-muted px-1.5 rounded text-foreground border font-mono">
                  Bearer YOUR_TOKEN_HERE
                </code>
              </p>
            </div>
          </CardContent>
        </Card>

        <Card className="shadow-none border bg-background/60">
          <CardHeader>
            <CardTitle className="text-base">Developer Mode</CardTitle>
            <CardDescription>
              Enable additional developer tools and features. This includes
              advanced debugging options, detailed logging, and experimental
              features that may not be fully tested.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-4 py-1.5">
              <Switch
                id={devModeId}
                checked={session?.settings?.isDevMode ?? false}
                disabled={isPending}
                onCheckedChange={() => {
                  updateSettings({
                    isDevMode: !(session?.settings?.isDevMode ?? false),
                    isPrivacyMode: session?.settings?.isPrivacyMode ?? false,
                  });
                }}
              />
              <Label htmlFor={devModeId} className="font-medium cursor-pointer">
                Enable developer mode
              </Label>
            </div>
          </CardContent>
        </Card>

        <Card className="shadow-none border bg-background/60">
          <CardHeader>
            <CardTitle className="text-base">Privacy Mode</CardTitle>
            <CardDescription>
              Hide sensitive information and transaction details from your view.
              When enabled, personal and financial data will be masked, and
              detailed transaction information will be hidden to protect your
              privacy.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-4 py-1.5">
              <Switch
                id={privacyModeId}
                checked={session?.settings?.isPrivacyMode ?? false}
                disabled={isPending}
                onCheckedChange={() => {
                  updateSettings({
                    isPrivacyMode: !(session?.settings?.isPrivacyMode ?? false),
                    isDevMode: session?.settings?.isDevMode ?? false,
                  });
                }}
              />
              <Label
                htmlFor={privacyModeId}
                className="font-medium cursor-pointer"
              >
                Enable privacy mode
              </Label>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
