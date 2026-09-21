import { useHotkey } from "@tanstack/react-hotkeys";
import { Link, Outlet, useLocation } from "@tanstack/react-router";
import { Search } from "lucide-react";
import { useState } from "react";
import Footer from "@/components/footer";
import { CommandPalette } from "@/components/layout/command-palette";
import { UserMenu } from "@/components/layout/user-menu";
import { ModeToggle } from "@/components/mode-toggle";
import { Button } from "@/components/ui/button";
import {
  bottomNavItems,
  isNavActive,
  navItems,
  settingsNavItem,
} from "@/lib/nav";
import { cn } from "@/lib/utils";

function Brand() {
  return (
    <Link to="/" className="flex items-center gap-2.5">
      <img src="/favicon.ico" alt="Tallyo" className="h-8 w-8 rounded-lg" />
      <span className="text-lg font-semibold tracking-tight text-foreground">
        Tallyo
      </span>
    </Link>
  );
}

export function AppShell() {
  const location = useLocation();
  const [commandOpen, setCommandOpen] = useState(false);

  useHotkey(
    "Mod+K",
    () => {
      setCommandOpen(true);
    },
    { ignoreInputs: true },
  );

  return (
    <div className="min-h-dvh bg-ambient">
      {/* Desktop rail */}
      <aside className="glass-surface fixed inset-y-0 left-0 z-40 hidden w-60 flex-col lg:flex">
        <div className="flex h-16 items-center px-5">
          <Brand />
        </div>

        <nav className="flex flex-1 flex-col gap-1 px-3 py-2">
          {navItems.map((item) => {
            const isActive = isNavActive(location.pathname, item.to);

            return (
              <Link
                key={item.to}
                to={item.to}
                aria-current={isActive ? "page" : undefined}
                className={cn(
                  "flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/50",
                  isActive
                    ? "bg-accent/10 text-accent"
                    : "text-foreground/75 hover:bg-secondary/55 hover:text-foreground",
                )}
              >
                <item.icon className="h-4 w-4" />
                <span>{item.label}</span>
              </Link>
            );
          })}
        </nav>

        <div className="flex items-center gap-1 border-t border-glass-border px-3 py-3">
          <Link
            to={settingsNavItem.to}
            aria-current={
              isNavActive(location.pathname, settingsNavItem.to)
                ? "page"
                : undefined
            }
            className={cn(
              "flex min-w-0 flex-1 items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/50",
              isNavActive(location.pathname, settingsNavItem.to)
                ? "bg-accent/10 text-accent"
                : "text-foreground/75 hover:bg-secondary/55 hover:text-foreground",
            )}
          >
            <settingsNavItem.icon className="h-4 w-4" />
            <span>{settingsNavItem.label}</span>
          </Link>
          <ModeToggle />
          <UserMenu />
        </div>
      </aside>

      {/* Mobile top header */}
      <header className="glass fixed inset-x-0 top-0 z-40 pt-[env(safe-area-inset-top)] lg:hidden">
        <div className="flex h-14 items-center justify-between gap-2 px-3">
          <Brand />
          <div className="flex items-center gap-1">
            <Button
              variant="ghost"
              size="icon"
              aria-label="Open command palette"
              onClick={() => setCommandOpen(true)}
            >
              <Search className="h-5 w-5" />
            </Button>
            <UserMenu />
          </div>
        </div>
      </header>

      {/* Content */}
      <div className="lg:flex lg:min-h-dvh lg:flex-col lg:pl-60">
        <main className="min-h-dvh bg-ambient pb-[calc(4.5rem_+_env(safe-area-inset-bottom))] pt-[calc(3.5rem_+_env(safe-area-inset-top))] lg:min-h-0 lg:flex-1 lg:pb-0 lg:pt-0">
          <Outlet />
        </main>
        <div className="hidden lg:block">
          <Footer />
        </div>
      </div>

      {/* Mobile bottom tab bar */}
      <nav className="glass fixed inset-x-0 bottom-0 z-40 pb-[env(safe-area-inset-bottom)] lg:hidden">
        <div className="flex items-stretch">
          {bottomNavItems.map((item) => {
            const isActive = isNavActive(location.pathname, item.to);

            return (
              <Link
                key={item.to}
                to={item.to}
                aria-current={isActive ? "page" : undefined}
                className="flex flex-1 flex-col items-center justify-center gap-1 py-2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/50"
              >
                <span
                  className={cn(
                    "flex h-7 w-12 items-center justify-center rounded-full transition-colors",
                    isActive
                      ? "bg-accent/15 text-accent"
                      : "text-muted-foreground",
                  )}
                >
                  <item.icon className="h-5 w-5" />
                </span>
                <span
                  className={cn(
                    "text-[11px] font-medium",
                    isActive ? "text-accent" : "text-muted-foreground",
                  )}
                >
                  {item.label}
                </span>
              </Link>
            );
          })}
        </div>
      </nav>

      <CommandPalette open={commandOpen} onOpenChange={setCommandOpen} />
    </div>
  );
}
