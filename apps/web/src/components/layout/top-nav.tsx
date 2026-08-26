import { Link, useLocation, useNavigate } from "@tanstack/react-router";
import {
  BarChart3Icon,
  BlocksIcon,
  CreditCardIcon,
  FolderTreeIcon,
  LogOut,
  Menu,
  RefreshCw,
  Settings,
  StoreIcon,
} from "lucide-react";
import { toast } from "sonner";
import { ModeToggle } from "@/components/mode-toggle";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { signOut, useSession } from "@/lib/auth-client";
import { cn } from "@/lib/utils";
import { orpc, queryClient } from "@/utils/orpc";

const navItems = [
  { to: "/dashboard", label: "Dashboard", icon: BlocksIcon },
  { to: "/transactions", label: "Transactions", icon: CreditCardIcon },
  { to: "/merchants", label: "Merchants", icon: StoreIcon },
  { to: "/categories", label: "Categories", icon: FolderTreeIcon },
  { to: "/reports", label: "Reports", icon: BarChart3Icon },
];

interface TopNavProps {
  onMenuClick?: () => void;
}

export function TopNav({ onMenuClick }: TopNavProps) {
  const location = useLocation();
  const navigate = useNavigate();
  const { data: session } = useSession();

  if (!session?.user) return null;

  const displayName = session.settings?.displayName || session.user.name;

  const handleTriggerWebhooks = async () => {
    try {
      const data = await orpc.meta.triggerWebhookRefresh.call();
      const successCount = data.results.filter((r) => r.success).length;
      const totalCount = data.results.length;
      toast.success("Webhooks triggered!", {
        description: `${successCount}/${totalCount} webhooks succeeded.`,
        duration: 3000,
      });
    } catch (error) {
      toast.error("Failed to trigger webhooks", {
        description:
          error instanceof Error ? error.message : "An unknown error occurred.",
        duration: 3000,
      });
    }
  };

  return (
    <nav className="fixed top-0 inset-x-0 z-50 px-3 pt-3 sm:px-4">
      <div className="max-w-screen-2xl mx-auto flex h-14 items-center justify-between rounded-2xl border border-border bg-background/70 px-3 backdrop-blur-xl shadow-soft lg:px-5">
        {/* Logo */}
        <div className="flex items-center gap-3">
          <Button
            variant="ghost"
            size="icon"
            className="lg:hidden h-9 w-9"
            onClick={onMenuClick}
          >
            <Menu className="h-5 w-5" />
          </Button>
          <Link to="/" className="flex items-center gap-2">
            <img
              src="/favicon.ico"
              alt="Tallyo"
              className="h-8 w-8 rounded-lg"
            />
            <span className="font-semibold text-lg tracking-tight text-foreground">
              Tallyo
            </span>
          </Link>
        </div>

        {/* Primary Navigation - Desktop */}
        <div className="hidden lg:flex items-center gap-0.5">
          {navItems.map((item) => {
            const isActive =
              location.pathname === item.to ||
              (item.to === "/transactions" &&
                location.pathname.startsWith("/transactions"));

            return (
              <Link
                key={item.to}
                to={item.to}
                className={cn(
                  "flex items-center gap-2 px-3.5 py-2 text-sm font-medium rounded-lg transition-colors",
                  isActive
                    ? "bg-secondary/60 text-accent"
                    : "text-foreground/80 hover:text-foreground hover:bg-secondary/50",
                )}
              >
                <item.icon className="w-4 h-4" />
                <span>{item.label}</span>
              </Link>
            );
          })}
        </div>

        {/* Right side actions */}
        <div className="flex items-center gap-1">
          <button
            type="button"
            onClick={handleTriggerWebhooks}
            className="flex h-9 w-9 items-center justify-center rounded-lg text-muted-foreground hover:text-foreground hover:bg-secondary transition-colors"
            title="Trigger Webhooks"
          >
            <RefreshCw className="w-4 h-4" />
          </button>

          <ModeToggle />

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button
                type="button"
                className="flex h-9 w-9 items-center justify-center rounded-full overflow-hidden ring-1 ring-border hover:ring-2 transition-all"
              >
                <Avatar className="h-8 w-8">
                  {session?.user?.image ? (
                    <img
                      alt={displayName ?? ""}
                      src={session.user.image}
                      className="h-full w-full object-cover"
                    />
                  ) : (
                    <AvatarFallback className="text-xs bg-secondary">
                      {displayName?.substring(0, 1).toUpperCase() ?? "U"}
                    </AvatarFallback>
                  )}
                </Avatar>
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-48">
              <div className="px-2 py-1.5 text-sm font-medium">
                {displayName ?? "User"}
              </div>
              <DropdownMenuItem asChild>
                <Link
                  to="/settings"
                  className="flex items-center gap-2 cursor-pointer"
                >
                  <Settings className="w-4 h-4" />
                  Settings
                </Link>
              </DropdownMenuItem>
              <DropdownMenuItem
                className="flex items-center gap-2 cursor-pointer text-destructive focus:text-destructive"
                onClick={async () => {
                  await signOut();
                  queryClient.invalidateQueries({ queryKey: ["session"] });
                  navigate({ to: "/" });
                }}
              >
                <LogOut className="w-4 h-4" />
                Log out
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>
    </nav>
  );
}
