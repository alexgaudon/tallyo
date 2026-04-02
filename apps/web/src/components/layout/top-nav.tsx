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
    <nav className="fixed top-0 left-0 right-0 border-b border-border/60 bg-card/80 backdrop-blur-xl z-50 h-14 shrink-0 shadow-soft">
      <div className="max-w-screen-2xl mx-auto h-full px-4 lg:px-8 flex items-center justify-between">
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
          <Link to="/" className="flex items-center gap-2.5">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary text-primary-foreground shadow-soft">
              <BlocksIcon className="h-4 w-4" />
            </div>
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
                  "flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-lg transition-all duration-200",
                  isActive
                    ? "text-primary bg-primary/10"
                    : "text-muted-foreground hover:text-foreground hover:bg-secondary",
                )}
              >
                <item.icon
                  className={cn("w-4 h-4", isActive && "text-primary")}
                />
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
            className="flex h-9 w-9 items-center justify-center rounded-lg text-muted-foreground hover:text-foreground hover:bg-secondary transition-all duration-200"
            title="Trigger Webhooks"
          >
            <RefreshCw className="w-4 h-4" />
          </button>

          <ModeToggle />

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button
                type="button"
                className="flex h-9 w-9 items-center justify-center rounded-lg text-muted-foreground hover:text-foreground hover:bg-secondary transition-all duration-200"
              >
                <Settings className="w-4 h-4" />
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-48">
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
                className="flex items-center gap-2 cursor-pointer"
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
