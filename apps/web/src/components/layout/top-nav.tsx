import { Link, useLocation, useNavigate } from "@tanstack/react-router";
import {
  BarChart3Icon,
  BlocksIcon,
  CreditCardIcon,
  FolderTreeIcon,
  LogOut,
  RefreshCw,
  Settings,
  StoreIcon,
} from "lucide-react";
import { toast } from "sonner";
import { ModeToggle } from "@/components/mode-toggle";
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

export function TopNav() {
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
    <nav className="fixed top-0 left-0 right-0 h-16 border-b border-border bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 z-50">
      <div className="max-w-screen-2xl mx-auto h-full px-4 lg:px-8 flex items-center justify-between">
        {/* Logo */}
        <Link to="/" className="flex items-center gap-3">
          <span className="font-mono font-bold text-xl tracking-tight">
            TALLYO
          </span>
        </Link>

        {/* Primary Navigation - Desktop */}
        <div className="hidden lg:flex items-center gap-1">
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
                  "flex items-center gap-2 px-4 py-2 text-sm font-medium transition-colors",
                  isActive
                    ? "text-accent bg-accent/10"
                    : "text-muted-foreground hover:text-foreground hover:bg-secondary",
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
            className="p-2 text-muted-foreground hover:text-foreground hover:bg-secondary transition-colors"
            title="Trigger Webhooks"
          >
            <RefreshCw className="w-5 h-5" />
          </button>

          <ModeToggle />

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button
                type="button"
                className="p-2 text-muted-foreground hover:text-foreground hover:bg-secondary transition-colors"
              >
                <Settings className="w-5 h-5" />
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
