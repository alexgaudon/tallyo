import {
  BarChart3Icon,
  BlocksIcon,
  CreditCardIcon,
  FolderTreeIcon,
  Settings,
  StoreIcon,
} from "lucide-react";

export const navItems = [
  { to: "/dashboard", label: "Dashboard", icon: BlocksIcon },
  { to: "/transactions", label: "Transactions", icon: CreditCardIcon },
  { to: "/merchants", label: "Merchants", icon: StoreIcon },
  { to: "/categories", label: "Categories", icon: FolderTreeIcon },
  { to: "/reports", label: "Reports", icon: BarChart3Icon },
] as const;

export const settingsNavItem = {
  to: "/settings",
  label: "Settings",
  icon: Settings,
} as const;

export function isNavActive(pathname: string, to: string) {
  return (
    pathname === to ||
    (to === "/transactions" && pathname.startsWith("/transactions"))
  );
}
