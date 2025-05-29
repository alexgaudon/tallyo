import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Link, useNavigate } from "@tanstack/react-router";
import { ChevronDown, Menu } from "lucide-react";
import * as React from "react";

import { DelayedLoading } from "@/components/delayed-loading";
import { Button } from "@/components/ui/button";
import {
	DropdownMenu,
	DropdownMenuContent,
	DropdownMenuItem,
	DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
	Sheet,
	SheetClose,
	SheetContent,
	SheetDescription,
	SheetTitle,
	SheetTrigger,
} from "@/components/ui/sheet";
import { Skeleton } from "@/components/ui/skeleton";
import { authClient, useSession } from "@/lib/auth-client";
import { queryClient } from "@/utils/orpc";
import { ModeToggle } from "./mode-toggle";

export default function Header() {
	const [isOpen, setIsOpen] = React.useState(false);
	const { data: session, isPending } = useSession();

	const renderAuthContent = () => {
		const loadingContent = (
			<>
				<div className="hidden lg:flex lg:items-center lg:space-x-6">
					<div className="flex space-x-2">
						<ModeToggle />
						<Skeleton className="h-8 w-[120px]" />
					</div>
				</div>
				<div className="flex space-x-2 lg:hidden">
					<ModeToggle />
					<Skeleton className="h-8 w-8" />
				</div>
			</>
		);

		const content = (
			<div>
				<div className="hidden lg:flex lg:items-center lg:space-x-6">
					{session?.data ? (
						<>
							<NavLinks />
							<div className="flex space-x-2">
								<ModeToggle />
								<UserDropdown session={session.data} />
							</div>
						</>
					) : (
						<>
							<ModeToggle />
							<Button asChild className="w-fit" size="lg" type="button">
								<Link to="/login">Sign in</Link>
							</Button>
						</>
					)}
				</div>
				<div className="flex space-x-2 lg:hidden">
					<ModeToggle />
					<Sheet onOpenChange={setIsOpen} open={isOpen}>
						<SheetTrigger asChild>
							<Button className="lg:hidden" size="icon" variant="ghost">
								<Menu className="h-6 w-6" />
								<span className="sr-only">Toggle menu</span>
							</Button>
						</SheetTrigger>
						<SheetContent side="right">
							<SheetTitle className="sr-only">Menu</SheetTitle>
							<SheetDescription className="sr-only">Menu</SheetDescription>
							<div className="mt-4 flex flex-col space-y-4 px-4">
								{session?.data ? (
									<>
										<div className="flex flex-col space-y-4">
											<NavLinks asChild />
										</div>
										<UserDropdown session={session.data} />
									</>
								) : (
									<>
										<SheetClose asChild>
											<Button
												asChild
												className="mx-auto w-fit"
												size="lg"
												type="button"
											>
												<Link to="/login">Sign in</Link>
											</Button>
										</SheetClose>
									</>
								)}
							</div>
						</SheetContent>
					</Sheet>
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
		<nav className="border-b">
			<div className="flex items-center justify-between px-4 py-3 lg:px-8">
				<div className="flex items-center">
					<Link to="/" className="flex items-center space-x-2">
						<img
							src="/favicon.ico"
							alt="Tallyo logo"
							className="h-8 w-8 rounded-lg"
						/>
						<span className="font-bold text-xl">Tallyo</span>
					</Link>
				</div>
				{renderAuthContent()}
			</div>
		</nav>
	);
}

function NavLinks({ asChild }: { asChild?: boolean }) {
	const links = [
		{ to: "/dashboard", label: "Dashboard" },
		{ to: "/categories", label: "Categories" },
	];

	const linkElements = links.map((link) => (
		<Link
			key={link.to}
			to={link.to}
			className="font-medium hover:text-gray-400 px-2 py-1.5 text-foreground text-sm"
		>
			{link.label}
		</Link>
	));

	if (asChild) {
		return linkElements.map((x) => (
			<SheetClose key={x.key} asChild>
				{x}
			</SheetClose>
		));
	}

	return linkElements;
}

function UserDropdown({
	session,
}: {
	session: {
		user: {
			id: string;
			name: string;
			email: string;
			emailVerified: boolean;
			createdAt: Date;
			updatedAt: Date;
			image?: string | null;
		};
		session: {
			id: string;
			createdAt: Date;
			expiresAt: Date;
			userId: string;
			userAgent?: string | null;
		};
	};
}) {
	const navigate = useNavigate();

	return (
		<DropdownMenu>
			<DropdownMenuTrigger asChild>
				<Button
					className="flex items-center space-x-1 font-medium text-sm"
					variant="ghost"
				>
					<Avatar className="h-5 w-5">
						{session?.user.image ? (
							<img alt={session.user.name ?? ""} src={session.user.image} />
						) : (
							<AvatarFallback>
								{session?.user.name?.substring(0, 1).toUpperCase() ?? ""}
							</AvatarFallback>
						)}
					</Avatar>
					<span>{session?.user.name ?? ""}</span>
					<ChevronDown className="h-4 w-4" />
				</Button>
			</DropdownMenuTrigger>
			<DropdownMenuContent align="end" className="w-56">
				<DropdownMenuItem
					onClick={() => {
						authClient.signOut({
							fetchOptions: {
								onSuccess: () => {
									queryClient.invalidateQueries({ queryKey: ["session"] });
									navigate({ to: "/" });
								},
							},
						});
					}}
				>
					<span>Log out</span>
				</DropdownMenuItem>
			</DropdownMenuContent>
		</DropdownMenu>
	);
}
