import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { authClient, useSession } from "@/lib/auth-client";
import { useState } from "react";
import { toast } from "sonner";

export function ConfirmPassword({
	onConfirm,
	onCancel,
}: {
	onConfirm: (apiKey: string) => void;
	onCancel: () => void;
}) {
	const { data: session } = useSession();
	const email = session?.data?.user.email;
	const [password, setPassword] = useState("");
	const [isLoading, setIsLoading] = useState(false);

	const handleSubmit = async (e: React.FormEvent) => {
		e.preventDefault();
		if (!password.trim()) {
			toast.error("Please enter your password");
			return;
		}

		const res = await authClient.signIn.email(
			{
				email: email ?? "",
				password,
			},
			{
				onSuccess: (res) => {
					onConfirm(res.response.headers.get("set-auth-token") ?? "");
					setIsLoading(false);
				},
				onError: (error) => {
					toast.error(error.error.message);
				},
			},
		);

		if (res.error) {
			toast.error(res.error.message);
			return;
		}
	};

	return (
		<div className="space-y-6">
			<div className="text-center">
				<h2 className="text-xl font-semibold">Confirm Your Password</h2>
				<p className="text-sm text-muted-foreground mt-2">
					For security reasons, please re-enter your password to continue.
				</p>
			</div>

			<form onSubmit={handleSubmit} className="space-y-4">
				<div className="space-y-2">
					<Label htmlFor="password">Password</Label>
					<Input
						id="password"
						type="password"
						placeholder="Enter your password"
						value={password}
						onChange={(e) => setPassword(e.target.value)}
						disabled={isLoading}
						autoFocus
					/>
				</div>

				<div className="flex gap-3">
					<Button
						type="submit"
						className="flex-1"
						disabled={isLoading || !password.trim()}
					>
						{isLoading ? "Confirming..." : "Confirm Password"}
					</Button>
					<Button
						type="button"
						variant="destructive"
						onClick={() => {
							setPassword("");
							onCancel();
						}}
						disabled={isLoading}
					>
						Cancel
					</Button>
				</div>
			</form>
		</div>
	);
}
