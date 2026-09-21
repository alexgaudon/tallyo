import { Link, useNavigate } from "@tanstack/react-router";
import { LogOut, Moon, Sun } from "lucide-react";
import { useTheme } from "@/components/theme-provider";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuSub,
  DropdownMenuSubContent,
  DropdownMenuSubTrigger,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { signOut, useSession } from "@/lib/auth-client";
import { settingsNavItem } from "@/lib/nav";
import { queryClient } from "@/utils/orpc";

interface UserMenuProps {
  align?: "start" | "end";
}

export function UserMenu({ align = "end" }: UserMenuProps) {
  const { data: session } = useSession();
  const navigate = useNavigate();
  const { theme, setTheme } = useTheme();

  if (!session?.user) return null;

  const displayName = session.settings?.displayName || session.user.name;

  const handleSignOut = async () => {
    await signOut();
    queryClient.invalidateQueries({ queryKey: ["session"] });
    navigate({ to: "/" });
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button
          type="button"
          aria-label="Account menu"
          className="flex h-9 w-9 items-center justify-center rounded-full ring-1 ring-glass-border transition-all hover:ring-2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        >
          <Avatar className="h-8 w-8">
            {session.user.image ? (
              <img
                alt={displayName ?? ""}
                src={session.user.image}
                className="h-full w-full object-cover"
              />
            ) : (
              <AvatarFallback className="text-xs">
                {displayName?.substring(0, 1).toUpperCase() ?? "U"}
              </AvatarFallback>
            )}
          </Avatar>
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align={align} className="w-56">
        <DropdownMenuLabel className="flex flex-col gap-0.5">
          <span className="truncate text-sm font-medium">
            {displayName ?? "User"}
          </span>
          <span className="truncate text-xs font-normal text-muted-foreground">
            {session.user.email}
          </span>
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        <DropdownMenuItem asChild>
          <Link
            to={settingsNavItem.to}
            className="flex cursor-pointer items-center gap-2"
          >
            <settingsNavItem.icon className="h-4 w-4" />
            {settingsNavItem.label}
          </Link>
        </DropdownMenuItem>
        <DropdownMenuSub>
          <DropdownMenuSubTrigger className="gap-2">
            {theme === "dark" ? (
              <Moon className="h-4 w-4" />
            ) : (
              <Sun className="h-4 w-4" />
            )}
            Theme
          </DropdownMenuSubTrigger>
          <DropdownMenuSubContent>
            <DropdownMenuItem onClick={() => setTheme("light")}>
              Light
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => setTheme("dark")}>
              Dark
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => setTheme("system")}>
              System
            </DropdownMenuItem>
          </DropdownMenuSubContent>
        </DropdownMenuSub>
        <DropdownMenuSeparator />
        <DropdownMenuItem
          variant="destructive"
          onClick={handleSignOut}
          className="gap-2"
        >
          <LogOut className="h-4 w-4" />
          Log out
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
