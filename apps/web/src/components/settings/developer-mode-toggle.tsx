import { useMutation } from "@tanstack/react-query";
import { Code, Code2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { useSession } from "@/lib/auth-client";
import { orpc, queryClient } from "@/utils/orpc";

export function DeveloperModeToggle() {
	const { data: session } = useSession();
	const isDevMode = session?.settings?.isDevMode ?? false;

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

				toast.error("Failed to update developer mode", {
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

				const newDevMode = data.settings.isDevMode;
				toast.success(`Developer mode ${newDevMode ? "enabled" : "disabled"}`, {
					description: newDevMode
						? "Developer tools are now visible"
						: "Developer tools are now hidden",
					duration: 3000,
				});
			},
		}),
	);

	const handleDeveloperModeToggle = () => {
		updateSettings({
			isDevMode: !isDevMode,
			isPrivacyMode: session?.settings?.isPrivacyMode ?? false,
		});
	};

	return (
		<Button
			variant="outline"
			size="icon"
			onClick={handleDeveloperModeToggle}
			disabled={isPending}
			title={isDevMode ? "Disable developer mode" : "Enable developer mode"}
		>
			{isDevMode ? <Code className="h-4 w-4" /> : <Code2 className="h-4 w-4" />}
			<span className="sr-only">
				{isDevMode ? "Disable developer mode" : "Enable developer mode"}
			</span>
		</Button>
	);
}
