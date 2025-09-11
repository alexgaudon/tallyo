import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation } from "@tanstack/react-query";
import {
	createFileRoute,
	Link,
	redirect,
	useNavigate,
} from "@tanstack/react-router";
import { ArrowRight, Eye, EyeOff, Lock, Mail } from "lucide-react";
import { useId, useState } from "react";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { authClient } from "@/lib/auth-client";
import { orpc, queryClient } from "@/utils/orpc";

const signInSchema = z.object({
	email: z.string().email("Please enter a valid email address"),
	password: z.string().min(1, "Password is required"),
});

type SignInFormData = z.infer<typeof signInSchema>;

export const Route = createFileRoute("/_auth/signin")({
	component: RouteComponent,
	beforeLoad: async ({ context, search }) => {
		if (search.scope !== "token") {
			if (context.isAuthenticated) {
				redirect({ to: "/" });
			}
		}
	},
	validateSearch: z.object({
		from: z.string().optional(),
		scope: z.string().optional(),
	}),
});

function RouteComponent() {
	const [showPassword, setShowPassword] = useState(false);

	const emailId = useId();
	const passwordId = useId();

	const {
		register,
		handleSubmit,
		formState: { errors, isSubmitting },
	} = useForm<SignInFormData>({
		resolver: zodResolver(signInSchema),
	});

	const { mutateAsync: createCategory } = useMutation(
		orpc.categories.createCategory.mutationOptions(),
	);

	const { from } = Route.useSearch();

	const navigate = useNavigate();

	function onSubmit(data: SignInFormData) {
		authClient.signIn.email(
			{
				email: data.email,
				password: data.password,
			},
			{
				onSuccess: (_ctx) => {
					queryClient.invalidateQueries({ queryKey: ["session"] });

					setTimeout(() => {
						navigate({
							to: from ?? "/",
						});
					}, 500);
				},
				onError: (error) => {
					toast.error(error.error.message);
				},
			},
		);
	}

	return (
		<div className="min-h-screen flex">
			{/* Left Side - Sign In Form */}
			<div className="flex-1 flex items-center justify-center p-8 bg-background">
				<div className="w-full max-w-md space-y-8">
					{/* Header */}
					<div className="text-center space-y-2">
						<h1 className="text-3xl font-bold tracking-tight">Welcome back</h1>
						<p className="text-muted-foreground">
							Sign in to your account to continue
						</p>
					</div>

					<div className="flex flex-col gap-2">
						<Button
							className="cursor-pointer"
							variant="outline"
							type="button"
							onClick={async () => {
								await authClient.signIn.social({
									provider: "discord",
									callbackURL: from ?? "/",
								});
								createCategory({
									name: "Transfer",
									hideFromInsights: true,
								});
							}}
						>
							<svg
								xmlns="http://www.w3.org/2000/svg"
								viewBox="0 0 127.14 96.36"
								aria-label="Discord"
								role="img"
							>
								<path
									fill="#5865f2"
									d="M107.7,8.07A105.15,105.15,0,0,0,81.47,0a72.06,72.06,0,0,0-3.36,6.83A97.68,97.68,0,0,0,49,6.83,72.37,72.37,0,0,0,45.64,0,105.89,105.89,0,0,0,19.39,8.09C2.79,32.65-1.71,56.6.54,80.21h0A105.73,105.73,0,0,0,32.71,96.36,77.7,77.7,0,0,0,39.6,85.25a68.42,68.42,0,0,1-10.85-5.18c.91-.66,1.8-1.34,2.66-2a75.57,75.57,0,0,0,64.32,0c.87.71,1.76,1.39,2.66,2a68.68,68.68,0,0,1-10.87,5.19,77,77,0,0,0,6.89,11.1A105.25,105.25,0,0,0,126.6,80.22h0C129.24,52.84,122.09,29.11,107.7,8.07ZM42.45,65.69C36.18,65.69,31,60,31,53s5-12.74,11.43-12.74S54,46,53.89,53,48.84,65.69,42.45,65.69Zm42.24,0C78.41,65.69,73.25,60,73.25,53s5-12.74,11.44-12.74S96.23,46,96.12,53,91.08,65.69,84.69,65.69Z"
								/>
							</svg>
							Discord
						</Button>
					</div>

					<div className="relative">
						<div className="absolute inset-0 flex items-center">
							<span className="w-full border-t" />
						</div>
						<div className="relative flex justify-center text-xs uppercase">
							<span className="bg-background px-2 text-muted-foreground">
								or
							</span>
						</div>
					</div>

					{/* Sign In Form */}
					<form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
						<div className="space-y-4">
							<div className="space-y-2">
								<Label htmlFor="email">Email address</Label>
								<div className="relative">
									<Mail className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
									<Input
										id={emailId}
										type="email"
										placeholder="Enter your email"
										className="pl-10"
										{...register("email")}
									/>
								</div>
								{errors.email && (
									<p className="text-sm text-destructive">
										{errors.email.message}
									</p>
								)}
							</div>

							<div className="space-y-2">
								<Label htmlFor="password">Password</Label>
								<div className="relative">
									<Lock className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
									<Input
										id={passwordId}
										type={showPassword ? "text" : "password"}
										placeholder="Enter your password"
										className="pl-10 pr-10"
										{...register("password")}
									/>
									<Button
										type="button"
										variant="ghost"
										size="sm"
										className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent"
										onClick={() => setShowPassword(!showPassword)}
									>
										{showPassword ? (
											<EyeOff className="h-4 w-4 text-muted-foreground" />
										) : (
											<Eye className="h-4 w-4 text-muted-foreground" />
										)}
									</Button>
								</div>
								{errors.password && (
									<p className="text-sm text-destructive">
										{errors.password.message}
									</p>
								)}
							</div>
						</div>

						<div className="flex items-center justify-between float-right">
							<Button
								variant="link"
								className="px-0 font-normal"
								onClick={() => {
									alert("TODO, Coming Soon™");
								}}
							>
								Forgot password?
							</Button>
						</div>

						<Button type="submit" className="w-full" disabled={isSubmitting}>
							{isSubmitting ? "Signing in..." : "Sign in"}
							<ArrowRight className="ml-2 h-4 w-4" />
						</Button>
					</form>

					{/* Sign Up Link */}
					<div className="text-center">
						<p className="text-sm text-muted-foreground">
							{"Don't have an account? "}
							<Link to="/signup" className="underline">
								Sign up
							</Link>
						</p>
					</div>
				</div>
			</div>

			{/* Right Side - Visual Content */}
			<div className="hidden lg:flex flex-1 bg-gradient-to-br from-accent to-secondary relative overflow-hidden">
				<div className="absolute inset-0 bg-black/20" />
				<div className="relative z-10 flex flex-col justify-center items-center text-white p-12 text-center">
					<div className="space-y-8 max-w-lg">
						{/* Hero Section */}
						<div className="space-y-4">
							<div className="w-16 h-16 bg-white/20 rounded-full flex items-center justify-center backdrop-blur-sm mx-auto">
								<img
									src="/favicon.ico"
									alt="Tallyo"
									className="w-16 h-16 rounded-full"
								/>
							</div>
							<h2 className="text-4xl font-bold">
								Measure. Understand. Improve.
							</h2>
							<p className="text-lg text-white/90 leading-relaxed">
								Tallyo helps you gain insights into your personal finances so
								you can make better financial decisions.
							</p>
						</div>

						{/* Features Section */}
						<div className="space-y-6">
							<h3 className="text-2xl font-semibold">Features</h3>
							<div className="grid grid-cols-2 gap-4 text-left">
								<div className="space-y-2">
									<h4 className="font-semibold text-white">
										Transaction Logging
									</h4>
									<p className="text-sm text-white/80">
										Easily upload transactions from any financial provider via
										API.
									</p>
								</div>
								<div className="space-y-2">
									<h4 className="font-semibold text-white">Categorization</h4>
									<p className="text-sm text-white/80">
										Automatically categorize transactions for streamlined
										analysis.
									</p>
								</div>
								<div className="space-y-2">
									<h4 className="font-semibold text-white">
										Vendor Normalization
									</h4>
									<p className="text-sm text-white/80">
										Normalizes vendors to a single entity for better analysis.
									</p>
								</div>
								<div className="space-y-2">
									<h4 className="font-semibold text-white">
										Insights & Charts
									</h4>
									<p className="text-sm text-white/80">
										Visualize your finances with intuitive charts and key stats.
									</p>
								</div>
							</div>
						</div>
					</div>
				</div>
			</div>
		</div>
	);
}
