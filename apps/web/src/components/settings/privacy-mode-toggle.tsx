import { useMutation } from "@tanstack/react-query";
import { Eye, EyeOff } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
	Tooltip,
	TooltipContent,
	TooltipTrigger,
} from "@/components/ui/tooltip";
import { useSession } from "@/lib/auth-client";
import { orpc, queryClient } from "@/utils/orpc";

export function PrivacyModeToggle() {
	const { data: session } = useSession();
	const isPrivacyMode = session?.settings?.isPrivacyMode ?? false;

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

				toast.error("Failed to update privacy mode", {
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

				const newPrivacyMode = data.settings.isPrivacyMode;
				toast.success(
					`Privacy mode ${newPrivacyMode ? "enabled" : "disabled"}`,
					{
						description: newPrivacyMode
							? "Sensitive information is now hidden"
							: "Sensitive information is now visible",
						duration: 3000,
					},
				);
			},
		}),
	);

	const handlePrivacyModeToggle = () => {
		updateSettings({
			isPrivacyMode: !isPrivacyMode,
			isDevMode: session?.settings?.isDevMode ?? false,
		});
	};

	return (
		<Tooltip>
			<TooltipTrigger asChild>
				<Button
					variant="outline"
					size="icon"
					onClick={handlePrivacyModeToggle}
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
