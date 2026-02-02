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

export function BottomNav() {
  const location = useLocation();
  const { data: session } = useSession();
  const [_addDialogOpen, setAddDialogOpen] = useState(false);

  if (!session?.user) return null;

  return (
    <>
      <nav className="fixed bottom-0 left-0 right-0 h-16 border-t border-border bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/95 z-50 lg:hidden">
        <div className="flex items-center justify-around h-full px-4">
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
                  "flex flex-col items-center gap-1 p-2 transition-colors",
                  isActive ? "text-accent" : "text-muted-foreground",
                )}
              >
                <item.icon className="w-5 h-5" />
                <span className="text-[10px] font-medium">{item.label}</span>
              </Link>
            );
          })}

          {/* Add Button */}
          <Dialog>
            <DialogTrigger asChild>
              <button
                type="button"
                className="flex flex-col items-center gap-1 p-2 text-accent"
              >
                <div className="w-10 h-10 bg-accent flex items-center justify-center">
                  <Plus className="w-5 h-5 text-accent-foreground" />
                </div>
                <span className="text-[10px] font-medium">Add</span>
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
                  "flex flex-col items-center gap-1 p-2 transition-colors",
                  isActive ? "text-accent" : "text-muted-foreground",
                )}
              >
                <item.icon className="w-5 h-5" />
                <span className="text-[10px] font-medium">{item.label}</span>
              </Link>
            );
          })}
        </div>
      </nav>

      {/* Spacer for fixed bottom nav */}
      <div className="h-16 lg:hidden" />
    </>
  );
}
