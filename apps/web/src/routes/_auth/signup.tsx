import { zodResolver } from "@hookform/resolvers/zod";
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
import { queryClient } from "@/utils/orpc";

const signInSchema = z
	.object({
		name: z.string().min(1, "Name is required"),
		email: z.string().email("Please enter a valid email address"),
		password: z.string().min(8, "Password must be at least 8 characters"),
		confirmPassword: z.string().min(1, "Please confirm your password"),
	})
	.refine((data) => data.password === data.confirmPassword, {
		message: "Passwords don't match",
		path: ["confirmPassword"],
	});

type SignInFormData = z.infer<typeof signInSchema>;

export const Route = createFileRoute("/_auth/signup")({
	component: RouteComponent,
	beforeLoad: async ({ context }) => {
		if (context.isAuthenticated) {
			redirect({ to: "/" });
		}
	},
	validateSearch: z.object({
		from: z.string().optional(),
	}),
});

function RouteComponent() {
	const [showPassword, setShowPassword] = useState(false);

	const nameId = useId();
	const emailId = useId();

	const _usernameId = useId();
	const passwordId = useId();
	const passwordConfirmId = useId();

	const {
		register,
		handleSubmit,
		formState: { errors, isSubmitting },
	} = useForm<SignInFormData>({
		resolver: zodResolver(signInSchema),
	});

	const { from } = Route.useSearch();

	const navigate = useNavigate();

	function onSubmit(data: SignInFormData) {
		authClient.signUp.email(
			{
				name: data.name,
				email: data.email,
				password: data.password,
			},
			{
				onSuccess: () => {
					queryClient.invalidateQueries({ queryKey: ["session"] });
					toast.success("Account created successfully. Redirecting...");
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
						<h1 className="text-3xl font-bold tracking-tight">
							Create an account
						</h1>
						<p className="text-muted-foreground">
							Sign up to get started with Tallyo
						</p>
					</div>

					{/* Sign In Form */}
					<form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
						<div className="space-y-4">
							<div className="space-y-2">
								<Label htmlFor={nameId}>Name</Label>
								<Input
									id={nameId}
									type="text"
									placeholder="Enter your name"
									className="pl-10"
									{...register("name")}
								/>
							</div>

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

							<div className="space-y-2">
								<Label htmlFor="confirmPassword">Confirm Password</Label>
								<div className="relative">
									<Lock className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
									<Input
										id={passwordConfirmId}
										type={showPassword ? "text" : "password"}
										placeholder="Confirm your password"
										className="pl-10 pr-10"
										{...register("confirmPassword")}
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
								{errors.confirmPassword && (
									<p className="text-sm text-destructive">
										{errors.confirmPassword.message}
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
							{isSubmitting ? "Signing in..." : "Sign up"}
							<ArrowRight className="ml-2 h-4 w-4" />
						</Button>
					</form>

					{/* Sign Up Link */}
					<div className="text-center">
						<p className="text-sm text-muted-foreground">
							{"Already have an account? "}
							<Link to="/signin" className="underline">
								Sign in
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
