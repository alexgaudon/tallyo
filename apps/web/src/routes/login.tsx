import SignInForm from "@/components/sign-in-form";
import SignUpForm from "@/components/sign-up-form";
import { createFileRoute, redirect, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import z from "zod";

export const Route = createFileRoute("/login")({
	component: RouteComponent,
	validateSearch: z.object({
		from: z.string().optional(),
	}),
	beforeLoad: async ({ context, search }) => {
		if (context.isAuthenticated) {
			throw redirect({ to: search.from ?? "/" });
		}
	},
});

function RouteComponent() {
	const [showSignIn, setShowSignIn] = useState(true);
	const search = Route.useSearch();
	const navigate = useNavigate();
	const context = Route.useRouteContext({
		select: (ctx) => ctx.isAuthenticated,
	});

	useEffect(() => {
		if (context) {
			navigate({
				to: search.from ?? "/",
			});
		}
	}, [context, search.from, navigate]);

	return showSignIn ? (
		<SignInForm
			onSwitchToSignUp={() => setShowSignIn(false)}
			from={search.from ?? "/"}
		/>
	) : (
		<SignUpForm
			onSwitchToSignIn={() => setShowSignIn(true)}
			from={search.from ?? "/"}
		/>
	);
}
