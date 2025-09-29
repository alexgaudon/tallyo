import { Link } from "@tanstack/react-router";
import { DelayedLoading } from "@/components/delayed-loading";
import { Button } from "@/components/ui/button";

import { SidebarTrigger } from "@/components/ui/sidebar";
import { Skeleton } from "@/components/ui/skeleton";
import { TooltipProvider } from "@/components/ui/tooltip";
import { useSession } from "@/lib/auth-client";
import { ModeToggle } from "./mode-toggle";
import { DeveloperModeToggle } from "./settings/developer-mode-toggle";
import { PrivacyModeToggle } from "./settings/privacy-mode-toggle";

const loadingContent = (
	<>
		<div className="hidden lg:flex lg:items-center lg:space-x-6">
			<div className="flex space-x-2">
				<ModeToggle />
				<DeveloperModeToggle />
				<PrivacyModeToggle />
				<Skeleton className="h-8 w-[120px]" />
			</div>
		</div>
		<div className="flex space-x-2 lg:hidden">
			<ModeToggle />
			<DeveloperModeToggle />
			<PrivacyModeToggle />
			<Skeleton className="h-8 w-8" />
		</div>
	</>
);

export default function Header() {
	const { data: session, isPending } = useSession();

	const renderAuthContent = () => {
		const content = (
			<div className="flex items-center">
				<div className="hidden lg:flex lg:items-center lg:space-x-6">
					{session?.data ? (
						<div className="flex items-center space-x-2">
							<ModeToggle />
							<DeveloperModeToggle />
							<PrivacyModeToggle />
						</div>
					) : (
						<>
							<ModeToggle />
							<DeveloperModeToggle />
							<PrivacyModeToggle />
							<Button asChild className="w-fit" size="lg" type="button">
								<Link to="/signin">Sign in</Link>
							</Button>
						</>
					)}
				</div>
				<div className="flex space-x-2 lg:hidden">
					<ModeToggle />
					<DeveloperModeToggle />
					<PrivacyModeToggle />
				</div>
			</div>
		);

		return (
			<DelayedLoading isLoading={isPending}>
				{isPending ? loadingContent : content}
			</DelayedLoading>
		);
	};

	return (
		<TooltipProvider>
			<nav className="border-b">
				<div className="flex items-center px-4 py-3 lg:px-8">
					{session?.data && (
						<div className="flex items-center">
							<SidebarTrigger className="-ml-1" />
						</div>
					)}
					<div className="flex-1 lg:hidden">
						<Link
							to="/"
							className={`flex items-center ${session?.data ? "ml-4" : ""}`}
						>
							<img
								src="/favicon.ico"
								alt="Tallyo logo"
								className="h-8 w-8 rounded-lg"
							/>
						</Link>
					</div>
					<div className="ml-auto">{renderAuthContent()}</div>
				</div>
			</nav>
		</TooltipProvider>
	);
}
