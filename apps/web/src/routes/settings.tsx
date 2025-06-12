import {
	Card,
	CardContent,
	CardDescription,
	CardHeader,
	CardTitle,
} from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { ensureSession, useSession } from "@/lib/auth-client";
import { orpc, queryClient } from "@/utils/orpc";
import { useMutation } from "@tanstack/react-query";
import { createFileRoute } from "@tanstack/react-router";
import { toast } from "sonner";

export const Route = createFileRoute("/settings")({
	component: RouteComponent,
	beforeLoad: async ({ context }) => {
		ensureSession(context.isAuthenticated, "/settings");
		await context.queryClient.ensureQueryData(
			orpc.settings.getUserSettings.queryOptions(),
		);
	},
});

function RouteComponent() {
	const { data: session } = useSession();

	const { mutate: updateSettings, isPending } = useMutation(
		orpc.settings.updateSettings.mutationOptions({
			onMutate: async (newSettings) => {
				// Cancel any outgoing refetches
				await queryClient.cancelQueries({
					queryKey: orpc.settings.getUserSettings.queryOptions().queryKey,
				});

				// Snapshot the previous value
				const previousSettings = queryClient.getQueryData(
					orpc.settings.getUserSettings.queryOptions().queryKey,
				);

				// Optimistically update to the new value
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

				// Also update session data optimistically
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

				// Return a context object with the snapshotted value
				return { previousSettings };
			},
			onError: (err, newSettings, context) => {
				// If the mutation fails, use the context returned from onMutate to roll back
				if (context?.previousSettings) {
					queryClient.setQueryData(
						orpc.settings.getUserSettings.queryOptions().queryKey,
						context.previousSettings,
					);
				}

				// Also revert session data
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

	return (
		<div className="container mx-auto py-10">
			<h1 className="text-2xl font-bold mb-6">Settings</h1>

			<div className="grid gap-6">
				<Card>
					<CardHeader>
						<CardTitle>Developer Mode</CardTitle>
						<CardDescription>
							Enable additional developer tools and features. This includes
							advanced debugging options, detailed logging, and experimental
							features that may not be fully tested.
						</CardDescription>
					</CardHeader>
					<CardContent>
						<div className="flex items-center space-x-2">
							<Switch
								id="dev-mode"
								checked={session?.settings?.isDevMode ?? false}
								disabled={isPending}
								onCheckedChange={() => {
									updateSettings({
										isDevMode: !(session?.settings?.isDevMode ?? false),
										isPrivacyMode: session?.settings?.isPrivacyMode ?? false,
									});
								}}
							/>
							<Label htmlFor="dev-mode">Enable developer mode</Label>
						</div>
					</CardContent>
				</Card>

				<Card>
					<CardHeader>
						<CardTitle>Privacy Mode</CardTitle>
						<CardDescription>
							Hide sensitive information and transaction details from your view.
							When enabled, personal and financial data will be masked, and
							detailed transaction information will be hidden to protect your
							privacy.
						</CardDescription>
					</CardHeader>
					<CardContent>
						<div className="flex items-center space-x-2">
							<Switch
								id="privacy-mode"
								checked={session?.settings?.isPrivacyMode ?? false}
								disabled={isPending}
								onCheckedChange={() => {
									updateSettings({
										isPrivacyMode: !(session?.settings?.isPrivacyMode ?? false),
										isDevMode: session?.settings?.isDevMode ?? false,
									});
								}}
							/>
							<Label htmlFor="privacy-mode">Enable privacy mode</Label>
						</div>
					</CardContent>
				</Card>
			</div>
		</div>
	);
}
