import { Link, useLocation } from "@tanstack/react-router";
import {
  BarChart3Icon,
  BlocksIcon,
  CreditCardIcon,
  FolderTreeIcon,
  Plus,
  StoreIcon,
} from "lucide-react";
import { useState } from "react";
import { CreateTransactionForm } from "@/components/transactions/create-transaction-form";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { useSession } from "@/lib/auth-client";
import { cn } from "@/lib/utils";

const navItems = [
  { to: "/dashboard", label: "Dashboard", icon: BlocksIcon },
  { to: "/transactions", label: "Transactions", icon: CreditCardIcon },
];

const secondaryNavItems = [
  { to: "/categories", label: "Categories", icon: FolderTreeIcon },
  { to: "/merchants", label: "Merchants", icon: StoreIcon },
  { to: "/reports", label: "Reports", icon: BarChart3Icon },
];

const BOTTOM_NAV_HEIGHT = 56;
const BOTTOM_NAV_SAFE = "env(safe-area-inset-bottom, 0px)";

export function BottomNav() {
  const location = useLocation();
  const { data: session } = useSession();
  const [_addDialogOpen, setAddDialogOpen] = useState(false);

  if (!session?.user) return null;

  return (
    <>
      <nav
        className="fixed bottom-0 left-0 right-0 z-50 border-t border-border/60 bg-background/95 backdrop-blur-xl supports-[backdrop-filter]:bg-background/90 lg:hidden"
        style={{
          height: `calc(${BOTTOM_NAV_HEIGHT}px + ${BOTTOM_NAV_SAFE})`,
          paddingBottom: BOTTOM_NAV_SAFE,
        }}
      >
        <div className="flex items-center justify-around h-14 max-w-lg mx-auto">
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
                  "flex flex-col items-center justify-center gap-0.5 min-w-[64px] min-h-[44px] rounded-lg transition-colors duration-200 active:scale-95",
                  isActive
                    ? "text-accent"
                    : "text-muted-foreground active:bg-muted/80",
                )}
              >
                <span
                  className={cn(
                    "flex items-center justify-center w-9 h-9 rounded-full transition-colors",
                    isActive && "bg-accent/10",
                  )}
                >
                  <item.icon className="w-5 h-5 shrink-0" />
                </span>
                <span className="text-[11px] font-medium leading-tight">
                  {item.label}
                </span>
              </Link>
            );
          })}

          {/* Add Button - elevated FAB-style */}
          <Dialog>
            <DialogTrigger asChild>
              <button
                type="button"
                className="flex flex-col items-center justify-center gap-0.5 min-w-[64px] min-h-[44px] -mt-5 rounded-xl text-accent active:scale-95 transition-transform duration-200"
                aria-label="Add transaction"
              >
                <div className="w-12 h-12 rounded-2xl bg-accent flex items-center justify-center shadow-lg shadow-accent/25 ring-2 ring-background">
                  <Plus
                    className="w-6 h-6 text-accent-foreground"
                    strokeWidth={2.5}
                  />
                </div>
                <span className="text-[11px] font-medium leading-tight mt-1">
                  Add
                </span>
              </button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Add Transaction</DialogTitle>
              </DialogHeader>
              <CreateTransactionForm callback={() => setAddDialogOpen(false)} />
            </DialogContent>
          </Dialog>

          {secondaryNavItems.slice(0, 2).map((item) => {
            const isActive = location.pathname === item.to;

            return (
              <Link
                key={item.to}
                to={item.to}
                className={cn(
                  "flex flex-col items-center justify-center gap-0.5 min-w-[64px] min-h-[44px] rounded-lg transition-colors duration-200 active:scale-95",
                  isActive
                    ? "text-accent"
                    : "text-muted-foreground active:bg-muted/80",
                )}
              >
                <span
                  className={cn(
                    "flex items-center justify-center w-9 h-9 rounded-full transition-colors",
                    isActive && "bg-accent/10",
                  )}
                >
                  <item.icon className="w-5 h-5 shrink-0" />
                </span>
                <span className="text-[11px] font-medium leading-tight">
                  {item.label}
                </span>
              </Link>
            );
          })}
        </div>
      </nav>

      {/* Spacer for fixed bottom nav - matches nav height including safe area */}
      <div
        className="lg:hidden"
        style={{
          height: `calc(${BOTTOM_NAV_HEIGHT}px + ${BOTTOM_NAV_SAFE})`,
        }}
      />
    </>
  );
}
