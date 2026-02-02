import { Link, useLocation, useNavigate } from "@tanstack/react-router";
import {
  BarChart3Icon,
  BlocksIcon,
  CreditCardIcon,
  FolderTreeIcon,
  LogOut,
  Menu,
  Settings,
  StoreIcon,
} from "lucide-react";
import { useState } from "react";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import {
  Drawer,
  DrawerContent,
  DrawerHeader,
  DrawerTitle,
  DrawerTrigger,
} from "@/components/ui/drawer";
import { signOut, useSession } from "@/lib/auth-client";
import { cn } from "@/lib/utils";
import { queryClient } from "@/utils/orpc";

const navItems = [
  { to: "/dashboard", label: "Dashboard", icon: BlocksIcon },
  { to: "/transactions", label: "Transactions", icon: CreditCardIcon },
  { to: "/merchants", label: "Merchants", icon: StoreIcon },
  { to: "/categories", label: "Categories", icon: FolderTreeIcon },
  { to: "/reports", label: "Reports", icon: BarChart3Icon },
];

export function MobileNavDrawer() {
  const { data: session } = useSession();
  const location = useLocation();
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);

  if (!session?.user) return null;

  const handleNavigation = () => {
    setOpen(false);
  };

  return (
    <Drawer open={open} onOpenChange={setOpen}>
      <DrawerTrigger asChild>
        <Button variant="ghost" size="icon" className="lg:hidden">
          <Menu className="h-5 w-5" />
        </Button>
      </DrawerTrigger>
      <DrawerContent>
        <DrawerHeader className="border-b border-border pb-4">
          <div className="flex items-center justify-between">
            <DrawerTitle className="flex items-center gap-3">
              <div className="w-8 h-8 bg-accent flex items-center justify-center">
                <span className="text-accent-foreground font-mono font-bold text-sm">
                  T
                </span>
              </div>
              <span className="font-mono font-bold">TALLYO</span>
            </DrawerTitle>
          </div>
        </DrawerHeader>

        <nav className="p-4 space-y-1">
          {navItems.map((item) => {
            const isActive =
              location.pathname === item.to ||
              (item.to === "/transactions" &&
                location.pathname.startsWith("/transactions"));

            return (
              <Link
                key={item.to}
                to={item.to}
                onClick={handleNavigation}
                className={cn(
                  "flex items-center gap-3 px-4 py-3 text-sm font-medium transition-colors border border-transparent",
                  isActive
                    ? "bg-accent/10 text-accent border-accent/20"
                    : "text-muted-foreground hover:text-foreground hover:bg-secondary",
                )}
              >
                <item.icon className="w-5 h-5" />
                <span>{item.label}</span>
              </Link>
            );
          })}

          <div className="border-t border-border my-4" />

          <Link
            to="/settings"
            onClick={handleNavigation}
            className={cn(
              "flex items-center gap-3 px-4 py-3 text-sm font-medium transition-colors",
              location.pathname === "/settings"
                ? "text-accent"
                : "text-muted-foreground hover:text-foreground hover:bg-secondary",
            )}
          >
            <Settings className="w-5 h-5" />
            <span>Settings</span>
          </Link>

          <button
            type="button"
            onClick={async () => {
              await signOut();
              queryClient.invalidateQueries({ queryKey: ["session"] });
              setTimeout(() => {
                navigate({ to: "/" });
              }, 500);
            }}
            className="flex items-center gap-3 px-4 py-3 text-sm font-medium text-muted-foreground hover:text-foreground hover:bg-secondary w-full transition-colors"
          >
            <LogOut className="w-5 h-5" />
            <span>Log out</span>
          </button>
        </nav>

        <div className="p-4 border-t border-border">
          <div className="flex items-center gap-3">
            <Avatar className="h-10 w-10">
              {session?.user?.image ? (
                <img
                  alt={session.user.name ?? ""}
                  src={session.user.image}
                  className="h-full w-full object-cover"
                />
              ) : (
                <AvatarFallback>
                  {session?.user?.name?.substring(0, 1).toUpperCase() ?? "U"}
                </AvatarFallback>
              )}
            </Avatar>
            <div className="flex-1 min-w-0">
              <div className="font-medium truncate">
                {session?.user?.name ?? ""}
              </div>
              <div className="text-sm text-muted-foreground truncate">
                {session?.user?.email ?? ""}
              </div>
            </div>
          </div>
        </div>
      </DrawerContent>
    </Drawer>
  );
}
