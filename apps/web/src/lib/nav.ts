import {
  BarChart3Icon,
  BlocksIcon,
  CreditCardIcon,
  FolderTreeIcon,
  Settings,
} from "lucide-react";

export const navItems = [
  { to: "/dashboard", label: "Dashboard", icon: BlocksIcon },
  { to: "/transactions", label: "Transactions", icon: CreditCardIcon },
  { to: "/taxonomy", label: "Taxonomy", icon: FolderTreeIcon },
  { to: "/reports", label: "Reports", icon: BarChart3Icon },
] as const;

export const settingsNavItem = {
  to: "/settings",
  label: "Settings",
  icon: Settings,
} as const;

/**
 * Every navigable destination, used by the command palette.
 */
export const allNavItems = [...navItems, settingsNavItem] as const;

export function isNavActive(pathname: string, to: string) {
  return (
    pathname === to ||
    (to === "/transactions" && pathname.startsWith("/transactions")) ||
    (to === "/taxonomy" &&
      (pathname.startsWith("/taxonomy") ||
        pathname.startsWith("/merchants") ||
        pathname.startsWith("/categories")))
  );
}
