import SignInForm from "@/components/sign-in-form";
import SignUpForm from "@/components/sign-up-form";
import { createFileRoute, redirect } from "@tanstack/react-router";
import { useState } from "react";

export const Route = createFileRoute("/login")({
	component: RouteComponent,
	beforeLoad: async ({ context }) => {
		if (context.isAuthenticated) {
			throw redirect({ to: "/" });
		}
	},
});

function RouteComponent() {
	const [showSignIn, setShowSignIn] = useState(true);

	return showSignIn ? (
		<SignInForm onSwitchToSignUp={() => setShowSignIn(false)} />
	) : (
		<SignUpForm onSwitchToSignIn={() => setShowSignIn(true)} />
	);
}
