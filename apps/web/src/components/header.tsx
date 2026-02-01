import { useQuery } from "@tanstack/react-query";
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
import { SidebarTrigger } from "@/components/ui/sidebar";
import { Skeleton } from "@/components/ui/skeleton";
import { TooltipProvider } from "@/components/ui/tooltip";
import { signOut, useSession } from "@/lib/auth-client";
import { orpc, queryClient } from "@/utils/orpc";
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
  const { data: settingsData } = useQuery(
    orpc.settings.getUserSettings.queryOptions(),
  );
  const location = useLocation();
  const navigate = useNavigate();
  const hasWebhooksConfigured =
    (settingsData?.settings?.webhookUrls?.length ?? 0) > 0;

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
              {hasWebhooksConfigured && <WebhookButton />}
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
          {session?.user && hasWebhooksConfigured && <WebhookButton />}
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
      <nav className="border-b bg-background/80 backdrop-blur-sm supports-backdrop-filter:bg-background/70">
        <div className="flex items-center gap-4 px-4 py-2.5 lg:px-8">
          <div className="flex items-center min-w-0">
            {session?.user && <SidebarTrigger className="mr-2 lg:hidden" />}
            <Link to="/" className="flex items-center min-w-0">
              <img
                src="/favicon.ico"
                alt="Tallyo logo"
                className="h-8 w-8 rounded-lg mr-3 shrink-0"
              />
              <span className="font-semibold tracking-tight text-sm sm:text-base truncate">
                Tallyo
              </span>
            </Link>
          </div>
          {session?.user && (
            <div className="hidden lg:flex lg:items-center lg:space-x-4 ml-6">
              {links.map((link) => (
                <Link
                  key={link.to}
                  to={link.to}
                  className={`relative flex items-center space-x-1.5 px-2.5 py-1.5 rounded-md text-xs font-medium tracking-wide uppercase transition-colors ${
                    location.pathname === link.to
                      ? "text-foreground"
                      : "text-muted-foreground hover:text-foreground"
                  }`}
                >
                  <link.icon className="h-4 w-4" />
                  <span className="truncate">{link.label}</span>
                  {location.pathname === link.to && (
                    <span className="pointer-events-none absolute inset-x-2 -bottom-1 h-0.5 rounded-full bg-accent" />
                  )}
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
