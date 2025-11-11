import { Link, useLocation, useNavigate } from "@tanstack/react-router";
import {
  BarChart3Icon,
  BlocksIcon,
  CreditCardIcon,
  FolderTreeIcon,
  LogOut,
  Settings,
  StoreIcon,
} from "lucide-react";
import { DelayedLoading } from "@/components/delayed-loading";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Skeleton } from "@/components/ui/skeleton";
import { TooltipProvider } from "@/components/ui/tooltip";
import { signOut, useSession } from "@/lib/auth-client";
import { queryClient } from "@/utils/orpc";
import { ModeToggle } from "./mode-toggle";
import { DeveloperModeToggle } from "./settings/developer-mode-toggle";
import { PrivacyModeToggle } from "./settings/privacy-mode-toggle";
import { WebhookButton } from "./webhook-button";

const loadingContent = (
  <>
    <div className="hidden lg:flex lg:items-center lg:space-x-6">
      <div className="flex space-x-2">
        <ModeToggle />
        <DeveloperModeToggle />
        <PrivacyModeToggle />
        <Skeleton className="h-8 w-8 rounded-full" />
      </div>
    </div>
    <div className="flex space-x-2 lg:hidden">
      <ModeToggle />
      <DeveloperModeToggle />
      <PrivacyModeToggle />
      <Skeleton className="h-8 w-8 rounded-full" />
    </div>
  </>
);

export default function Header() {
  const { data: session, isPending } = useSession();
  const location = useLocation();
  const navigate = useNavigate();

  const hasUnreviewedTransactions =
    (session?.meta?.unreviewedTransactionCount ?? 0) > 0;
  const unreviewedTransactionCount =
    session?.meta?.unreviewedTransactionCount ?? 0;

  const links = [
    { to: "/dashboard", label: "Dashboard", icon: BlocksIcon },
    { to: "/merchants", label: "Merchants", icon: StoreIcon },
    { to: "/categories", label: "Categories", icon: FolderTreeIcon },
    {
      to: hasUnreviewedTransactions
        ? "/transactions?onlyUnreviewed=true"
        : "/transactions",
      label: `Transactions${
        hasUnreviewedTransactions ? ` (${unreviewedTransactionCount})` : ""
      }`,
      icon: CreditCardIcon,
    },
    { to: "/reports", label: "Reports", icon: BarChart3Icon },
  ];

  const renderAuthContent = () => {
    const content = (
      <div className="flex items-center">
        <div className="hidden lg:flex lg:items-center lg:space-x-6">
          {session?.user ? (
            <div className="flex items-center space-x-2">
              <WebhookButton />
              <ModeToggle />
              <DeveloperModeToggle />
              <PrivacyModeToggle />
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button
                    variant="ghost"
                    className="relative h-8 w-8 rounded-full"
                  >
                    <Avatar className="h-8 w-8">
                      {session?.user?.image ? (
                        <img
                          alt={session.user.name ?? ""}
                          src={session.user.image}
                        />
                      ) : (
                        <AvatarFallback>
                          {session?.user?.name?.substring(0, 1).toUpperCase() ??
                            ""}
                        </AvatarFallback>
                      )}
                    </Avatar>
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent className="w-56" align="end" forceMount>
                  <DropdownMenuItem asChild>
                    <Link to="/settings" className="flex items-center gap-2">
                      <Settings className="h-4 w-4" />
                      <span>Settings</span>
                    </Link>
                  </DropdownMenuItem>
                  <DropdownMenuItem
                    onClick={async () => {
                      await signOut();
                      queryClient.invalidateQueries({
                        queryKey: ["session"],
                      });
                      setTimeout(() => {
                        navigate({ to: "/" });
                      }, 500);
                    }}
                    className="flex items-center gap-2"
                  >
                    <LogOut className="h-4 w-4" />
                    <span>Log out</span>
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
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
          <div className="flex items-center">
            <Link to="/" className="flex items-center">
              <img
                src="/favicon.ico"
                alt="Tallyo logo"
                className="h-8 w-8 rounded-lg mr-4"
              />
              <span className="font-semibold">Tallyo</span>
            </Link>
          </div>
          {session?.user && (
            <div className="hidden lg:flex lg:items-center lg:space-x-6 ml-8">
              {links.map((link) => (
                <Link
                  key={link.to}
                  to={link.to}
                  className={`flex items-center space-x-2 px-3 py-2 rounded-md text-sm font-medium transition-colors ${
                    location.pathname === link.to
                      ? "bg-accent text-accent-foreground"
                      : "text-muted-foreground hover:text-foreground hover:bg-accent"
                  }`}
                >
                  <link.icon className="h-4 w-4" />
                  <span>{link.label}</span>
                </Link>
              ))}
            </div>
          )}
          <div className="ml-auto">{renderAuthContent()}</div>
        </div>
      </nav>
    </TooltipProvider>
  );
}
